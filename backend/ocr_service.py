"""Image/PDF OCR and lightweight field extraction for employee documents."""

from __future__ import annotations

import io
import importlib
import os
import re
import unicodedata
from datetime import datetime, timezone

from fastapi import HTTPException

fitz = pytesseract = Image = ImageEnhance = ImageOps = None
TesseractError = TesseractNotFoundError = RuntimeError

MAX_PAGES = 12
MAX_DIMENSION = 3200
SCRIPT_LANGUAGES = {
    "Latin": "eng",
    "Devanagari": "hin+mar+nep+san",
    "Bengali": "ben",
    "Gujarati": "guj",
    "Kannada": "kan",
    "Malayalam": "mal",
    "Oriya": "ori",
    "Gurmukhi": "pan",
    "Tamil": "tam",
    "Telugu": "tel",
}


def _load_ocr_packages() -> None:
    global fitz, pytesseract, Image, ImageEnhance, ImageOps
    global TesseractError, TesseractNotFoundError
    if all(package is not None for package in (fitz, pytesseract, Image, ImageEnhance, ImageOps)):
        return
    try:
        fitz = importlib.import_module("pymupdf")
        pytesseract = importlib.import_module("pytesseract")
        tesseract_path = os.getenv(
            "TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe"
        )
        if os.path.isfile(tesseract_path):
            pytesseract.pytesseract.tesseract_cmd = tesseract_path
        Image = importlib.import_module("PIL.Image")
        ImageEnhance = importlib.import_module("PIL.ImageEnhance")
        ImageOps = importlib.import_module("PIL.ImageOps")
        TesseractError = pytesseract.TesseractError
        TesseractNotFoundError = pytesseract.TesseractNotFoundError
    except (ImportError, AttributeError) as error:
        fitz = pytesseract = Image = ImageEnhance = ImageOps = None
        raise HTTPException(
            status_code=503,
            detail="OCR is unavailable because its Python packages are not installed. Install backend/requirements.txt.",
        ) from error


def _check_engine() -> set[str]:
    _load_ocr_packages()
    try:
        pytesseract.get_tesseract_version()
        return set(pytesseract.get_languages(config=""))
    except (TesseractError, TesseractNotFoundError, OSError) as error:
        raise HTTPException(
            status_code=503,
            detail="OCR is unavailable because the Tesseract engine is not installed or configured.",
        ) from error


def _clean_image(image: Image.Image) -> Image.Image:
    image = ImageOps.exif_transpose(image).convert("RGB")
    image = ImageOps.grayscale(image)
    image = ImageOps.autocontrast(image)
    width, height = image.size
    if max(width, height) < 1600:
        scale = min(2.0, 1600 / max(width, height))
        width, height = round(width * scale), round(height * scale)
    if max(width, height) > MAX_DIMENSION:
        scale = MAX_DIMENSION / max(width, height)
        width, height = round(width * scale), round(height * scale)
    if image.size != (width, height):
        image = image.resize((width, height), Image.Resampling.LANCZOS)
    return ImageEnhance.Sharpness(image).enhance(1.35)


def _ocr_image(image: Image.Image, available: set[str]) -> tuple[str, str, str]:
    cleaned = _clean_image(image)
    script = "Unknown"
    rotation = 0
    try:
        osd = pytesseract.image_to_osd(cleaned, config="--psm 0")
        script_match = re.search(r"^Script:\s*(.+)$", osd, re.MULTILINE)
        confidence_match = re.search(r"^Script confidence:\s*([\d.]+)$", osd, re.MULTILINE)
        rotate_match = re.search(r"^Rotate:\s*(\d+)$", osd, re.MULTILINE)
        if script_match and (not confidence_match or float(confidence_match.group(1)) >= 1.0):
            script = script_match.group(1).strip()
        if rotate_match:
            rotation = int(rotate_match.group(1)) % 360
    except TesseractError:
        # OSD often fails on short or low-quality scans; English is the safe fallback.
        pass

    language = SCRIPT_LANGUAGES.get(script, "eng")
    if any(model not in available for model in language.split("+")):
        language = "eng"
    if rotation:
        cleaned = cleaned.rotate(-rotation, expand=True)
    try:
        text = pytesseract.image_to_string(cleaned, lang=language, config="--psm 6")
    except TesseractError:
        if language == "eng" or "eng" not in available:
            raise HTTPException(status_code=422, detail="The document could not be read by OCR.")
        language = "eng"
        text = pytesseract.image_to_string(cleaned, lang="eng", config="--psm 6")
    return text, script, language


def _normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFKC", text or "")
    text = "".join(char for char in text if char in "\n\t" or unicodedata.category(char) != "Cc")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def _ascii_digits(value: str) -> str:
    digits = []
    for character in value:
        try:
            digits.append(str(unicodedata.digit(character)))
        except (TypeError, ValueError):
            if character.isascii() and character.isdigit():
                digits.append(character)
    return "".join(digits)


def _label_value(lines: list[str], labels: str) -> str:
    pattern = re.compile(rf"(?:{labels})\s*[:：\-]?\s*(.*)", re.IGNORECASE)
    for index, line in enumerate(lines):
        match = pattern.search(line)
        if match:
            value = match.group(1).strip(" :-–")
            if value:
                return value[:300]
            if index + 1 < len(lines) and lines[index + 1].strip():
                return lines[index + 1].strip()[:300]
    return ""


def _extract_fields(text: str, selected_type: str) -> tuple[str, dict[str, str]]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    compact = "\n".join(lines)
    aadhaar = ""
    for match in re.finditer(r"(?<!\w)(?:\d[\s\-]*){12}(?!\w)", compact):
        candidate = _ascii_digits(match.group(0))
        if len(candidate) == 12:
            aadhaar = candidate
            break
    phone_value = _label_value(lines, r"phone|mobile|contact number|मोबाइल|फोन")
    phone_match = re.search(r"(?:\+?\s*91[\s-]*)?(?:\d[\s().\-]*){10,13}", phone_value)
    if not phone_match:
        phone_match = re.search(r"(?<!\w)(?:\d[\s().\-]*){10}(?!\w)", compact)
    phone = _ascii_digits(phone_match.group(0))[-10:] if phone_match else ""
    if len(phone) != 10:
        phone = ""

    pan_match = re.search(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b", compact.upper())
    dob = _label_value(lines, r"date of birth|d\.o\.b\.?|dob|जन्म\s*तिथि|जन्म\s*तारीख")
    gender = _label_value(lines, r"gender|sex|लिंग")
    if not gender:
        gender = re.search(r"\b(male|female|transgender)\b", compact, re.IGNORECASE)
        gender = gender.group(1) if gender else ""
    email_match = re.search(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", compact, re.IGNORECASE)
    name = _label_value(lines, r"\b(?:name|applicant name|candidate name)\b|नाम")
    if not name:
        excluded_name_words = {
            "university", "institute", "college", "school", "department",
            "registrar", "student", "roll", "number", "batch", "course",
        }
        for line in lines[:20]:
            words = re.findall(r"[A-Za-z][A-Za-z.'-]*", line)
            if (
                2 <= len(words) <= 4
                and all(len(word) >= 2 for word in words)
                and not excluded_name_words.intersection(word.lower() for word in words)
                and not re.search(r"[^A-Za-z .'-]", line)
            ):
                name = " ".join(words)[:100]
                break
    father = _label_value(lines, r"father(?:'s)? name|s/o|son of|daughter of|पिता(?: का नाम)?")
    address = _label_value(lines, r"address|पता")
    if address:
        address = re.split(r"\b(?:date of birth|dob|gender|phone|mobile|email|aadhaar|pan)\b", address, flags=re.IGNORECASE)[0].strip()
    education = _label_value(lines, r"education|qualification|academic|शिक्षा")
    experience = _label_value(lines, r"experience|work experience|अनुभव")
    if not experience:
        experience_match = re.search(r"\b\d{1,2}\s*(?:\+\s*)?(?:years?|yrs?)(?:\s+\d+\s*months?)?\b", compact, re.IGNORECASE)
        experience = experience_match.group(0) if experience_match else ""
    skills = _label_value(lines, r"skills|technical skills|expertise|कौशल")

    document_type = selected_type
    fields = {
        "name": name,
        "father_name": father,
        "address": address,
        "date_of_birth": dob,
        "gender": gender,
        "phone": phone,
        "aadhaar_number": aadhaar,
        "pan_number": pan_match.group(0).upper() if pan_match else "",
        "email": email_match.group(0) if email_match else "",
        "education": education,
        "experience": experience,
        "skills": skills,
    }
    return document_type, fields


def process_document(file_bytes: bytes, filename: str, selected_type: str) -> dict:
    available = _check_engine()
    if "eng" not in available:
        raise HTTPException(status_code=503, detail="OCR is unavailable because the English Tesseract model is missing.")

    chunks: list[str] = []
    scripts: list[str] = []
    languages: list[str] = []
    lower_name = filename.lower()
    if lower_name.endswith(".pdf") or file_bytes.startswith(b"%PDF"):
        try:
            document = fitz.open(stream=file_bytes, filetype="pdf")
        except Exception as error:
            raise HTTPException(status_code=400, detail="This PDF is invalid or cannot be opened.") from error
        if document.page_count > MAX_PAGES:
            raise HTTPException(status_code=400, detail=f"PDFs may contain no more than {MAX_PAGES} pages.")
        for page in document:
            page_text = _normalize_text(page.get_text("text"))
            if len(page_text) >= 20:
                chunks.append(page_text)
            else:
                try:
                    scale = min(2.0, MAX_DIMENSION / max(page.rect.width, page.rect.height))
                    pixmap = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
                    image = Image.open(io.BytesIO(pixmap.tobytes("png")))
                    page_text, script, language = _ocr_image(image, available)
                    chunks.append(page_text)
                    scripts.append(script)
                    languages.append(language)
                except HTTPException:
                    raise
                except (TesseractError, TesseractNotFoundError) as error:
                    raise HTTPException(status_code=422, detail="This scanned PDF page could not be read.") from error
        document.close()
    else:
        try:
            image = Image.open(io.BytesIO(file_bytes))
            if image.width * image.height > 50_000_000:
                raise HTTPException(status_code=400, detail="This image is too large to process safely.")
            text, script, language = _ocr_image(image, available)
        except HTTPException:
            raise
        except (OSError, ValueError) as error:
            raise HTTPException(status_code=400, detail="This image is invalid or cannot be opened.") from error
        except (TesseractError, TesseractNotFoundError) as error:
            raise HTTPException(status_code=422, detail="The image could not be read by OCR.") from error
        chunks.append(text)
        scripts.append(script)
        languages.append(language)

    extracted_text = _normalize_text("\n\n".join(chunks))
    if not extracted_text:
        raise HTTPException(status_code=422, detail="No readable text was found. Try a clearer, well-lit image or PDF.")
    document_type, fields = _extract_fields(extracted_text, selected_type)
    result = {
        "filename": filename,
        "document_type": document_type,
        "detected_script": ", ".join(dict.fromkeys(script for script in scripts if script)) or "Digital PDF text",
        "tesseract_language": ", ".join(dict.fromkeys(languages)) or "PDF text layer",
        "fields": fields,
        "extracted_text": extracted_text,
        "processed_at": datetime.now(timezone.utc).isoformat(),
    }
    result["human_readable_text"] = extracted_text
    return result
