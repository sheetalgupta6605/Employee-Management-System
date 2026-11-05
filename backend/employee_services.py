import base64
import re
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import HTTPException
from pymongo import ReturnDocument

from auth import get_deactivated_until
from database import (
    account_requests_collection,
    db,
    employees_collection,
    users_collection,
)


def normalize_email(email: str) -> str:
    return email.strip().lower()


def validate_profile_image(file_data: str) -> str:
    match = re.fullmatch(
        r"data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/]*={0,2})",
        file_data,
    )
    if not match:
        raise HTTPException(
            status_code=400,
            detail="Upload a PNG, JPEG, or WebP profile image.",
        )

    image_type, encoded_image = match.groups()
    try:
        image_bytes = base64.b64decode(encoded_image, validate=True)
    except ValueError as error:
        raise HTTPException(status_code=400, detail="Invalid profile image data.") from error

    if not image_bytes or len(image_bytes) > 2 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="Profile image must be smaller than 2MB.",
        )

    signatures = {
        "png": image_bytes.startswith(b"\x89PNG\r\n\x1a\n"),
        "jpeg": image_bytes.startswith(b"\xff\xd8\xff"),
        "webp": len(image_bytes) >= 12 and image_bytes[:4] == b"RIFF" and image_bytes[8:12] == b"WEBP",
    }
    if not signatures[image_type]:
        raise HTTPException(status_code=400, detail="The selected file is not a valid image.")

    return file_data


def next_employee_id() -> str:
    counter = db["counters"].find_one_and_update(
        {"_id": "employee_id"},
        {"$inc": {"value": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return f"W-{counter['value']}"


_EMPLOYEE_NUMBER = re.compile(r"(?:W-|EMP-)?(\d+)$", re.IGNORECASE)


def _employee_number(employee: dict) -> int | None:
    match = _EMPLOYEE_NUMBER.fullmatch(str(employee.get("employee_id", "")).strip())
    return int(match.group(1)) if match else None


def _migrate_ticket_employee_references(employee: dict) -> None:
    old_id = str(employee.get("employee_id", "")).strip()
    stable_id = str(employee["_id"])
    if old_id and old_id != stable_id:
        db["tickets"].update_many(
            {"employee_id": old_id},
            {"$set": {"employee_id": stable_id}},
        )


def compact_employee_ids() -> None:
    """Keep employee IDs sequential and preserve stable ticket ownership links."""
    employees = list(employees_collection.find({}))
    employees.sort(
        key=lambda employee: (
            0 if _employee_number(employee) is not None else 1,
            _employee_number(employee) if _employee_number(employee) is not None else 0,
            str(employee["_id"]),
        )
    )
    for employee in employees:
        _migrate_ticket_employee_references(employee)

    # Temporary unique values avoid collisions while shifting IDs under the
    # existing unique employee_id index.
    for employee in employees:
        employees_collection.update_one(
            {"_id": employee["_id"]},
            {"$set": {"employee_id": f"__WID_TEMP__{employee['_id']}"}},
        )
    for number, employee in enumerate(employees, start=1):
        employees_collection.update_one(
            {"_id": employee["_id"]},
            {"$set": {"employee_id": f"W-{number}"}},
        )

    db["counters"].update_one(
        {"_id": "employee_id"},
        {"$set": {"value": len(employees)}},
        upsert=True,
    )


def initialize_employee_ids() -> None:
    """Migrate legacy employee IDs to compact W-number IDs during startup."""
    compact_employee_ids()


def migrate_legacy_account_requests() -> None:
    """Move old signup records out of the employee directory into the request queue."""
    legacy_accounts = users_collection.find(
        {
            "role": "employee",
            "status": "pending",
            "created_profile": True,
        }
    )
    for account in legacy_accounts:
        email = normalize_email(str(account.get("email", "")))
        if not email or not account.get("password"):
            continue

        employee_id = account.get("employee_id")
        employee = None
        if employee_id and ObjectId.is_valid(employee_id):
            employee = employees_collection.find_one({"_id": ObjectId(employee_id)})
        if employee is None:
            employee = employees_collection.find_one({"email": email})

        account_requests_collection.update_one(
            {"email": email},
            {
                "$setOnInsert": {
                    "name": employee.get("name", account.get("name", "Employee")) if employee else account.get("name", "Employee"),
                    "email": email,
                    "department": employee.get("department", "General") if employee else "General",
                    "password_hash": account["password"],
                    "created_at": account.get("created_at", datetime.now(timezone(timedelta(hours=5, minutes=30)))),
                }
            },
            upsert=True,
        )

        if employee is not None:
            employees_collection.delete_one({"_id": employee["_id"]})
        users_collection.delete_one({"_id": account["_id"], "status": "pending"})


def serialize_employee(employee: dict) -> dict:
    """Convert a MongoDB employee document into the frontend response shape."""
    employee["id"] = str(employee.pop("_id"))
    return employee


def get_linked_employee(current_user: dict) -> dict:
    """Find the employee record linked to a logged-in user account."""
    employee_id = current_user.get("employee_id")
    employee = None

    if employee_id and ObjectId.is_valid(employee_id):
        employee = employees_collection.find_one({"_id": ObjectId(employee_id)})

    if employee is None and current_user.get("email"):
        email = normalize_email(current_user["email"])
        employee = employees_collection.find_one({"email": email})
        if employee:
            users_collection.update_one(
                {"_id": current_user["_id"]},
                {"$set": {"employee_id": str(employee["_id"])}},
            )

    if employee is None:
        raise HTTPException(
            status_code=404,
            detail="Employee profile not found or not linked to this account",
        )

    return employee


def get_employee_by_id(employee_id: str) -> dict:
    """Fetch an employee by W-number employee ID or legacy MongoDB ID."""
    normalized_id = employee_id.strip().upper()
    match = _EMPLOYEE_NUMBER.fullmatch(normalized_id)
    if match:
        numeric_id = int(match.group(1))
        employee = employees_collection.find_one(
            {"employee_id": f"W-{numeric_id}"}
        )
    elif ObjectId.is_valid(employee_id):
        employee = employees_collection.find_one({"_id": ObjectId(employee_id)})
    else:
        raise HTTPException(status_code=400, detail="Invalid employee ID")

    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")

    return employee


def employee_account_info(employee: dict) -> dict:
    account = users_collection.find_one(
        {
            "role": "employee",
            "$or": [
                {"employee_id": str(employee["_id"])},
                {"email": normalize_email(str(employee["email"]))},
            ],
        },
        {"status": 1, "deactivated_until": 1},
    )
    if account is None:
        pending_request = account_requests_collection.find_one(
            {"email": normalize_email(str(employee["email"]))},
            {"_id": 1},
        )
        if pending_request is not None:
            return {"status": "pending", "deactivated_until": None}
        legacy_request = users_collection.find_one(
            {"email": normalize_email(str(employee["email"])), "status": "pending"},
            {"_id": 1},
        )
        return {
            "status": "pending" if legacy_request is not None else "no_account",
            "deactivated_until": None,
        }

    deactivated_until = get_deactivated_until(account)
    if deactivated_until and account.get("status", "approved") == "approved":
        return {
            "status": "deactivated",
            "deactivated_until": deactivated_until.isoformat(),
        }

    return {
        "status": account.get("status", "approved"),
        "deactivated_until": None,
    }
