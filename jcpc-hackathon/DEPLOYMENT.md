# Deployment Guide - Progressive Scaffolding Framework

This guide covers deploying the PSF platform in both development and production environments.

## Table of Contents

1. [Quick Start (Development)](#quick-start-development)
2. [Production Deployment](#production-deployment)
3. [Database Setup](#database-setup)
4. [Environment Configuration](#environment-configuration)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start (Development)

### Prerequisites

- Node.js 16+ and npm
- (Optional) PostgreSQL 12+ for persistent database
- (Optional) OpenAI API key for full AI functionality
- (Optional) Python 3, GCC (g++), Java JDK for multi-language code execution

### Step 1: Install Dependencies

```bash
# Backend
cd jcpc-hackathon/backend
npm install

# Frontend
cd ../frontend
npm install
```

### Step 2: Configure Environment

Create `.env` file in `backend/` directory:

```bash
cp backend/.env.example backend/.env
```

Edit `.env` with your configuration:
- Set `USE_POSTGRES=false` for in-memory mode (development)
- Set `USE_POSTGRES=true` for PostgreSQL (production)
- Add your `OPENAI_API_KEY` for AI features
- Configure database credentials if using PostgreSQL

### Step 3: Start Development Servers

**Using In-Memory Database (Quick Start):**

```bash
# Terminal 1: Backend (in-memory mode)
cd backend
npm start

# Terminal 2: Frontend
cd frontend
npm run dev
```

**Using PostgreSQL:**

```bash
# 1. Set up database
psql -U postgres -f backend/schema.sql

# 2. Configure .env
# Set USE_POSTGRES=true and DB credentials

# 3. Start servers
cd backend
npm start

cd frontend
npm run dev
```

### Step 4: Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- WebSocket: ws://localhost:5000/ws

---

## Production Deployment

### Option 1: Traditional Server (VPS/Dedicated)

#### Backend Deployment

```bash
# 1. Clone repository
git clone <repository-url>
cd jcpc-hackathon/backend

# 2. Install dependencies
npm install --production

# 3. Set up PostgreSQL
sudo -u postgres psql
CREATE DATABASE psf_database;
\q

psql -U postgres -d psf_database -f schema.sql

# 4. Configure environment
cp .env.example .env
nano .env

# Set production values:
USE_POSTGRES=true
DB_HOST=localhost
DB_NAME=psf_database
DB_USER=postgres
DB_PASSWORD=<secure-password>
JWT_SECRET=<generate-secure-random-key>
NODE_ENV=production

# 5. Set up process manager (PM2)
npm install -g pm2
pm2 start server-enhanced.js --name psf-backend
pm2 save
pm2 startup
```

#### Frontend Deployment

```bash
cd frontend

# 1. Build for production
npm run build

# 2. Serve with nginx
sudo nano /etc/nginx/sites-available/psf

# Add configuration:
server {
    listen 80;
    server_name your-domain.com;

    root /path/to/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/psf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Option 2: Docker Deployment

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: psf_database
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: <secure-password>
    volumes:
      - ./backend/schema.sql:/docker-entrypoint-initdb.d/schema.sql
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    environment:
      USE_POSTGRES: "true"
      DB_HOST: postgres
      DB_NAME: psf_database
      DB_USER: postgres
      DB_PASSWORD: <secure-password>
      JWT_SECRET: <secure-random-key>
      OPENAI_API_KEY: <your-key>
    ports:
      - "5000:5000"
    depends_on:
      - postgres

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres-data:
```

Deploy:

```bash
docker-compose up -d
```

### Option 3: Cloud Platforms

#### Heroku

```bash
# Backend
cd backend
heroku create psf-backend
heroku addons:create heroku-postgresql:hobby-dev
heroku config:set USE_POSTGRES=true
heroku config:set JWT_SECRET=<secure-key>
heroku config:set OPENAI_API_KEY=<your-key>
git push heroku main

# Frontend (Netlify/Vercel)
cd frontend
npm run build
# Deploy dist/ folder to Netlify or Vercel
```

#### AWS / Azure / GCP

Follow platform-specific guides for:
1. EC2/VM instance setup
2. RDS/Cloud SQL database
3. Load balancer configuration
4. SSL certificate setup

---

## Database Setup

### PostgreSQL Installation

#### Ubuntu/Debian

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### macOS

```bash
brew install postgresql
brew services start postgresql
```

#### Windows

Download and install from: https://www.postgresql.org/download/windows/

### Database Initialization

```bash
# Create database
sudo -u postgres createdb psf_database

# Run schema
psql -U postgres -d psf_database -f backend/schema.sql

# Verify
psql -U postgres -d psf_database -c "\dt"
```

### Database Migration

If updating an existing deployment:

```bash
# Backup current database
pg_dump -U postgres psf_database > backup.sql

# Apply new schema
psql -U postgres -d psf_database -f backend/schema.sql

# Verify
psql -U postgres -d psf_database -c "SELECT * FROM users LIMIT 1;"
```

---

## Environment Configuration

### Backend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 5000 | Server port |
| `NODE_ENV` | No | development | Environment (development/production) |
| `USE_POSTGRES` | No | false | Use PostgreSQL vs in-memory |
| `DB_HOST` | If PostgreSQL | localhost | Database host |
| `DB_PORT` | If PostgreSQL | 5432 | Database port |
| `DB_NAME` | If PostgreSQL | psf_database | Database name |
| `DB_USER` | If PostgreSQL | postgres | Database user |
| `DB_PASSWORD` | If PostgreSQL | postgres | Database password |
| `JWT_SECRET` | **Yes** | - | Secret key for JWT tokens (min 32 chars) |
| `JWT_EXPIRATION` | No | 7d | Token expiration (e.g., 7d, 24h) |
| `OPENAI_API_KEY` | No | - | OpenAI API key (optional, uses fallbacks) |
| `FRONTEND_URL` | No | http://localhost:5173 | Frontend URL for CORS |
| `CODE_EXECUTION_TIMEOUT` | No | 5000 | Code execution timeout (ms) |
| `MAX_CODE_LENGTH` | No | 10000 | Max code length (characters) |

### Generating Secure Keys

```bash
# Generate JWT secret (Node.js)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use OpenSSL
openssl rand -hex 32
```

---

## Testing

### Backend Tests

```bash
cd backend
npm test
```

### Frontend Tests

```bash
cd frontend
npm test
```

### End-to-End Tests

```bash
# Install backend dependencies with test tools
cd backend
npm install

# Run integration tests
npm run test:integration
```

### Manual Testing Checklist

- [ ] Student can register and login
- [ ] Student can select and start a problem
- [ ] Code execution works (JavaScript, Python, C++, Java)
- [ ] AI assistance request after struggle time
- [ ] ADI calculation updates correctly
- [ ] Mode progression triggers appropriately
- [ ] Coach can view dashboard
- [ ] WebSocket updates work in real-time
- [ ] Reflections are recorded and scored

---

## Troubleshooting

### Backend won't start

**Problem:** `Error: listen EADDRINUSE`
- **Solution:** Port 5000 is in use. Change `PORT` in `.env` or kill the process:
  ```bash
  lsof -ti:5000 | xargs kill
  ```

**Problem:** Database connection failed
- **Solution:**
  1. Check PostgreSQL is running: `sudo systemctl status postgresql`
  2. Verify credentials in `.env`
  3. Test connection: `psql -U postgres -d psf_database`

**Problem:** OpenAI API errors
- **Solution:** Check API key is valid. App will use fallback responses if key is missing.

### Frontend won't build

**Problem:** Module not found errors
- **Solution:**
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

**Problem:** API connection refused
- **Solution:** Check backend is running on correct port. Update `API_BASE` in `App.tsx`.

### Code Execution Fails

**Problem:** "Language not supported" error
- **Solution:** Install language runtime:
  ```bash
  # Python
  sudo apt install python3

  # C++
  sudo apt install g++

  # Java
  sudo apt install default-jdk
  ```

**Problem:** "Time Limit Exceeded"
- **Solution:** Increase `CODE_EXECUTION_TIMEOUT` in `.env`.

### WebSocket Connection Fails

**Problem:** "WebSocket connection failed"
- **Solution:**
  1. Check firewall allows WebSocket connections
  2. If behind nginx/proxy, ensure WebSocket upgrade headers are set
  3. Verify token is being sent correctly

### Database Issues

**Problem:** "relation does not exist"
- **Solution:** Run schema: `psql -U postgres -d psf_database -f backend/schema.sql`

**Problem:** Connection pool exhausted
- **Solution:** Increase max connections in `db-config.js` or PostgreSQL config

---

## Performance Optimization

### Production Checklist

- [ ] Enable gzip compression in nginx
- [ ] Set up CDN for static assets
- [ ] Configure database connection pooling
- [ ] Enable query caching
- [ ] Set up monitoring (PM2, New Relic, DataDog)
- [ ] Configure log rotation
- [ ] Set up automated backups
- [ ] Enable SSL/TLS certificates
- [ ] Configure rate limiting
- [ ] Set up health check endpoints

### Monitoring

```bash
# PM2 monitoring
pm2 monit

# Database performance
psql -U postgres -d psf_database -c "SELECT * FROM pg_stat_activity;"

# Logs
pm2 logs psf-backend
tail -f /var/log/nginx/access.log
```

---

## Security Checklist

- [ ] Change default database password
- [ ] Generate secure JWT secret (32+ characters)
- [ ] Enable HTTPS/SSL in production
- [ ] Set secure CORS origins
- [ ] Enable rate limiting
- [ ] Sanitize user inputs
- [ ] Use parameterized queries (already implemented)
- [ ] Keep dependencies updated
- [ ] Set secure HTTP headers (Helmet enabled)
- [ ] Enable database backups
- [ ] Restrict file upload sizes
- [ ] Sandbox code execution (implemented)

---

## Support

For issues and questions:
- GitHub Issues: <repository-url>/issues
- Documentation: See README.md
- Email: support@yourorganization.edu
