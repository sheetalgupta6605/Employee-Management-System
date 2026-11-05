"""Employee document storage and admin-only OCR processing."""

import base64
import binascii
import mimetypes
import os
import uuid
from datetime import datetime, timezone
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from auth import require_admin, require_employee
from database import employees_collection
from employee_services import get_employee_by_id, get_linked_employee
from models import EmployeeDocumentLabelUpdate, EmployeeDocumentUpload
from ocr_service import process_document
from settings import OCR_UPLOADS_DIR

router = APIRouter()
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff", ".pdf"}


def _decode_upload(payload: EmployeeDocumentUpload) -> tuple[bytes, str]:
    filename = os.path.basename(payload.filename.strip())
    extension = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Upload a PNG, JPEG, WebP, TIFF, or PDF file.")
    encoded = payload.file_data.split(",", 1)[-1]
    try:
        raw_bytes = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError) as error:
        raise HTTPException(status_code=400, detail="The uploaded file data is invalid.") from error
    if not raw_bytes or len(raw_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Each document must be non-empty and no larger than 10MB.")
    if extension == ".pdf" and not raw_bytes.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="The selected file is not a valid PDF document.")
    if extension != ".pdf" and raw_bytes.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="The file contents do not match the selected image format.")
    return raw_bytes, filename


def _public_document(document: dict, include_ocr: bool = False) -> dict:
    result = {
        "id": document["id"],
        "filename": document["filename"],
        "document_label": document.get("document_label", "Previous upload"),
        "file_size": document["file_size"],
        "uploaded_at": document["uploaded_at"],
    }
    if include_ocr and document.get("ocr_result"):
        result["ocr_result"] = document["ocr_result"]
    return result


def _employee_documents(employee: dict) -> list[dict]:
    documents = list(employee.get("documents", []))
    legacy = employee.get("ocr_result") or {}
    legacy_source = legacy.get("source_stored_name")
    if legacy_source and os.path.basename(legacy_source) == legacy_source and not any(
        item.get("source_stored_name") == legacy_source for item in documents
    ):
        legacy_id = "legacy-" + uuid.uuid5(uuid.NAMESPACE_URL, legacy_source).hex
        legacy_document = {
            "id": legacy_id,
            "filename": legacy.get("filename", "previous-ocr-upload"),
            "document_label": legacy.get("document_label", "Previous upload"),
            "source_stored_name": legacy_source,
            "file_size": os.path.getsize(os.path.join(OCR_UPLOADS_DIR, legacy_source))
            if os.path.isfile(os.path.join(OCR_UPLOADS_DIR, legacy_source)) else 0,
            "uploaded_at": legacy.get("processed_at", ""),
            "ocr_result": legacy,
        }
        employees_collection.update_one(
            {"_id": employee["_id"]}, {"$push": {"documents": legacy_document}}
        )
        documents.append(legacy_document)
    return documents


def _find_document(employee: dict, document_id: str) -> dict:
    document = next((item for item in _employee_documents(employee) if item.get("id") == document_id), None)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return document


def _file_response(document: dict, download: bool = False):
    stored_name = document.get("source_stored_name")
    if not stored_name or os.path.basename(stored_name) != stored_name:
        raise HTTPException(status_code=404, detail="The uploaded document is unavailable.")
    file_path = os.path.join(OCR_UPLOADS_DIR, stored_name)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="The uploaded document is unavailable.")
    disposition = "attachment" if download else "inline"
    safe_filename = quote(document.get("filename", "document"), safe="")
    return FileResponse(
        file_path,
        media_type=mimetypes.guess_type(document.get("filename", ""))[0] or "application/octet-stream",
        headers={"Content-Disposition": f"{disposition}; filename*=UTF-8''{safe_filename}"},
    )


@router.post("/employees/me/documents")
def upload_employee_document(
    payload: EmployeeDocumentUpload,
    current_user: dict = Depends(require_employee),
):
    raw_bytes, filename = _decode_upload(payload)
    document_label = payload.document_label.strip()
    if not document_label:
        raise HTTPException(status_code=400, detail="Enter a description for this document.")
    employee = get_linked_employee(current_user)
    extension = os.path.splitext(filename)[1].lower()
    document_id = uuid.uuid4().hex
    stored_name = f"{employee['_id']}_{document_id}{extension}"
    with open(os.path.join(OCR_UPLOADS_DIR, stored_name), "wb") as file:
        file.write(raw_bytes)
    document = {
        "id": document_id,
        "filename": filename,
        "document_label": document_label,
        "source_stored_name": stored_name,
        "file_size": len(raw_bytes),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }
    employees_collection.update_one({"_id": employee["_id"]}, {"$push": {"documents": document}})
    return _public_document(document)


@router.get("/employees/me/documents")
def get_my_documents(current_user: dict = Depends(require_employee)):
    employee = get_linked_employee(current_user)
    return [_public_document(item) for item in _employee_documents(employee)]


@router.put("/employees/me/documents/{document_id}")
def update_my_document_label(
    document_id: str,
    payload: EmployeeDocumentLabelUpdate,
    current_user: dict = Depends(require_employee),
):
    employee = get_linked_employee(current_user)
    document = _find_document(employee, document_id)
    label = payload.document_label.strip()
    if not label:
        raise HTTPException(status_code=400, detail="Enter a description for this document.")
    employees_collection.update_one(
        {"_id": employee["_id"], "documents.id": document_id},
        {"$set": {"documents.$.document_label": label}},
    )
    document["document_label"] = label
    return _public_document(document)


@router.delete("/employees/me/documents/{document_id}")
def delete_my_document(document_id: str, current_user: dict = Depends(require_employee)):
    employee = get_linked_employee(current_user)
    document = _find_document(employee, document_id)
    ocr_result = document.get("ocr_result") or {}
    legacy_result = employee.get("ocr_result") or {}
    update = {"$pull": {"documents": {"id": document_id}}}
    if legacy_result.get("source_stored_name") == document.get("source_stored_name"):
        update["$unset"] = {"ocr_result": ""}
        ocr_result = {**legacy_result, **ocr_result}
    employees_collection.update_one({"_id": employee["_id"]}, update)
    stored_names = [document.get("source_stored_name"), ocr_result.get("text_stored_name")]
    for stored_name in stored_names:
        if stored_name and os.path.basename(stored_name) == stored_name:
            try:
                os.remove(os.path.join(OCR_UPLOADS_DIR, stored_name))
            except OSError:
                pass
    return {"message": "Document deleted."}


@router.get("/employees/me/documents/{document_id}/file")
def view_my_document(document_id: str, current_user: dict = Depends(require_employee)):
    document = _find_document(get_linked_employee(current_user), document_id)
    return _file_response(document)


@router.get("/employees/me/documents/{document_id}/download")
def download_my_document(document_id: str, current_user: dict = Depends(require_employee)):
    document = _find_document(get_linked_employee(current_user), document_id)
    return _file_response(document, download=True)


@router.get("/employees/{employee_id}/documents")
def get_employee_documents(employee_id: str, current_user: dict = Depends(require_admin)):
    employee = get_employee_by_id(employee_id)
    return [_public_document(item, include_ocr=True) for item in _employee_documents(employee)]


@router.get("/employees/{employee_id}/documents/{document_id}/file")
def view_employee_document(employee_id: str, document_id: str, current_user: dict = Depends(require_admin)):
    document = _find_document(get_employee_by_id(employee_id), document_id)
    return _file_response(document)


@router.get("/employees/{employee_id}/documents/{document_id}/download")
def download_employee_document(employee_id: str, document_id: str, current_user: dict = Depends(require_admin)):
    document = _find_document(get_employee_by_id(employee_id), document_id)
    return _file_response(document, download=True)


@router.post("/employees/{employee_id}/documents/{document_id}/ocr")
def process_employee_document_ocr(
    employee_id: str,
    document_id: str,
    current_user: dict = Depends(require_admin),
):
    employee = get_employee_by_id(employee_id)
    document = _find_document(employee, document_id)
    stored_name = document.get("source_stored_name")
    if not stored_name or os.path.basename(stored_name) != stored_name:
        raise HTTPException(status_code=404, detail="The uploaded document is unavailable.")
    file_path = os.path.join(OCR_UPLOADS_DIR, stored_name)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="The uploaded document is unavailable.")
    with open(file_path, "rb") as file:
        result = process_document(file.read(), document["filename"], "other")
    result["document_type"] = document.get("document_label", "Document")
    result["document_label"] = document.get("document_label", "Document")
    result["source_stored_name"] = stored_name
    text_name = f"{employee['_id']}_{document_id}_ocr.txt"
    with open(os.path.join(OCR_UPLOADS_DIR, text_name), "w", encoding="utf-8") as file:
        file.write(result["human_readable_text"])
    result["text_stored_name"] = text_name
    employees_collection.update_one(
        {"_id": employee["_id"], "documents.id": document_id},
        {"$set": {"documents.$.ocr_result": result}},
    )
    return result


@router.get("/employees/{employee_id}/documents/{document_id}/ocr/text")
def get_employee_document_ocr_text(
    employee_id: str,
    document_id: str,
    current_user: dict = Depends(require_admin),
):
    document = _find_document(get_employee_by_id(employee_id), document_id)
    result = document.get("ocr_result") or {}
    stored_name = result.get("text_stored_name")
    if not stored_name or os.path.basename(stored_name) != stored_name:
        raise HTTPException(status_code=404, detail="No OCR text file is available for this document.")
    file_path = os.path.join(OCR_UPLOADS_DIR, stored_name)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="No OCR text file is available for this document.")
    extracted_text = result.get("extracted_text") or result.get("human_readable_text", "")
    with open(file_path, "w", encoding="utf-8") as file:
        file.write(extracted_text)
    return FileResponse(
        file_path,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": "inline; filename=ocr-readable-text.txt"},
    )
