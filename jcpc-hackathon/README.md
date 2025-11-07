# Progressive Scaffolding Framework (PSF) for Competitive Programming Education

A comprehensive web-based platform implementing the Progressive Scaffolding Framework for ethical LLM integration in competitive programming training, as described in the research paper.

## Features

### Core PSF Components

1. **Three Interaction Modes**
   - **Mode 1 (Hint-Based)**: Maximum support with strategic guidance and Socratic questions
   - **Mode 2 (Conceptual)**: Moderate support with algorithmic explanations and pseudocode
   - **Mode 3 (Minimal)**: Low support with solution verification only

2. **AI Dependency Index (ADI)**
   - Real-time calculation based on:
     - Performance gap (with AI vs without AI)
     - Consultation frequency
     - Early consultation ratio
     - Transfer performance on novel problems
   - Four zones: Healthy (<2.5), Moderate (2.5-5.0), High (5.0-7.5), Critical (>7.5)

3. **Time-Gated AI Access**
   - Struggle-first protocol: Minimum 15-30 minutes of effort required
   - Submission requirement: At least one solution attempt before AI help
   - ADI-based restrictions for high-dependency students

4. **Reflection-Based Assessment**
   - Pre-solving: Problem understanding and pattern recognition
   - During: Approach selection and strategic thinking
   - Post-solving: Solution evaluation and metacognitive awareness

5. **Automatic Mode Progression**
   - Criteria-based advancement through modes
   - Tracks problem-solving success, ADI, and reflection quality

6. **Analytics Dashboard**
   - Student view: Personal ADI trends, performance metrics, mode status
   - Coach view: Class-wide monitoring, dependency alerts, intervention recommendations

## Technology Stack

- **Frontend**: React 18 with TypeScript, Vite
- **Backend**: Node.js with Express
- **Database**: In-memory JavaScript (can be extended to PostgreSQL)
- **AI Integration**: OpenAI GPT-4 API (with fallback for demo)

## Setup Instructions

### Prerequisites

- Node.js 16+ and npm
- (Optional) OpenAI API key for full AI functionality

### Backend Setup

```bash
cd jcpc-hackathon/backend
npm install
```

Set environment variable (optional):
```bash
export OPENAI_API_KEY=your_api_key_here
# Or on Windows:
set OPENAI_API_KEY=your_api_key_here
```

Start the server:
```bash
npm start
# Server runs on http://localhost:5000
```

### Frontend Setup

```bash
cd jcpc-hackathon/frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173 (or similar)
```

## Usage

### For Students

1. **Select a Problem**: Choose from available competitive programming problems
2. **Pre-Solving Reflection**: Reflect on problem understanding before starting
3. **Work on Problem**: Timer tracks your effort time
4. **Record Submission**: Submit at least one attempt before requesting AI help
5. **Request AI Assistance**: After minimum struggle time, request help in your current mode
6. **Reflect During**: Optional reflection on AI interaction
7. **Complete Problem**: Mark as solved or give up, then complete post-solving reflection
8. **View Analytics**: Monitor your ADI, performance metrics, and mode progression

### For Coaches

1. Access the Coach Dashboard to view all students
2. Monitor ADI distribution and identify high-dependency students
3. Review mode progression and intervention recommendations
4. Analyze class-wide usage patterns

## API Endpoints

### Student Management
- `GET /api/student/:id` - Get student data
- `GET /api/analytics/:studentId` - Get student analytics

### Problem Management
- `GET /api/problems` - List all problems
- `GET /api/problems/:id` - Get specific problem

### Session Management
- `POST /api/session/start` - Start problem-solving session
- `GET /api/session/:studentId` - Get current session
- `POST /api/session/update` - Update session (e.g., record submission)

### AI Interaction
- `POST /api/ai/request` - Request AI assistance (with struggle-first protocol)

### Problem Attempts
- `POST /api/attempt` - Record problem attempt (triggers mode progression check)

### Reflections
- `POST /api/reflection` - Submit reflection at any stage

### Dashboard
- `GET /api/dashboard` - Get coach dashboard data

## ADI Calculation

The AI Dependency Index uses the formula from the paper:

```
ADI = w1·(SuccessAI − SuccessNoAI) + w2·ConsultationFreq + w3·EarlyRatio − w4·TransferPerf
```

Where:
- `w1 = 0.35` (performance gap weight)
- `w2 = 0.25` (consultation frequency weight)
- `w3 = 0.25` (early consultation ratio weight)
- `w4 = 0.15` (transfer performance weight)

## Mode Progression Criteria

### Mode 1 → Mode 2
- Solve 5+ problems with hints in < 30 min each
- ADI < 4.0 for 2 consecutive weeks
- Demonstrate understanding in reflections (quality ≥ 2)

### Mode 2 → Mode 3
- Solve 10+ problems with concepts in < 20 min each
- ADI < 3.0 for 2 consecutive weeks
- 70%+ success rate on timed AI-restricted problems

## Ethical Guidelines

This framework distinguishes between:
- **Training (Legitimate)**: AI scaffolding for learning, reflection-based assessment, coach supervision
- **Competition (Prohibited)**: Any AI assistance during official contests

All AI interactions are logged and available to coaches for transparency.

## Limitations

- Current implementation uses in-memory database (data resets on server restart)
- OpenAI API key required for full AI functionality (fallback responses available)
- Limited problem database (extendable)
- Single-language support (English)

## Future Enhancements

- PostgreSQL database integration
- Multi-language support
- Advanced LLM features (code execution, visual explanations)
- Mobile app support
- Comprehensive problem database integration
- Real-time collaboration features

## Research Paper

This implementation is based on the research paper:
"Progressive Scaffolding Framework for Ethical LLM Integration in Competitive Programming Education"

## License

ISC

## Contributing

This is a proof-of-concept implementation. For production use, consider:
- Database persistence
- Authentication and authorization
- Rate limiting
- Enhanced error handling
- Comprehensive testing
- Security hardening

