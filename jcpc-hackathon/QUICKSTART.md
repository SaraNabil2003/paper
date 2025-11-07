# Quick Start Guide

## Prerequisites

- Node.js 16+ installed
- npm or yarn
- (Optional) OpenAI API key for full AI functionality

## Step 1: Install Dependencies

### Backend
```bash
cd jcpc-hackathon/backend
npm install
```

### Frontend
```bash
cd jcpc-hackathon/frontend
npm install
```

## Step 2: Configure Environment (Optional)

If you have an OpenAI API key, set it as an environment variable:

**Windows (PowerShell):**
```powershell
$env:OPENAI_API_KEY="your_api_key_here"
```

**Windows (CMD):**
```cmd
set OPENAI_API_KEY=your_api_key_here
```

**Linux/Mac:**
```bash
export OPENAI_API_KEY=your_api_key_here
```

**Note:** The system works without an API key using fallback responses for demonstration purposes.

## Step 3: Start the Backend Server

```bash
cd jcpc-hackathon/backend
npm start
```

The server will start on `http://localhost:5000`

You should see:
```
PSF Server running on port 5000
```

If no API key is set, you'll also see:
```
⚠️  OPENAI_API_KEY not set. AI features will use fallback responses.
```

## Step 4: Start the Frontend

Open a new terminal:

```bash
cd jcpc-hackathon/frontend
npm run dev
```

The frontend will start on `http://localhost:5173` (or similar port)

## Step 5: Use the Application

1. Open your browser to the frontend URL (e.g., `http://localhost:5173`)
2. You'll see the PSF interface with:
   - Current mode and ADI score in the header
   - Problem selection interface
   - Navigation tabs (Problem Solving, My Analytics, Coach Dashboard)

### Testing the Flow

1. **Select a Problem**: Click on "Two Sum" or "Binary Search"
2. **Pre-Solving Reflection**: Complete the reflection prompts
3. **Work on Problem**: The timer starts automatically
4. **Record Submission**: Click "Record Submission Attempt" (required before AI help)
5. **Wait for Minimum Time**: Easy problems require 15 min, Medium+ require 30 min
6. **Request AI Help**: Enter a question and click "Request AI Help"
7. **View Response**: See the AI response based on your current mode
8. **Complete Problem**: Mark as solved or give up
9. **Post-Solving Reflection**: Complete final reflection
10. **View Analytics**: Check your ADI and performance metrics

## Default Test Data

The system comes with two sample students:
- **Sarah Chen** (ID: 1) - Mode 2, ADI: 3.2 (Healthy)
- **Ahmed Hassan** (ID: 2) - Mode 1, ADI: 6.8 (High dependency)

The frontend defaults to student ID 1. To test with different students, modify the `studentId` constant in `frontend/src/App.tsx`.

## Troubleshooting

### Backend won't start
- Check if port 5000 is already in use
- Verify Node.js version: `node --version` (should be 16+)
- Check for errors in the terminal

### Frontend won't start
- Check if the port is already in use
- Verify all dependencies are installed: `npm install`
- Check browser console for errors

### AI responses not working
- If you have an API key, verify it's set correctly
- Check backend terminal for API errors
- Without an API key, fallback responses will be used

### CORS errors
- Ensure backend is running on port 5000
- Check that frontend is pointing to correct API URL
- Verify CORS is enabled in backend (it should be by default)

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Explore the API endpoints
- Customize problems in `backend/database.js`
- Add more students or modify existing data
- Integrate with a real database (PostgreSQL recommended)

## Development Tips

- Backend changes require server restart
- Frontend has hot-reload enabled
- Check browser console and backend terminal for debugging
- All data is in-memory and resets on server restart

