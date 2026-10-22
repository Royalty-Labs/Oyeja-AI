
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    APP_NAME: str = "Oyeja AI"
    APP_VERSION: str = "0.1.0"
    APP_ENV: str = "development"
    DATABASE_URL: str = ""

    OYEJA_AI_API_KEY: str = ""
    OYEJA_AI_BASE_URL: str = ""
    OYEJA_AI_MODEL: str = ""

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
