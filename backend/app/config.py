from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Virasat Backend Application Settings."""

    # Google Cloud Platform configuration
    GCP_PROJECT: str = "virasat-511210"
    GCP_REGION: str = "asia-south1"
    VERTEX_LOCATION: str = "us-central1"

    # Gemini & Embeddings models (Model names read ONLY from config)
    GEMINI_PRO_MODEL: str = "gemini-2.5-pro"
    GEMINI_FLASH_MODEL: str = "gemini-2.5-flash"
    EMBED_MODEL: str = "text-embedding-005"
    EMBED_DIM: int = 768

    # Cloud Spanner & Storage
    SPANNER_INSTANCE: str = "virasat-inst"
    SPANNER_DATABASE: str = "virasat-db"
    GCS_BUCKET: str = "virasat-511210-docs"

    # Networking & Security
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    DEMO_MODE: bool = True
    AGENT_FALLBACK_TO_CACHE: bool = True
    USE_SQL_FALLBACK: bool = False
    SESSION_TTL_HOURS: int = 24
    RATE_LIMIT_PER_MIN: int = 60
    RATE_LIMIT_CHAT_PER_MIN: int = 30
    MAX_CHAT_MESSAGE_LENGTH: int = 2000
    MAX_CHAT_HISTORY_TURNS: int = 10
    ENABLE_MODEL_ARMOR: bool = False
    LOCAL_DEV_UID: str = ""
    PORT: int = 8000
    REDACT_PII: bool = True
    MAX_CONCURRENT_RUNS: int = 10
    DAILY_MODEL_CALL_BUDGET_PER_UID: int = 150
    SCHEDULER_SERVICE_ACCOUNT: str = "virasat-api@virasat-511210.iam.gserviceaccount.com"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def allowed_origins_list(self) -> list[str]:
        """Parse comma-separated ALLOWED_ORIGINS into a list."""
        if not self.ALLOWED_ORIGINS:
            return ["*"]
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()
