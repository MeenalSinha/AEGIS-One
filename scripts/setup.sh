#!/usr/bin/env bash
set -e

echo ""
echo "  AEGIS One — Setup Script"
echo "  ─────────────────────────────────────────"
echo ""

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "ERROR: Docker is required"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "ERROR: Node.js is required"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "ERROR: Python 3 is required"; exit 1; }

echo "  Prerequisites: OK"

# Copy env file
if [ ! -f .env ]; then
  cp .env.example .env
  echo "  Created .env from .env.example"
  echo "  NOTE: Add your OPENAI_API_KEY to .env before starting"
fi

# Install frontend deps
echo ""
echo "  Installing frontend dependencies..."
cd frontend && npm install --silent && cd ..
echo "  Frontend deps installed"

# Install backend deps
echo ""
echo "  Installing backend dependencies..."
cd backend && pip install -r requirements.txt -q && cd ..
echo "  Backend deps installed"

echo ""
echo "  Setup complete."
echo ""
echo "  Quick start options:"
echo "  ─────────────────────────────────────────"
echo "  Option 1 (Docker, recommended):"
echo "    docker compose -f docker/docker-compose.yml up --build"
echo ""
echo "  Option 2 (Manual):"
echo "    cd backend && uvicorn app.main:app --reload --port 8000"
echo "    cd frontend && npm run dev"
echo ""
echo "  After starting, seed demo data:"
echo "    python scripts/seed_demo.py"
echo ""
echo "  Dashboard: http://localhost:3000"
echo "  API Docs:  http://localhost:8000/docs"
echo ""
