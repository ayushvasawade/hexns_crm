import json
from typing import List, Union
from urllib.parse import urlparse

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "HEXNS Mediaworks API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    CORS_ORIGIN_REGEX: Union[str, None] = None
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://USER:PASSWORD@ep-example.neon.tech/hexns_crm?ssl=require",
        description="Async PostgreSQL connection string",
    )
    SYNC_DATABASE_URL: Union[str, None] = Field(
        default=None,
        description="Synchronous PostgreSQL connection string for Alembic (derived from DATABASE_URL if omitted)",
    )
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 10
    DATABASE_POOL_PRE_PING: bool = True
    DATABASE_ECHO: bool = False
    JWT_SECRET_KEY: str = "development-only-change-me-use-a-long-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                try:
                    origins = json.loads(v)
                    return [str(o).strip().rstrip("/") for o in origins if str(o).strip()]
                except Exception:
                    pass
            return [origin.strip().rstrip("/") for origin in v.split(",") if origin.strip()]
        if isinstance(v, list):
            return [str(origin).strip().rstrip("/") for origin in v if str(origin).strip()]
        return v

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_asyncpg_database_url(cls, v: str) -> str:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("postgres://"):
                v = "postgresql+asyncpg://" + v[len("postgres://"):]
            elif v.startswith("postgresql://") and not v.startswith("postgresql+asyncpg://"):
                v = "postgresql+asyncpg://" + v[len("postgresql://"):]
            v = v.replace("sslmode=require", "ssl=require")
        return v

    @field_validator("SYNC_DATABASE_URL", mode="before")
    @classmethod
    def normalize_sync_database_url(cls, v: Union[str, None]) -> Union[str, None]:
        if isinstance(v, str) and v.strip():
            v = v.strip()
            if v.startswith("postgres://"):
                v = "postgresql+psycopg2://" + v[len("postgres://"):]
            elif v.startswith("postgresql://") and not v.startswith("postgresql+psycopg2://"):
                v = "postgresql+psycopg2://" + v[len("postgresql://"):]
            return v
        return None

    @property
    def database_is_configured(self) -> bool:
        parsed = urlparse(self.DATABASE_URL)
        return bool(
            parsed.scheme in {"postgresql", "postgresql+asyncpg"}
            and parsed.hostname
            and parsed.username not in {None, "USER"}
            and parsed.password not in {None, "PASSWORD"}
        )

    @model_validator(mode="after")
    def validate_configuration(self) -> "Settings":
        if not self.SYNC_DATABASE_URL and self.DATABASE_URL:
            derived = self.DATABASE_URL
            if derived.startswith("postgresql+asyncpg://"):
                derived = "postgresql+psycopg2://" + derived[len("postgresql+asyncpg://"):]
            elif derived.startswith("postgres://"):
                derived = "postgresql+psycopg2://" + derived[len("postgres://"):]
            elif derived.startswith("postgresql://"):
                derived = "postgresql+psycopg2://" + derived[len("postgresql://"):]
            self.SYNC_DATABASE_URL = derived.replace("ssl=require", "sslmode=require")

        if self.ENVIRONMENT in {"production", "staging"}:
            if self.JWT_SECRET_KEY == "development-only-change-me-use-a-long-secret":
                raise ValueError("JWT_SECRET_KEY must be configured outside development")
            if len(self.JWT_SECRET_KEY) < 32:
                raise ValueError("JWT_SECRET_KEY must be at least 32 characters")
        return self


settings = Settings()
