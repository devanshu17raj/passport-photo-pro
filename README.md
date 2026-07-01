# 📸 Passport Photo Pro

> Generate print-ready A4 passport photo sheets in seconds.
> AI background removal · 10 countries · 30+ document types · 300 DPI · Free & open source.

[![CI](https://github.com/YOUR_USERNAME/passport-photo-pro/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/passport-photo-pro/actions/workflows/ci.yml)

---
# What it does

Upload a photo, pick a country and document type, and Passport Photo Pro automatically:

1.Removes the background using an on-device AI model (no third-party API key or upload needed).
2.Crops and resizes the face to meet the exact spec for that country/document (10 countries, 30+ document types).
3.Lays the result out on a print-ready A4 sheet at 300 DPI.
4.Returns a downloadable PDF, with the generation saved to your session history for later re-download.

## Tech Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Frontend  | React 19 · Vite · Tailwind CSS · Axios          |
| Backend   | FastAPI · Python 3.11 · SQLAlchemy · rembg      |
| AI Model  | U2-Net via rembg (local, no API key needed)     |
| Database  | SQLite (async via aiosqlite)                    |
| Container | Docker · docker-compose                         |
| CI/CD     | GitHub Actions → Render                         |

---

## Quick Start (Local — without Docker)

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env          # edit SECRET_KEY
uvicorn main:app --reload
# API docs → http://localhost:8000/docs
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env          # VITE_API_URL=http://localhost:8000
npm run dev
# App → http://localhost:5173
```

---

## Quick Start (Docker — one command)

```bash
# Copy and fill in secrets
cp .env.example .env

# Build and run both services
docker compose up --build

# App    → http://localhost:80
# API    → http://localhost:8000
# Docs   → http://localhost:8000/docs
```

### Dev mode (hot reload)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
# Frontend HMR → http://localhost:5173
# Backend reload on .py changes
```

---

## Project Structure

```
passport-photo-pro/
├── backend/
│   ├── main.py                    # FastAPI app factory
│   ├── requirements.txt
│   ├── Dockerfile
│   └── app/
│       ├── database.py            # async SQLAlchemy + get_db
│       ├── schemas.py             # Pydantic models
│       ├── limiter.py             # slowapi rate limiter
│       ├── presets.json           # 10 countries × 30+ document specs
│       ├── models/record.py       # GenerationRecord ORM model
│       ├── services/
│       │   └── image_service.py   # rembg + Pillow + PDF pipeline
│       ├── routes/
│       │   ├── photos.py          # POST /api/process
│       │   ├── presets.py         # GET  /api/presets
│       │   ├── history.py         # GET/DELETE /api/history
│       │   └── health.py          # GET  /api/health
│       └── tests/
│           ├── test_image_service.py   # 20 unit tests
│           └── test_routes.py          # integration tests
│
├── frontend/
│   ├── src/
│   │   ├── pages/App.jsx          # main page + all state
│   │   ├── components/            # 6 pure UI components
│   │   ├── hooks/                 # usePresets, useHistory
│   │   └── utils/api.js           # axios + all API calls
│   ├── Dockerfile                 # Node build → Nginx serve
│   ├── Dockerfile.dev             # Vite dev server
│   └── nginx.conf                 # SPA routing config
│
├── .github/
│   └── workflows/
│       ├── ci.yml                 # test + build on every push/PR
│       └── cd.yml                 # deploy to Render on merge to main
│
├── docker-compose.yml             # production stack
├── docker-compose.dev.yml         # dev override (hot reload)
├── render.yaml                    # Render Blueprint (one-click deploy)
└── .gitignore
```

---

## API Reference

| Method | Endpoint                        | Description                    |
|--------|---------------------------------|--------------------------------|
| GET    | `/api/health`                   | Health check                   |
| GET    | `/api/presets`                  | All country/document presets   |
| POST   | `/api/process`                  | Upload photo → get PDF         |
| GET    | `/api/history`                  | Session generation history     |
| GET    | `/api/history/{id}/download`    | Re-download past PDF           |
| DELETE | `/api/history/{id}`             | Delete history record          |

Interactive docs available at `/docs` (Swagger) and `/redoc`.

---

## Deploy to Render

**Backend (Web Service)**
- Environment: Docker
- Dockerfile path: `./backend/Dockerfile`
- Docker context: `./backend`
- Add disk mount at `/app/data` (1 GB) for SQLite persistence
- Environment variables: `SECRET_KEY`, `CORS_ORIGINS`

**Frontend (Static Site or Web Service)**
- Environment: Docker
- Dockerfile path: `./frontend/Dockerfile`
- Docker context: `./frontend`
- Build arg: `VITE_API_URL=https://your-backend.onrender.com`

### GitHub Actions → auto-deploy on push to main

1. Get your Render deploy hook URLs (service settings → Deploy Hooks)
2. Add to GitHub repository secrets:
   - `RENDER_BACKEND_DEPLOY_HOOK`
   - `RENDER_FRONTEND_DEPLOY_HOOK`
   - `BACKEND_URL` (e.g. `https://passport-photo-pro-backend.onrender.com`)
3. Every push to `main` triggers CI → if all tests pass → deploys both services

---

## Running Tests

```bash
cd backend
pytest app/tests/test_image_service.py -v    # 20 unit tests
pytest app/tests/ -v                         # all tests
```

---

## Environment Variables

### Backend (`.env`)

| Variable       | Default                             | Description                     |
|----------------|-------------------------------------|---------------------------------|
| `SECRET_KEY`   | `dev-secret-change-in-production`   | Flask/FastAPI session secret    |
| `DATABASE_URL` | `sqlite+aiosqlite:///./passport.db` | SQLAlchemy async DB URL         |
| `CORS_ORIGINS` | `http://localhost:5173`             | Comma-separated allowed origins |

### Frontend (`.env`)

| Variable       | Default                   | Description            |
|----------------|---------------------------|------------------------|
| `VITE_API_URL` | `http://localhost:8000`   | Backend API base URL   |
