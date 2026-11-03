import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from auth import create_access_token, hash_password, require_admin
from database import (
    account_requests_collection,
    employee_invites_collection,
    employees_collection,
    users_collection,
)
from email_service import send_employee_invite_email
from employee_services import next_employee_id, normalize_email
from models import EmployeeCreate, EmployeeInviteComplete

load_dotenv()
router = APIRouter()


@router.post("/employees", status_code=status.HTTP_201_CREATED)
def create_employee_invitation(
    employee: EmployeeCreate,
    current_user: dict = Depends(require_admin),
):
    """Email an invite; create the employee after the invite is accepted."""
    email = normalize_email(str(employee.email))

    if employees_collection.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Employee email already exists")
    if users_collection.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    if account_requests_collection.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="An account request with this email is already pending")

    raw_token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    invite = {
        "email": email,
        "token_hash": hashlib.sha256(raw_token.encode("utf-8")).hexdigest(),
        "created_at": now,
        "expires_at": now + timedelta(hours=72),
        "created_by": str(current_user["_id"]),
    }
    invite_id = employee_invites_collection.insert_one(invite).inserted_id
    invite_url = (
        os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
        + "/accept-invite/"
        + raw_token
    )
    try:
        send_employee_invite_email(email, "there", invite_url)
    except HTTPException:
        employee_invites_collection.delete_one({"_id": invite_id})
        raise

    employee_invites_collection.update_many(
        {
            "email": email,
            "_id": {"$ne": invite_id},
            "claimed_at": {"$exists": False},
        },
        {"$set": {"revoked_at": now}},
    )
    return {
        "message": f"Invitation sent to {email}. The employee will appear in records after creating an account.",
        "invite_expires_at": invite["expires_at"].isoformat(),
    }


@router.get("/employee-invites/{token}")
def get_employee_invite(token: str):
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    invite = employee_invites_collection.find_one(
        {
            "token_hash": token_hash,
            "expires_at": {"$gt": datetime.now(timezone.utc)},
            "claimed_at": {"$exists": False},
            "revoked_at": {"$exists": False},
        }
    )
    if invite is None:
        raise HTTPException(
            status_code=410,
            detail="This invitation is invalid, expired, or has already been used.",
        )

    return {
        "name": "",
        "email": invite["email"],
        "department": "",
        "contact_number": "",
        "address": "",
        "expires_at": invite["expires_at"].isoformat(),
    }


@router.post("/employee-invites/{token}", status_code=status.HTTP_201_CREATED)
def complete_employee_invite(token: str, payload: EmployeeInviteComplete):
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    now = datetime.now(timezone.utc)
    invite = employee_invites_collection.find_one_and_update(
        {
            "token_hash": token_hash,
            "expires_at": {"$gt": now},
            "claimed_at": {"$exists": False},
            "revoked_at": {"$exists": False},
        },
        {"$set": {"claimed_at": now}},
        return_document=ReturnDocument.BEFORE,
    )
    if invite is None:
        raise HTTPException(
            status_code=410,
            detail="This invitation is invalid, expired, or has already been used.",
        )

    email = invite["email"]
    employee_id = None
    account_id = None
    try:
        if (
            employees_collection.find_one({"email": email})
            or users_collection.find_one({"email": email})
            or account_requests_collection.find_one({"email": email})
        ):
            raise HTTPException(status_code=409, detail="An account already exists for this invitation")

        employee_data = {
            "name": payload.name.strip(),
            "email": email,
            "department": payload.department.strip(),
            "contact_number": payload.contact_number.strip(),
            "address": payload.address.strip(),
            "employee_id": next_employee_id(),
        }
        if not employee_data["name"] or not employee_data["department"]:
            raise HTTPException(status_code=422, detail="Name and department are required")

        employee_result = employees_collection.insert_one(employee_data)
        employee_id = employee_result.inserted_id
        account_result = users_collection.insert_one(
            {
                "name": employee_data["name"],
                "email": email,
                "password": hash_password(payload.password),
                "role": "employee",
                "employee_id": str(employee_id),
                "status": "approved",
                "created_at": now,
            }
        )
        account_id = account_result.inserted_id
        account = users_collection.find_one({"_id": account_id})
        return {
            "access_token": create_access_token(account),
            "token_type": "bearer",
            "role": "employee",
            "name": employee_data["name"],
            "email": email,
            "profile_image": "",
            "must_change_password": False,
        }
    except DuplicateKeyError as error:
        if account_id is not None:
            users_collection.delete_one({"_id": account_id})
        if employee_id is not None:
            employees_collection.delete_one({"_id": employee_id})
        employee_invites_collection.update_one(
            {"_id": invite["_id"]},
            {"$unset": {"claimed_at": ""}},
        )
        raise HTTPException(status_code=409, detail="An account already exists for this invitation") from error
    except Exception:
        if account_id is not None:
            users_collection.delete_one({"_id": account_id})
        if employee_id is not None:
            employees_collection.delete_one({"_id": employee_id})
        employee_invites_collection.update_one(
            {"_id": invite["_id"]},
            {"$unset": {"claimed_at": ""}},
        )
        raise
