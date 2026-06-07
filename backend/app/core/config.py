from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "AEGIS One"
    VERSION: str = "1.0.0"
    NODE_ENV: str = "development"

    # API
    NEXT_PUBLIC_API_URL: str = "http://localhost:8000"

    # OpenAI
    OPENAI_API_KEY: str = ""
    USE_AZURE_OPENAI: bool = False
    AZURE_OPENAI_API_KEY: str = ""
    AZURE_OPENAI_ENDPOINT: str = ""
    AZURE_OPENAI_DEPLOYMENT: str = "gpt-4o"
    AZURE_OPENAI_API_VERSION: str = "2024-02-01"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://aegis:aegis_secret@localhost:5432/aegis"
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security / Auth
    SECRET_KEY: str = "change-me-to-a-64-char-random-string-in-production-aegis-one"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440
    AEGIS_DEMO_API_KEY: str = "aegis-demo-key-change-in-production"

    # Rate limiting
    RATE_LIMIT_FIREWALL: int = 100   # requests per minute per IP
    RATE_LIMIT_REDTEAM:  int = 5     # sweeps per minute (expensive)
    RATE_LIMIT_DEMO:     int = 20    # demo calls per minute

    # Azure
    AZURE_KEY_VAULT_URL: str = ""
    AZURE_AI_SEARCH_ENDPOINT: str = ""
    AZURE_AI_SEARCH_KEY: str = ""
    AZURE_AI_SEARCH_INDEX: str = "aegis-vectors"
    AZURE_CLIENT_ID: str = ""
    AZURE_TENANT_ID: str = ""

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]

    # Telemetry
    OTEL_EXPORTER_OTLP_ENDPOINT: str = "http://localhost:4317"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
