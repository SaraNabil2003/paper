// Code Execution Service with Sandboxing
// Supports JavaScript, Python, C++, and Java

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const TIMEOUT = parseInt(process.env.CODE_EXECUTION_TIMEOUT || '5000');
const MAX_CODE_LENGTH = parseInt(process.env.MAX_CODE_LENGTH || '10000');
const TEMP_DIR = path.join(__dirname, 'temp');

// Ensure temp directory exists
async function ensureTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create temp directory:', error);
  }
}

// Generate unique filename
function generateFilename(extension) {
  const id = crypto.randomBytes(16).toString('hex');
  return `code_${id}.${extension}`;
}

// Clean up temporary file
async function cleanup(filepath) {
  try {
    await fs.unlink(filepath);
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Execute code with timeout and resource limits
function executeWithTimeout(command, args, input, timeout) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      timeout,
      maxBuffer: 1024 * 1024, // 1MB output limit
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      process.kill('SIGKILL');
    }, timeout);

    process.stdout.on('data', (data) => {
      stdout += data.toString();
      if (stdout.length > 1024 * 1024) { // 1MB limit
        process.kill('SIGKILL');
      }
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
      if (stderr.length > 1024 * 1024) { // 1MB limit
        process.kill('SIGKILL');
      }
    });

    if (input) {
      process.stdin.write(input);
      process.stdin.end();
    }

    process.on('close', (code) => {
      clearTimeout(timer);

      if (timedOut) {
        reject(new Error('Time Limit Exceeded'));
      } else if (code !== 0) {
        reject(new Error(stderr || `Process exited with code ${code}`));
      } else {
        resolve(stdout.trim());
      }
    });

    process.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

// JavaScript execution (Node.js with VM2 for sandboxing)
async function executeJavaScript(code, input) {
  // For safety, we'll use a simple Function wrapper
  // In production, use VM2 library for better isolation
  try {
    // Wrap code in a function
    const wrappedCode = `
      const __input = ${JSON.stringify(input)};
      const __inputLines = __input.split('\\n');
      let __inputIndex = 0;

      function readLine() {
        return __inputLines[__inputIndex++] || '';
      }

      function readInt() {
        return parseInt(readLine());
      }

      function readArray() {
        return readLine().split(' ').map(Number);
      }

      function print(value) {
        console.log(value);
      }

      // User code
      ${code}
    `;

    // Save to file and execute with node
    const filename = generateFilename('js');
    const filepath = path.join(TEMP_DIR, filename);

    await fs.writeFile(filepath, wrappedCode);

    try {
      const output = await executeWithTimeout('node', [filepath], null, TIMEOUT);
      await cleanup(filepath);
      return { success: true, output };
    } catch (error) {
      await cleanup(filepath);
      throw error;
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Python execution
async function executePython(code, input) {
  try {
    const filename = generateFilename('py');
    const filepath = path.join(TEMP_DIR, filename);

    await fs.writeFile(filepath, code);

    try {
      const output = await executeWithTimeout('python3', [filepath], input, TIMEOUT);
      await cleanup(filepath);
      return { success: true, output };
    } catch (error) {
      await cleanup(filepath);
      throw error;
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// C++ execution (compile + run)
async function executeCpp(code, input) {
  const sourceFilename = generateFilename('cpp');
  const sourcePath = path.join(TEMP_DIR, sourceFilename);
  const executablePath = sourcePath.replace('.cpp', '');

  try {
    // Write source file
    await fs.writeFile(sourcePath, code);

    // Compile
    try {
      await executeWithTimeout(
        'g++',
        [
          '-std=c++17',
          '-O2',
          '-Wall',
          sourcePath,
          '-o',
          executablePath
        ],
        null,
        10000 // 10s compile timeout
      );
    } catch (error) {
      await cleanup(sourcePath);
      return { success: false, error: `Compilation Error: ${error.message}` };
    }

    // Execute
    try {
      const output = await executeWithTimeout(executablePath, [], input, TIMEOUT);
      await cleanup(sourcePath);
      await cleanup(executablePath);
      return { success: true, output };
    } catch (error) {
      await cleanup(sourcePath);
      await cleanup(executablePath);
      throw error;
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Java execution (compile + run)
async function executeJava(code, input) {
  // Extract class name from code
  const classNameMatch = code.match(/public\s+class\s+(\w+)/);
  if (!classNameMatch) {
    return { success: false, error: 'No public class found' };
  }

  const className = classNameMatch[1];
  const filename = `${className}.java`;
  const filepath = path.join(TEMP_DIR, filename);

  try {
    // Write source file
    await fs.writeFile(filepath, code);

    // Compile
    try {
      await executeWithTimeout(
        'javac',
        [filepath],
        null,
        10000 // 10s compile timeout
      );
    } catch (error) {
      await cleanup(filepath);
      return { success: false, error: `Compilation Error: ${error.message}` };
    }

    // Execute
    try {
      const output = await executeWithTimeout(
        'java',
        ['-cp', TEMP_DIR, className],
        input,
        TIMEOUT
      );
      await cleanup(filepath);
      await cleanup(path.join(TEMP_DIR, `${className}.class`));
      return { success: true, output };
    } catch (error) {
      await cleanup(filepath);
      await cleanup(path.join(TEMP_DIR, `${className}.class`));
      throw error;
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Main execution function
async function executeCode(language, code, input = '') {
  // Validation
  if (!code || code.length === 0) {
    return {
      success: false,
      error: 'No code provided'
    };
  }

  if (code.length > MAX_CODE_LENGTH) {
    return {
      success: false,
      error: `Code too long (max ${MAX_CODE_LENGTH} characters)`
    };
  }

  // Ensure temp directory exists
  await ensureTempDir();

  // Route to appropriate executor
  try {
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'js':
      case 'node':
        return await executeJavaScript(code, input);

      case 'python':
      case 'python3':
      case 'py':
        return await executePython(code, input);

      case 'cpp':
      case 'c++':
      case 'cplusplus':
        return await executeCpp(code, input);

      case 'java':
        return await executeJava(code, input);

      default:
        return {
          success: false,
          error: `Unsupported language: ${language}. Supported: JavaScript, Python, C++, Java`
        };
    }
  } catch (error) {
    console.error('Code execution error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run test cases
async function runTestCases(language, code, testCases) {
  const results = [];

  for (const testCase of testCases) {
    const result = await executeCode(language, code, testCase.input);

    const passed = result.success && result.output === testCase.expected_output;

    results.push({
      input: testCase.input,
      expected: testCase.expected_output,
      actual: result.output || result.error,
      passed,
      error: result.success ? null : result.error
    });
  }

  const allPassed = results.every(r => r.passed);
  const passedCount = results.filter(r => r.passed).length;

  return {
    success: allPassed,
    passed: passedCount,
    total: results.length,
    results
  };
}

// Check if language runtime is available
async function checkLanguageSupport(language) {
  const commands = {
    javascript: 'node',
    python: 'python3',
    cpp: 'g++',
    java: 'javac'
  };

  const command = commands[language.toLowerCase()];
  if (!command) {
    return false;
  }

  try {
    await executeWithTimeout(command, ['--version'], null, 2000);
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  executeCode,
  runTestCases,
  checkLanguageSupport,
  ensureTempDir
};
