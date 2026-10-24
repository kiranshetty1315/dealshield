"""DealShield AI — Automated Database Migration Runner.

Runs all migrations in infra/supabase/migrations/ in filename order against
your Supabase PostgreSQL database and tracks applied migrations in public.schema_migrations.

Usage:
    python scripts/migrate.py
    python scripts/migrate.py --dry-run
    python scripts/migrate.py "postgresql://postgres:YOUR_PASSWORD@db.PROJECT_ID.supabase.co:5432/postgres"
    python scripts/migrate.py --dry-run "postgresql://postgres:YOUR_PASSWORD@db.PROJECT_ID.supabase.co:5432/postgres"
"""

import os
import sys
import re
from pathlib import Path

# Locate paths
SCRIPT_DIR = Path(__file__).resolve().parent
API_DIR = SCRIPT_DIR.parent
ROOT_DIR = API_DIR.parent.parent
MIGRATIONS_DIR = ROOT_DIR / "infra" / "supabase" / "migrations"
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

    args = sys.argv[1:]
    dry_run = "--dry-run" in args
    filtered_args = [a for a in args if a != "--dry-run"]

    print("=================================================================")
    print(" DealShield AI — Supabase Database Migration Runner")
    if dry_run:
        print(" MODE: DRY RUN (no modifications will be made)")
    print("=================================================================")

    if not MIGRATIONS_DIR.exists():
        print(f"ERROR: Migrations directory not found at: {MIGRATIONS_DIR}")
        sys.exit(1)

    migration_files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    if not migration_files:
        print(f"ERROR: No .sql migration files found in {MIGRATIONS_DIR}")
        sys.exit(1)

    print(f"Found {len(migration_files)} migration files in {MIGRATIONS_DIR.name}/:")
    for mf in migration_files:
        print(f"  - {mf.name}")

    # Determine connection string
    db_url = None
    if filtered_args and filtered_args[0].startswith("postgres"):
        db_url = filtered_args[0]
    elif os.environ.get("DATABASE_URL"):
        db_url = os.environ.get("DATABASE_URL")

    supabase_url = os.environ.get("SUPABASE_URL", "")
    project_id = extract_project_id(supabase_url)

    if not db_url:
        print(f"\nTarget Supabase URL: {supabase_url or '(Not set in apps/api/.env)'}")
        if project_id and project_id != "your-project":
            print(f"Detected Project ID: {project_id}")
            print("\nDirect SQL Editor Browser Link (Alternative 1-Click option):")
            print(f"  -> https://supabase.com/dashboard/project/{project_id}/sql/new\n")

        print("To run migrations directly from this terminal, please enter your")
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

        # Check if schema_migrations table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'schema_migrations'
            );
        """)
        schema_migrations_exists = cursor.fetchone()[0]

        if not schema_migrations_exists:
            # Check if existing tables (e.g., users) exist from a legacy unversioned 001 run
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = 'users'
                );
            """)
            users_exist = cursor.fetchone()[0]

            if not dry_run:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS public.schema_migrations (
                        filename TEXT PRIMARY KEY,
                        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );
                """)
                if users_exist:
                    print("Detected existing database schema. Recording '001_initial_schema.sql' as applied.")
                    cursor.execute("""
                        INSERT INTO public.schema_migrations (filename, applied_at)
                        VALUES ('001_initial_schema.sql', NOW())
                        ON CONFLICT (filename) DO NOTHING;
                    """)

        # Fetch applied migrations
        applied = set()
        if schema_migrations_exists or not dry_run:
            cursor.execute("SELECT filename FROM public.schema_migrations;")
            applied = {row[0] for row in cursor.fetchall()}

        print(f"\nChecking migration status ({len(applied)} already recorded as applied)...")
        pending_count = 0

        for mf in migration_files:
            filename = mf.name
            if filename in applied:
                print(f"  [ALREADY APPLIED] {filename}")
                continue

            pending_count += 1
            if dry_run:
                print(f"  [DRY RUN - WOULD APPLY] {filename}")
            else:
                print(f"  [APPLYING] {filename}...")
                with open(mf, "r", encoding="utf-8") as f:
                    sql_content = f.read()

                cursor.execute(sql_content)
                cursor.execute(
                    "INSERT INTO public.schema_migrations (filename, applied_at) VALUES (%s, NOW());",
                    (filename,)
                )
                print(f"  [SUCCESS] {filename}")

        cursor.close()
        conn.close()

        if dry_run:
            print(f"\nDry run complete. {pending_count} pending migration(s) identified.")
        elif pending_count == 0:
            print("\nDatabase is already up to date. No new migrations needed.")
        else:
            print(f"\nSUCCESS! Applied {pending_count} migration(s). Database is fully synchronized.")

    except Exception as e:
        print(f"\nFailed to connect or execute migrations: {e}")
        print("\nTroubleshooting tips:")
        print("1. If using IPv4 only network, use Supabase connection pooler URI:")
        print(f"   postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres")
        print("2. You can also paste pending migrations directly in your browser:")
        if project_id and project_id != "your-project":
            print(f"   -> https://supabase.com/dashboard/project/{project_id}/sql/new")
        else:
            print("   -> Supabase Dashboard -> SQL Editor -> New Query")
        sys.exit(1)


if __name__ == "__main__":
    main()
