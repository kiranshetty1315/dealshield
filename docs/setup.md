# DealShield AI — Local Setup & Development Guide

This guide walks you through setting up and running DealShield AI from a fresh clone.
**No real API keys or paid cloud accounts are required** to start the local scaffold, run the full test suite, or test frontend/backend connectivity.

---

## 1. Prerequisites

- **Node.js:** v18.0.0+ or v20.0.0+ (Tested with v24.15.0)
- **Python:** v3.11+ (Tested with Python 3.13.5)
- **Git**

---

## 2. Fast Clone & Setup Walkthrough

### Step A: Clone the Repository
```bash
git clone https://github.com/kiranshetty1315/dealshield.git
cd dealshield
```

---

### Step B: Backend Setup (FastAPI)

1. Navigate to the backend directory:
   ```bash
   cd apps/api
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # On macOS / Linux:
   python3 -m venv .venv
   source .venv/bin/activate

   # On Windows (PowerShell):
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create local environment configuration:
   ```bash
   # On macOS / Linux:
   cp .env.example .env

   # On Windows (PowerShell):
   Copy-Item .env.example .env
   ```
   *(The default placeholders in `.env.example` allow full local development and testing.)*

5. Run backend unit & integration tests:
   ```bash
   python -m pytest tests/ -v
   ```

6. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   - Health endpoint: `http://localhost:8000/health`
   - Interactive Swagger API docs: `http://localhost:8000/docs`

---

### Step C: Frontend Setup (Next.js)

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd apps/web
   ```

2. Install npm dependencies:
   ```bash
   npm install
   ```

3. Create frontend local environment configuration:
   ```bash
   # On macOS / Linux:
   cp .env.example .env.local

   # On Windows (PowerShell):
   Copy-Item .env.example .env.local
   ```
   *(Points `NEXT_PUBLIC_API_URL` to `http://localhost:8000`)*

4. Run lint and type checking:
   ```bash
   npm run lint
   npm run typecheck
   ```

5. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   - Web application: `http://localhost:3000`

---

## 3. Running Both Services Concurrently

For optimal development workflow, run the backend and frontend in separate terminal windows, or use standard tools like `concurrently`:

```bash
# Terminal 1: Backend
cd apps/api && .\.venv\Scripts\Activate.ps1 && uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd apps/web && npm run dev
```

---

## 4. End-to-End Smoke Test Workflow

Verify your local installation in 60 seconds:

1. **Verify Backend Health:**
   ```bash
   curl http://localhost:8000/health
   # Expected output: {"status":"healthy","version":"0.1.0","environment":"development",...}
   ```

2. **Verify Frontend Connectivity:**
   - Open `http://localhost:3000` in your browser.
   - Look at the top navigation bar.
   - The status pill should display: `Backend Online (v0.1.0)`.

3. **Verify Chat Parser Integration:**
   - On the homepage or `/upload`, click **"Load Sample Negotiation (Raj vs Priya)"**.
   - Click **"Parse Pasted Transcript"**.
   - Confirm that the UI displays **10 messages parsed**, identifies **Raj Mehta** and **Priya Sharma**, and assigns deterministic IDs (`msg_...`).

4. **Verify Hash Verifier:**
   - Navigate to `/evidence`.
   - Click **"Compute & Verify Digest"**.
   - Verify that the 64-character SHA-256 fingerprint is calculated and displayed.
