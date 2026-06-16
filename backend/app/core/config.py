"""Application configuration, driven entirely by the environment.

Every deployment-specific value is read from env vars (see ../../.env.example) so
nothing sensitive is hardcoded. Mirrors implement.md §3.4.
"""
from __future__ import annotations

from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- API surface (api.md §2) ---
    api_prefix: str = "/api/v1"
    project_name: str = "Skill Hub"

    # --- Database ---
    # postgresql+asyncpg://user:pass@host:5432/skillhub
    database_url: str = "postgresql+asyncpg://skill:skill@localhost:5432/skillhub"

    # --- Auth (api.md §3) ---
    jwt_secret: str = "dev-secret-key-at-least-32-bytes-long"
    jwt_algorithm: str = "HS256"
    access_token_ttl_seconds: int = 900        # 15 minutes
    refresh_token_ttl_seconds: int = 2_592_000  # 30 days

    # --- CORS ---
    # NoDecode prevents pydantic-settings from JSON-decoding the env var first, so the
    # validator below can accept a plain comma-separated string (or a JSON list).
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:3000"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, v: object) -> object:
        """Accept a comma-separated string or a JSON list from the environment."""
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("["):
                import json

                return json.loads(v)
            return [o.strip() for o in v.split(",") if o.strip()]
        return v


settings = Settings()
