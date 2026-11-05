"""Admin-only access to legacy single-document OCR records."""

import mimetypes
import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from auth import require_admin
from employee_services import get_employee_by_id
from settings import OCR_UPLOADS_DIR

router = APIRouter()


def _legacy_result(employee: dict) -> dict:
    result = employee.get("ocr_result")
    if not result:
        raise HTTPException(status_code=404, detail="No legacy OCR result is available.")
    return result


def _legacy_file(result: dict, key: str, media_type: str, filename: str):
    stored_name = result.get(key)
    if not stored_name or os.path.basename(stored_name) != stored_name:
        raise HTTPException(status_code=404, detail="This saved OCR file is unavailable.")
    file_path = os.path.join(OCR_UPLOADS_DIR, stored_name)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="This saved OCR file is unavailable.")
    return FileResponse(
        file_path,
        media_type=media_type,
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.get("/employees/{employee_id}/ocr")
def get_employee_legacy_ocr(employee_id: str, current_user: dict = Depends(require_admin)):
    return _legacy_result(get_employee_by_id(employee_id))


@router.get("/employees/{employee_id}/ocr/source")
def get_employee_legacy_ocr_source(employee_id: str, current_user: dict = Depends(require_admin)):
    result = _legacy_result(get_employee_by_id(employee_id))
    filename = result.get("filename", "document")
    return _legacy_file(
        result,
        "source_stored_name",
        mimetypes.guess_type(filename)[0] or "application/octet-stream",
        result.get("source_stored_name", "uploaded-document"),
    )


@router.get("/employees/{employee_id}/ocr/text")
def get_employee_legacy_ocr_text(employee_id: str, current_user: dict = Depends(require_admin)):
    result = _legacy_result(get_employee_by_id(employee_id))
    return _legacy_file(result, "text_stored_name", "text/plain; charset=utf-8", "ocr-readable-text.txt")
