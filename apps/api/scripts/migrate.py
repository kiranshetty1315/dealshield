"""DealShield AI — Automated Database Migration Runner.

Runs infra/supabase/migrations/001_initial_schema.sql directly against
your Supabase PostgreSQL database.

Usage:
    python scripts/migrate.py
    python scripts/migrate.py "postgresql://postgres:YOUR_PASSWORD@db.PROJECT_ID.supabase.co:5432/postgres"
"""

import os
import sys
import re
from pathlib import Path

# Locate paths
SCRIPT_DIR = Path(__file__).resolve().parent
API_DIR = SCRIPT_DIR.parent
ROOT_DIR = API_DIR.parent.parent
MIGRATION_FILE = ROOT_DIR / "infra" / "supabase" / "migrations" / "001_initial_schema.sql"
ENV_FILE = API_DIR / ".env"


def load_env():
    """Load key-value pairs from apps/api/.env if present."""
    if ENV_FILE.exists():
        with open(ENV_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    if k not in os.environ:
                        os.environ[k] = v


def extract_project_id(url: str) -> str:
    """Extract project ID from https://<project_id>.supabase.co."""
    m = re.search(r"https?://([a-zA-Z0-9_-]+)\.supabase\.co", url)
    return m.group(1) if m else ""


def main():
    # Auto-switch to virtual environment Python if available and not already running in it
    venv_win = API_DIR / ".venv" / "Scripts" / "python.exe"
    venv_posix = API_DIR / ".venv" / "bin" / "python"
    target_python = venv_win if venv_win.exists() else (venv_posix if venv_posix.exists() else None)
    if target_python and Path(sys.executable).resolve() != target_python.resolve():
        import subprocess
        result = subprocess.run([str(target_python), str(Path(__file__).resolve())] + sys.argv[1:])
        sys.exit(result.returncode)

    load_env()

    print("=================================================================")
    print(" DealShield AI — Supabase Database Migration Runner")
    print("=================================================================")

    if not MIGRATION_FILE.exists():
        print(f"ERROR: Migration file not found at: {MIGRATION_FILE}")
        sys.exit(1)

    with open(MIGRATION_FILE, "r", encoding="utf-8") as f:
        sql_content = f.read()

    # Determine connection string
    db_url = None
    if len(sys.argv) > 1 and sys.argv[1].startswith("postgres"):
        db_url = sys.argv[1]
    elif os.environ.get("DATABASE_URL"):
        db_url = os.environ.get("DATABASE_URL")

    supabase_url = os.environ.get("SUPABASE_URL", "")
    project_id = extract_project_id(supabase_url)

    if not db_url:
        print(f"\nTarget Supabase URL: {supabase_url or '(Not set in apps/api/.env)'}")
        if project_id and project_id != "your-project":
            print(f"Detected Project ID: {project_id}")
            print("\nDirect SQL Editor Browser Link (Alternative 1-Click option):")
            print(f"  👉 https://supabase.com/dashboard/project/{project_id}/sql/new\n")

        print("To run the migration directly from this terminal, please enter your")
        print("Supabase PostgreSQL Database password (or full connection string).")
        print("Note: In Supabase, this is the password you created when creating the project.")
        print("(You can also find your connection string in: Supabase Dashboard -> Project Settings -> Database -> Connection string -> URI)\n")

        user_input = input("Enter DB Password or full postgresql:// URL (or press Enter to cancel): ").strip()
        if not user_input:
            print("Cancelled. You can also run the SQL query directly in Supabase SQL editor.")
            sys.exit(0)

        if user_input.startswith("postgres"):
            db_url = user_input
        else:
            if not project_id or project_id == "your-project":
                print("Error: Could not determine Supabase project ID from SUPABASE_URL in apps/api/.env.")
                sys.exit(1)
            # Default Supabase direct connection format
            # Using port 6543 (pooler session mode) or 5432 (direct)
            db_url = f"postgresql://postgres:{user_input}@db.{project_id}.supabase.co:5432/postgres"

    print(f"\nConnecting to PostgreSQL database...")
    try:
        import psycopg2
    except ImportError:
        print("Installing psycopg2-binary...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary"])
        import psycopg2

    try:
        conn = psycopg2.connect(db_url, connect_timeout=15)
        conn.autocommit = True
        cursor = conn.cursor()

        print("Executing 001_initial_schema.sql migration...")
        cursor.execute(sql_content)
        cursor.close()
        conn.close()

        print("\nSUCCESS! Migration executed successfully.")
        print("Created tables: users, conversations, messages, analyses, agreements,")
        print("agreement_versions, confirmations, audit_events, document_hashes.")
        print("\nYour Supabase database is now fully initialized!")

    except Exception as e:
        print(f"\nFailed to connect or execute migration: {e}")
        print("\nTroubleshooting tips:")
        print("1. If using IPv4 only network, use Supabase connection pooler URI:")
        print(f"   postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres")
        print("2. You can also paste the migration directly in your browser:")
        if project_id and project_id != "your-project":
            print(f"   👉 https://supabase.com/dashboard/project/{project_id}/sql/new")
        else:
            print("   👉 Supabase Dashboard -> SQL Editor -> New Query")
        sys.exit(1)


if __name__ == "__main__":
    main()
