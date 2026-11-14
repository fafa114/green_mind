from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "sqlite:///./greenmind.db"
    jwt_secret: str = "dev-secret-change-me"
    jwt_expire_hours: int = 24
    llm_api_key: str = ""
    llm_base_url: str = "https://api.deepseek.com"
    llm_model: str = "deepseek-chat"
    llm_fallback_model: str = "qwen-plus"
    upload_dir: str = "./uploads"
    pdf_font_path: str = "C:/Windows/Fonts/simhei.ttf"


settings = Settings()
