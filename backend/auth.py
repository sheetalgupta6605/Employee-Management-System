
import os
from datetime import datetime, timedelta, timezone

import jwt
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import FastAPI , Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pwdlib import PasswordHash

from database import users_collection

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET")



if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is missing from .env")

JWT_ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60

password_hash = PasswordHash.recommended()

bearer_scheme = HTTPBearer(
    auto_error=False
)


def hash_password(password: str) -> str:
    """Convert a plain-text password into a secure hash."""
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    """Check a password against its stored hash."""
    return password_hash.verify(password, hashed_password)


def get_deactivated_until(user: dict) -> datetime | None:
    """Return a future deactivation deadline, normalizing MongoDB's naive ist dates."""
    deactivated_until = user.get("deactivated_until")
    if not isinstance(deactivated_until, datetime):
        return None

    if deactivated_until.tzinfo is None:
        deactivated_until = deactivated_until.replace(tzinfo=timezone(timedelta(hours=5, minutes=30)))

    if deactivated_until <= datetime.now(timezone(timedelta(hours=5, minutes=30))):
        return None

    return deactivated_until


def create_access_token(user: dict) -> str:
    """Create a signed login token."""
    payload = {
        "sub": str(user["_id"]),
        "role": user["role"],
        "exp": datetime.now(timezone(timedelta(hours=5, minutes=30)))
        + timedelta(minutes=TOKEN_EXPIRE_MINUTES),
    }

    return jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(
        bearer_scheme
    ),
) -> dict:
    """Identify the user making a protected API request."""

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token is missing",
        )

    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
        )
        user_id = payload.get("sub")

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired login token",
        )

    if not user_id or not ObjectId.is_valid(user_id):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token",
        )

    user = users_collection.find_one(
        {"_id": ObjectId(user_id)}
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found",
        )

    # Compare legacy role values consistently (for example, "Admin").
    user["role"] = str(user.get("role", "")).strip().lower()
    if user["role"] == "employee" and get_deactivated_until(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is temporarily deactivated. Contact your administrator.",
        )
    if (
        user["role"] == "employee"
        and user.get("must_change_password")
        and request.url.path not in {"/auth/me", "/employees/me/password"}
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Change your temporary password before using your account.",
        )

    return user


def require_admin(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Allow only admins to access admin-protected endpoints."""

    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    return current_user


def require_employee(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Allow only employees to access employee-only endpoints."""

    if current_user.get("role") != "employee":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employee access required",
        )

    return current_user
