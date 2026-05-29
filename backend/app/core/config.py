from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment / .env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str
    JWT_SECRET: str
    API_KEY_ENCRYPTION_KEY: str
    ENVIRONMENT: str = "development"
    FRONTEND_URLS: str = "http://localhost:3000"
    CONTEXT_WINDOW_MAX_MESSAGES: int = 20

    # JWT tuning
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.FRONTEND_URLS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
