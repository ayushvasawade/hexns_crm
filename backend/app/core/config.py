from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "HEXNS Mediaworks API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Allowed CORS Origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Database Configuration (Neon PostgreSQL compatible)
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://user:password@placeholder-neon-host.neon.tech/hexns_crm?ssl=require",
        description="Async PostgreSQL connection string (asyncpg driver)",
    )
    SYNC_DATABASE_URL: str = Field(
        default="postgresql://user:password@placeholder-neon-host.neon.tech/hexns_crm?ssl=require",
        description="Synchronous PostgreSQL connection string for Alembic migrations",
    )
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10
    DATABASE_POOL_PRE_PING: bool = True
    DATABASE_ECHO: bool = False


settings = Settings()
