from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "agrismart"

    # JWT
    JWT_SECRET_KEY: str = "agrismart-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # External APIs
    OPENAI_API_KEY: str = ""
    WEATHER_API_KEY: str = ""
    DATA_GOV_API_KEY: str = ""

    # Application
    APP_ENV: str = "development"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache()
def get_settings():
    return Settings()
