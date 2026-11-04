from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from auth import (
    create_access_token,
    get_current_user,
    get_deactivated_until,
    hash_password,
    require_admin,
    verify_password,
)
from database import account_requests_collection, users_collection
from employee_services import normalize_email, validate_profile_image
from models import ProfilePhotoUpload, UserLogin, UserSignup

router = APIRouter()


@router.post("/auth/signup", status_code=status.HTTP_201_CREATED)
def signup(user: UserSignup):
    """Save an account request for administrator review."""
    email = normalize_email(str(user.email))

    if users_collection.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="An account or request with this email already exists")
    if account_requests_collection.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="An account request with this email is already pending")

    request = {
        "name": user.name.strip(),
        "email": email,
        "department": user.department.strip(),
        "password_hash": hash_password(user.password),
        "created_at": datetime.now(timezone(timedelta(hours=5, minutes=30))),
    }

    try:
        result = account_requests_collection.insert_one(request)
    except DuplicateKeyError as error:
        raise HTTPException(
            status_code=409,
            detail="An account request with this email is already pending",
        ) from error

    return {
        "message": "Your account request was sent to the administrator for approval.",
        "status": "pending",
        "request_id": str(result.inserted_id),
    }


@router.post("/auth/login")
def login(user: UserLogin):
    """Authenticate and return a bearer token for the frontend."""
    email = normalize_email(str(user.email))
    account = users_collection.find_one({"email": email})

    if account is None and account_requests_collection.find_one({"email": email}):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account request is waiting for administrator approval.",
        )

    if not account or not account.get("password") or not verify_password(user.password, account["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    role = str(account.get("role", "")).strip().lower()
    if role not in ("admin", "employee"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account has an invalid role")

    if account.get("role") != role:
        users_collection.update_one(
            {"_id": account["_id"]},
            {"$set": {"role": role}},
        )
        account["role"] = role

    if role == "employee" and account.get("status", "approved") != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account request is waiting for administrator approval.",
        )
    if role == "employee" and get_deactivated_until(account):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is temporarily deactivated. Contact your administrator.",
        )

    return {
        "access_token": create_access_token(account),
        "token_type": "bearer",
        "role": role,
        "name": account.get("name", ""),
        "email": account["email"],
        "profile_image": account.get("profile_image", ""),
        "must_change_password": bool(account.get("must_change_password")),
    }


@router.get("/auth/me")
def get_my_account(current_user: dict = Depends(get_current_user)):
    return {
        "id": str(current_user["_id"]),
        "name": current_user.get("name", ""),
        "email": current_user["email"],
        "role": current_user["role"],
        "profile_image": current_user.get("profile_image", ""),
        "must_change_password": bool(current_user.get("must_change_password")),
    }


@router.put("/auth/me/photo")
def update_my_account_photo(
    payload: ProfilePhotoUpload,
    current_user: dict = Depends(require_admin),
):
    profile_image = validate_profile_image(payload.file_data)
    users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"profile_image": profile_image}},
    )
    return {"profile_image": profile_image}


@router.delete("/auth/me/photo")
def delete_my_account_photo(current_user: dict = Depends(require_admin)):
    users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$unset": {"profile_image": ""}},
    )
    return {"message": "Profile photo removed."}
