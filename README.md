# Arena AI - Elite Model Benchmarking

High-performance AI model benchmarking platform.

## Features
- Real-time comparison across Gemini, Llama, and GPT-OSS models.
- Codebase Intelligence: Upload and analyze codebase with AI agents.
- Concurrent API execution.

## Deployment Instructions

### Backend (Railway)
1. Add environment variables:
   - `GEMINI_API_KEY`
   - `GROQ_API_KEY`
   - `ALLOWED_ORIGIN` (Your Vercel URL)
   - `NODE_ENV=production`

### Frontend (Vercel)
1. Add environment variables:
   - `VITE_API_URL` (Your Railway URL)

## Setup
1. `npm install`
2. `npm run dev`
