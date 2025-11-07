# Starting the PSF Backend

## Choose Your Server Version

### Option 1: Enhanced Server (Recommended - All New Features)

The enhanced server includes:
- PostgreSQL support
- Authentication system
- Code execution (multi-language)
- WebSocket real-time updates
- Coach dashboard backend
- ADI historical tracking

**Start command:**
```bash
node server-enhanced.js
```

**Configuration:**
1. Copy `.env.example` to `.env`
2. Set your configuration (see below)
3. Run the server

### Option 2: Original Server (Simple - In-Memory Only)

The original server for quick testing:
- In-memory database only
- Basic features from original implementation

**Start command:**
```bash
node server.js
```

---

## Quick Start (Development with In-Memory Database)

```bash
# 1. Install dependencies (if not done)
npm install

# 2. Start server (no database needed)
node server-enhanced.js
```

Server will start on http://localhost:5000 using in-memory database.

---

## Production Setup (PostgreSQL)

```bash
# 1. Install PostgreSQL
sudo apt install postgresql  # Ubuntu/Debian
brew install postgresql       # macOS

# 2. Create database
sudo -u postgres createdb psf_database

# 3. Run schema
psql -U postgres -d psf_database -f schema.sql

# 4. Configure environment
cp .env.example .env

# Edit .env:
USE_POSTGRES=true
DB_HOST=localhost
DB_NAME=psf_database
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=generate_secure_random_key_here
OPENAI_API_KEY=your_openai_key_optional

# 5. Start server
node server-enhanced.js
```

---

## Environment Variables

Create a `.env` file with:

```env
# Server
PORT=5000
NODE_ENV=development

# Database (set USE_POSTGRES=true to enable)
USE_POSTGRES=false
DB_HOST=localhost
DB_PORT=5432
DB_NAME=psf_database
DB_USER=postgres
DB_PASSWORD=postgres

# Authentication
JWT_SECRET=your_very_secure_random_secret_key_min_32_chars
JWT_EXPIRATION=7d

# OpenAI (optional - uses fallbacks if not set)
OPENAI_API_KEY=your_openai_api_key

# CORS
FRONTEND_URL=http://localhost:5173

# Code Execution
CODE_EXECUTION_TIMEOUT=5000
MAX_CODE_LENGTH=10000
```

---

## Generate Secure JWT Secret

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or OpenSSL
openssl rand -hex 32
```

---

## Testing the Server

```bash
# Health check
curl http://localhost:5000/api/health

# Get problems
curl http://localhost:5000/api/problems

# Get dashboard
curl http://localhost:5000/api/dashboard
```

---

## Troubleshooting

### "Error: listen EADDRINUSE"
Port 5000 is already in use. Either:
- Kill the process: `lsof -ti:5000 | xargs kill`
- Change PORT in `.env`

### "Database connection failed"
- Check PostgreSQL is running: `sudo systemctl status postgresql`
- Verify credentials in `.env`
- Or set `USE_POSTGRES=false` to use in-memory mode

### "Module not found"
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## Features Available

### With In-Memory Database (USE_POSTGRES=false)
✅ All core PSF features
✅ AI interactions
✅ Mode progression
✅ Reflections
✅ Code execution (if runtimes installed)
✅ WebSocket updates
❌ Data persistence (resets on restart)
❌ Authentication
❌ Historical ADI tracking

### With PostgreSQL (USE_POSTGRES=true)
✅ Everything above, plus:
✅ Data persistence
✅ Authentication & authorization
✅ Historical ADI tracking
✅ User management
✅ Production-ready

---

## Next Steps

1. Start the backend server
2. Start the frontend (see `../frontend/README.md`)
3. Access http://localhost:5173
4. See DEPLOYMENT.md for production setup
