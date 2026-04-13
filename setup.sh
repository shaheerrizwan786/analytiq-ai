#!/bin/bash

echo "Setting up Analytiq AI..."

if [ ! -f ".env.local" ]; then
  cp .env.example .env.local
  echo ".env.local created from .env.example"
fi

cd frontend && npm install && cd ..

echo ""
echo "Done. Run 'cd frontend && npm run dev' to start."
