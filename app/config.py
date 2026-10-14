
import os
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[1]

load_dotenv(PROJECT_ROOT / ".env")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "").strip()


def validate_settings() -> None:
    missing = []

    if not GROQ_API_KEY or GROQ_API_KEY.startswith("replace_with_"):
        missing.append("GROQ_API_KEY")

    if not TAVILY_API_KEY or TAVILY_API_KEY.startswith("replace_with_"):
        missing.append("TAVILY_API_KEY")

    if missing:
        raise RuntimeError(
            f"Missing or invalid configuration: {', '.join(missing)}. "
            "Check the .env file in the project root."
        )
