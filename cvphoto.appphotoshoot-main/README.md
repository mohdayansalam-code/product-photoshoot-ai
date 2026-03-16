# PhotoAI SaaS - AI Product Photoshoot

A high-performance SaaS platform for AI-powered product photography, enabling users to generate professional studio-quality photoshoot results using custom AI models. Built with Next.js, Vite, Supabase, and Astria (FLUX).

## Features

- **Product Photoshoot Generation**: Upload product images and generate AI scenes.
- **AI Image Tools**: Remove background, upscale, and fix products.
- **Premium UX**: Comparison sliders and improvement summaries for edits.
- **Production Stable**: Global retry systems, auth race condition protection, and standardized error handling.

## Local Setup

### 1. Prerequisites
- Node.js 18+
- Supabase account
- Astria API key
- Stripe account (optional for local dev)

### 2. Environment Setup
Copy `.env.example` to `.env` in the root and fill in your credentials.
```bash
cp .env.example .env
```
Ensure you have the following keys:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ASTRIA_API_KEY`

### 3. Installation
```bash
npm install
cd frontend && npm install
cd ../backend && npm install
```

## Run Instructions

### Frontend (Dashboard & Tools)
```bash
cd frontend
npm run dev
```
Accessible at `http://localhost:5173`.

### Backend (API Server)
```bash
cd backend
npm run dev
```
Runs at `http://localhost:3000`.

### AI Worker (Generation Pipeline)
Ensure your environment variables are set, then run:
```bash
cd backend
npm run worker
```

## Deployment
The project is ready for Vercel or any Node.js hosting platform. Ensure all environment variables are configured in your deployment dashboard.

---
Supported by @johnnytran for CloneMySaaS.com customers.
