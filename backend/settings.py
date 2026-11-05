import os

from dotenv import load_dotenv

load_dotenv()

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
RESUMES_DIR = os.path.join(BACKEND_DIR, "uploads", "resumes")
os.makedirs(RESUMES_DIR, exist_ok=True)
OCR_UPLOADS_DIR = os.path.join(BACKEND_DIR, "uploads", "ocr")
os.makedirs(OCR_UPLOADS_DIR, exist_ok=True)

FRONTEND_ORIGINS = os.getenv(
    "FRONTEND_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
)
ALLOWED_ORIGINS = [
    origin.strip() for origin in FRONTEND_ORIGINS.split(",") if origin.strip()
]
