from typing import List, Union, Optional
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """DealShield AI Backend Application Settings.
    
    Reads from environment variables and optional .env file.
    Does not require real credentials to start the application in development.
    """
    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "DealShield AI API"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Server config
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS configuration
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str], None]) -> List[str]:
        if not v:
            return ["http://localhost:3000", "http://127.0.0.1:3000"]
        if isinstance(v, str):
            clean_str = v.strip()
            if not clean_str:
                return ["http://localhost:3000", "http://127.0.0.1:3000"]
            if clean_str.startswith("["):
                import json
                try:
                    parsed = json.loads(clean_str)
                    if isinstance(parsed, list):
                        return [str(i).strip() for i in parsed if str(i).strip()]
                except Exception:
                    pass
            return [i.strip() for i in clean_str.split(",") if i.strip()]
        elif isinstance(v, list):
            return [str(i).strip() for i in v if str(i).strip()]
        return ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Supabase (Team D integration - placeholders allowed for local scaffold)
    SUPABASE_URL: str = "https://placeholder-project.supabase.co"
    SUPABASE_ANON_KEY: str = "placeholder-anon-key"
    SUPABASE_SERVICE_ROLE_KEY: str = "placeholder-service-role-key"
    DATABASE_URL: Optional[str] = None

    # Security salts & encryption
    SECRET_KEY: str = "dealshield-auth-secret-key-change-in-production-2026"
    IP_HASH_SALT: str = "dealshield-default-dev-salt-change-in-production"
    ENCRYPTION_KEY: str = "rUqpl4OBAPgr-k1M_wughKIjIBOWpJn-YTRIEq6f3Wk="

    # OpenAI (Team C integration - placeholder allowed for local scaffold)
    OPENAI_API_KEY: str = "sk-placeholder-openai-key"
    OPENAI_MODEL: str = "gpt-4o-mini"

    # Counterparty Email-OTP Confirmation & Notification Config
    REQUIRE_EMAIL_OTP: bool = True
    ALLOW_DIRECT_CONFIRM: bool = False
    EMAIL_BACKEND: str = "console"  # "console" | "smtp" | "memory"
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: str = "no-reply@dealshield.local"
    SMTP_USE_TLS: bool = True
    OTP_TTL_MINUTES: int = 10
    SESSION_TTL_MINUTES: int = 30
    FRONTEND_BASE_URL: str = "http://localhost:3000"


settings = Settings()
