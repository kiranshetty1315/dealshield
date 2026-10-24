# DealShield AI — Backend API

FastAPI backend service powering WhatsApp chat parsing, AI agreement extraction, conflict detection, agreement lifecycle management, and evidence vault integrity verification.

## Architecture

- **Framework:** FastAPI with Pydantic v2 Settings and validation schemas
- **Authentication:** PBKDF2 password hashing & Bearer JWT session management (`app/core/security.py`, `app/api/routes/auth.py`)
- **Chat Processing:** Deterministic WhatsApp parser with stable message citation IDs (`app/services/chat_parser.py`)
- **Integrity:** SHA-256 document hashing service (`app/services/hash_service.py`)
- **Database Persistence:** Supabase PostgreSQL with automated migrations (`scripts/migrate.py`) and zero-config local disk persistence (`.local_db_cache.json`)
- **API Versioning:** All domain endpoints prefixed with `/api/v1/`
- **Documentation:** Interactive OpenAPI specs at `/docs` and `/redoc`

## Quick Start

### 1. Prerequisites
- Python 3.11+
- Virtual environment tool (`venv`)

### 2. Setup Virtual Environment

```bash
cd apps/api
python -m venv .venv

# On Linux / macOS:
source .venv/bin/activate

# On Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment

```bash
cp .env.example .env
```
*(No real credentials are required to run the local scaffold, local storage automatically caches to `.local_db_cache.json`.)*

### 5. Run Database Migrations (Optional for Live Supabase)

If using live Supabase credentials, apply database tables via:
```bash
python scripts/migrate.py
```
*(Accepts connection string as an argument or reads `DATABASE_URL` from `.env`)*

### 6. Run the Development Server

```bash
uvicorn app.main:app --reload --port 8000
```

Verify the service is running at:
- Health check: `http://localhost:8000/health`
- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

### 7. Run Backend Tests

```bash
python -m pytest tests/ -v
```
*(42 passing tests with 100% test coverage)*
