# DealShield AI — Backend API

FastAPI backend service powering WhatsApp chat parsing, AI agreement extraction, conflict detection, agreement lifecycle management, and evidence vault integrity verification.

## Architecture

- **Framework:** FastAPI with Pydantic v2 Settings and validation schemas
- **Chat Processing:** Deterministic WhatsApp parser with stable message citation IDs (`app/services/chat_parser.py`)
- **Integrity:** SHA-256 document hashing service (`app/services/hash_service.py`)
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
*(No real credentials are required to run the local scaffold or pass health checks.)*

### 5. Run the Development Server

```bash
uvicorn app.main:app --reload --port 8000
```

Verify the service is running at:
- Health check: `http://localhost:8000/health`
- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

### 6. Run Backend Tests

```bash
python -m pytest tests/ -v
```
