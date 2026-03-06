#!/bin/bash
echo "============================================"
echo "   AI ICU Guardian - Starting Up..."
echo "============================================"
echo ""

# Check Python
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "[ERROR] Python is not installed. Install it from https://python.org"
    exit 1
fi
PY=$(command -v python3 || command -v python)

# Check Node
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed. Install it from https://nodejs.org"
    exit 1
fi

# Install Python dependencies
echo "[1/4] Installing Python dependencies..."
$PY -m pip install -r requirements.txt --quiet

# Install frontend dependencies
echo "[2/4] Installing frontend dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "     node_modules exists, skipping..."
fi
cd ..

# Cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}
trap cleanup INT TERM

# Start backend
echo "[3/4] Starting backend (port 8000)..."
$PY -m uvicorn backend.main:app --port 8000 &
BACKEND_PID=$!

sleep 3

# Start frontend
echo "[4/4] Starting frontend..."
cd frontend
npm run dev -- --host &
FRONTEND_PID=$!
cd ..

sleep 3

echo ""
echo "============================================"
echo "   AI ICU Guardian is running!"
echo ""
echo "   Frontend:  http://localhost:5173"
echo "   Backend:   http://localhost:8000"
echo "   API Docs:  http://localhost:8000/docs"
echo ""
echo "   Press Ctrl+C to stop."
echo "============================================"
echo ""

# Open browser
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:5173
elif command -v open &> /dev/null; then
    open http://localhost:5173
fi

# Wait for background processes
wait
