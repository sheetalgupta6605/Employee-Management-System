import base64
import os
import secrets
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from bson import ObjectId
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr, Field
from pymongo.errors import DuplicateKeyError

from database import client, db, users_collection, employees_collection, init_db_indexes
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_admin,
    require_employee,
)

load_dotenv()

# Folder where employee resume PDFs are stored on the server
RESUMES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads", "resumes")
os.makedirs(RESUMES_DIR, exist_ok=True)

# Allowed frontend URLs for CORS (browser security policy)
FRONTEND_ORIGINS = os.getenv(
    "FRONTEND_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
)
allowed_origins = [origin.strip() for origin in FRONTEND_ORIGINS.split(",") if origin.strip()]


# ==================== STARTUP ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # This runs when the server starts.
    # We try to ping MongoDB, but we do NOT crash if it fails.
    try:
        client.admin.command("ping")
        print("MongoDB connected successfully!")
        init_db_indexes()
    except Exception as e:
        print(f"[Warning] Could not connect to MongoDB at startup: {e}")
        print("Server will still start. Check your MONGO_URL and your MongoDB Atlas IP whitelist.")
    yield  # Server runs here. Code after yield would run on shutdown.


# ==================== APP SETUP ====================

app = FastAPI(title="Employee Management System", lifespan=lifespan)

# Allow the React frontend (different port) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== REQUEST MODELS ====================
# These classes define what data each API endpoint expects from the frontend.

class EmployeeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    department: str = Field(min_length=1, max_length=100)
    contact_number: str = ""
    address: str = ""


class EmployeeUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    department: str = Field(min_length=1, max_length=100)
    contact_number: str = ""
    address: str = ""


class UserSignup(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class SetPassword(BaseModel):
    password: str = Field(min_length=8, max_length=128)


class ChangePassword(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class ResumeUpload(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    file_data: str  # PDF file sent as a Base64 encoded string


# ==================== HELPER FUNCTIONS ====================

def normalize_email(email: str) -> str:
    """Convert email to lowercase and remove spaces to avoid duplicates."""
    return email.strip().lower()


def serialize_employee(employee: dict) -> dict:
    """
    MongoDB stores IDs as ObjectId. The frontend expects a plain string 'id'.
    This function converts _id -> id.
    """
    employee["id"] = str(employee.pop("_id"))
    return employee


def get_linked_employee(current_user: dict) -> dict:
    """
    Find the employee record linked to a logged-in user account.
    First tries to find by employee_id, then falls back to matching by email.
    """
    employee_id = current_user.get("employee_id")
    employee = None

    # Try finding by stored employee_id
    if employee_id and ObjectId.is_valid(employee_id):
        employee = employees_collection.find_one({"_id": ObjectId(employee_id)})

    # Fallback: find by email if employee_id lookup failed
    if employee is None and current_user.get("email"):
        email = normalize_email(current_user["email"])
        employee = employees_collection.find_one({"email": email})
        if employee:
            # Save the link for faster future lookups
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
    """Validate and fetch an employee by ID. Raises 400 or 404 if not found."""
    if not ObjectId.is_valid(employee_id):
        raise HTTPException(status_code=400, detail="Invalid employee ID")

    employee = employees_collection.find_one({"_id": ObjectId(employee_id)})
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")

    return employee


# ==================== HOME ====================

@app.get("/")
def home():
    return {"message": "Employee Management System API is running!"}


@app.get("/db-check")
def check_database():
    """Quick check to confirm MongoDB is reachable."""
    try:
        client.admin.command("ping")
        return {"message": "MongoDB connection successful!", "database": db.name}
    except Exception:
        raise HTTPException(status_code=503, detail="Unable to connect to MongoDB")


# ==================== AUTH: SIGNUP ====================

@app.post("/auth/signup", status_code=status.HTTP_201_CREATED)
def signup(user: UserSignup):
    """
    An employee can create their own login account here.
    Their email must already exist in the employees list (added by admin first).
    """
    email = normalize_email(str(user.email))

    # Check the employee record exists
    employee = employees_collection.find_one({"email": email})
    if employee is None:
        raise HTTPException(
            status_code=404,
            detail="Employee record not found. Ask your admin to add you first.",
        )

    # Check they don't already have an account
    if users_collection.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    new_user = {
        "name": user.name.strip(),
        "email": email,
        "password": hash_password(user.password),  # Password is hashed, never stored as plain text
        "role": "employee",
        "employee_id": str(employee["_id"]),
        "created_at": datetime.now(timezone.utc),
    }

    try:
        result = users_collection.insert_one(new_user)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    return {"message": "Employee account created successfully", "user_id": str(result.inserted_id)}


# ==================== AUTH: LOGIN ====================

@app.post("/auth/login")
def login(user: UserLogin):
    """
    Login with email and password.
    Returns a JWT token that the frontend stores and uses for future requests.
    """
    email = normalize_email(str(user.email))
    account = users_collection.find_one({"email": email})

    # If account not found OR password doesn't match, return the same error
    # (We don't tell attackers whether the email or password was wrong)
    if not account or not account.get("password") or not verify_password(user.password, account["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    role = account.get("role")
    if role not in ("admin", "employee"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account has an invalid role")

    token = create_access_token(account)

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": role,
        "name": account.get("name", ""),
        "email": account["email"],
    }


# ==================== AUTH: CURRENT USER ====================

@app.get("/auth/me")
def get_my_account(current_user: dict = Depends(get_current_user)):
    """Returns the currently logged-in user's basic account info."""
    return {
        "id": str(current_user["_id"]),
        "name": current_user.get("name", ""),
        "email": current_user["email"],
        "role": current_user["role"],
    }


# ==================== EMPLOYEE: VIEW & EDIT OWN PROFILE ====================
# NOTE: These routes must come BEFORE /employees/{employee_id} to avoid conflicts.

@app.get("/employees/me")
def get_my_employee_profile(current_user: dict = Depends(require_employee)):
    """An employee can view their own profile."""
    employee = get_linked_employee(current_user)
    return serialize_employee(employee)


@app.put("/employees/me")
def update_my_employee_profile(
    employee_data: EmployeeUpdate,
    current_user: dict = Depends(require_employee),
):
    """An employee can update their own profile details."""
    employee = get_linked_employee(current_user)

    data = employee_data.model_dump()
    data["name"] = data["name"].strip()
    data["email"] = normalize_email(str(data["email"]))

    # Make sure nobody else is already using this email
    if employees_collection.find_one({"email": data["email"], "_id": {"$ne": employee["_id"]}}):
        raise HTTPException(status_code=409, detail="Another employee already uses this email")

    if users_collection.find_one({"email": data["email"], "_id": {"$ne": current_user["_id"]}}):
        raise HTTPException(status_code=409, detail="Another account already uses this email")

    # Update both the employee record and the linked login account
    employees_collection.update_one({"_id": employee["_id"]}, {"$set": data})
    users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"name": data["name"], "email": data["email"]}},
    )

    updated = employees_collection.find_one({"_id": employee["_id"]})
    return serialize_employee(updated)


# ==================== EMPLOYEE: CHANGE PASSWORD ====================

@app.put("/employees/me/password")
def change_my_password(
    password_data: ChangePassword,
    current_user: dict = Depends(require_employee),
):
    """An employee can change their own login password."""
    stored_password = current_user.get("password")

    # Verify the current password before allowing the change
    if not stored_password or not verify_password(password_data.current_password, stored_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"password": hash_password(password_data.new_password)}},
    )

    return {"message": "Password updated successfully"}


# ==================== EMPLOYEE: RESUME UPLOAD / DOWNLOAD / DELETE ====================

@app.post("/employees/me/resume")
def upload_my_resume(
    payload: ResumeUpload,
    current_user: dict = Depends(require_employee),
):
    """An employee can upload their PDF resume."""
    employee = get_linked_employee(current_user)

    # The frontend sends the file as a Base64 string (sometimes with a data URL prefix like "data:application/pdf;base64,...")
    raw_b64 = payload.file_data
    if "," in raw_b64:
        raw_b64 = raw_b64.split(",", 1)[1]  # Strip the "data:...;base64," prefix

    # Decode Base64 back to binary bytes
    try:
        pdf_bytes = base64.b64decode(raw_b64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Base64 file format. Please upload a valid PDF.")

    # Check it's actually a PDF (PDFs start with the magic bytes "%PDF")
    if not pdf_bytes.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="File is not a valid PDF document.")

    # Reject files larger than 5MB
    if len(pdf_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Resume file exceeds the 5MB size limit.")

    # Create a safe, unique filename using the employee's ID and current timestamp
    safe_name = f"resume_{employee['_id']}_{int(datetime.now(timezone.utc).timestamp())}.pdf"
    file_path = os.path.join(RESUMES_DIR, safe_name)

    # Delete the old resume file from disk if one already exists
    old_filename = employee.get("resume_stored_name")
    if old_filename:
        old_path = os.path.join(RESUMES_DIR, old_filename)
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except OSError:
                pass  # If deletion fails, just continue

    # Save the new file to disk
    with open(file_path, "wb") as f:
        f.write(pdf_bytes)

    # Save resume metadata to MongoDB
    resume_meta = {
        "resume_original_name": payload.filename,
        "resume_stored_name": safe_name,
        "resume_size_bytes": len(pdf_bytes),
        "resume_uploaded_at": datetime.now(timezone.utc).isoformat(),
    }
    employees_collection.update_one({"_id": employee["_id"]}, {"$set": resume_meta})

    return {"message": "Resume uploaded successfully", **resume_meta}


@app.get("/employees/me/resume")
def get_my_resume(current_user: dict = Depends(require_employee)):
    """An employee can download their uploaded resume."""
    employee = get_linked_employee(current_user)
    stored_name = employee.get("resume_stored_name")

    if not stored_name:
        raise HTTPException(status_code=404, detail="No resume has been uploaded yet.")

    file_path = os.path.join(RESUMES_DIR, stored_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Resume file not found on server.")

    original_name = employee.get("resume_original_name", "Resume.pdf")
    return FileResponse(file_path, media_type="application/pdf", filename=original_name)


@app.delete("/employees/me/resume")
def delete_my_resume(current_user: dict = Depends(require_employee)):
    """An employee can delete their uploaded resume."""
    employee = get_linked_employee(current_user)
    stored_name = employee.get("resume_stored_name")

    # Delete the file from disk
    if stored_name:
        file_path = os.path.join(RESUMES_DIR, stored_name)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass

    # Remove the resume metadata fields from MongoDB
    employees_collection.update_one(
        {"_id": employee["_id"]},
        {"$unset": {
            "resume_original_name": "",
            "resume_stored_name": "",
            "resume_size_bytes": "",
            "resume_uploaded_at": "",
        }},
    )

    return {"message": "Resume deleted successfully"}


# ==================== ADMIN: CREATE EMPLOYEE ====================

@app.post("/employees", status_code=status.HTTP_201_CREATED)
def create_employee(
    employee: EmployeeCreate,
    current_user: dict = Depends(require_admin),
):
    """
    Admin creates a new employee record.
    A login account is automatically created with a temporary password.
    """
    data = employee.model_dump()
    data["name"] = data["name"].strip()
    data["email"] = normalize_email(str(data["email"]))

    # Check for duplicate email
    if employees_collection.find_one({"email": data["email"]}):
        raise HTTPException(status_code=409, detail="Employee email already exists")
    if users_collection.find_one({"email": data["email"]}):
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    # Generate a secure random temporary password
    temporary_password = secrets.token_urlsafe(12)

    employee_id = None
    user_id = None

    try:
        # Step 1: Insert the employee record
        employee_result = employees_collection.insert_one(data)
        employee_id = employee_result.inserted_id

        # Step 2: Create a login account linked to this employee
        account = {
            "name": data["name"],
            "email": data["email"],
            "password": hash_password(temporary_password),
            "role": "employee",
            "employee_id": str(employee_id),
            "created_at": datetime.now(timezone.utc),
        }
        user_result = users_collection.insert_one(account)
        user_id = user_result.inserted_id

    except DuplicateKeyError:
        # Rollback: if account creation fails, remove the employee record too
        if user_id:
            users_collection.delete_one({"_id": user_id})
        if employee_id:
            employees_collection.delete_one({"_id": employee_id})
        raise HTTPException(status_code=409, detail="An account or employee with this email already exists")

    except Exception:
        # Rollback on any other error
        if user_id:
            users_collection.delete_one({"_id": user_id})
        if employee_id:
            employees_collection.delete_one({"_id": employee_id})
        raise

    saved_employee = employees_collection.find_one({"_id": employee_id})
    response = serialize_employee(saved_employee)
    response["temporary_password"] = temporary_password  # Admin needs to share this with the employee

    return response


# ==================== ADMIN: LIST ALL EMPLOYEES ====================

@app.get("/employees")
def get_all_employees(current_user: dict = Depends(require_admin)):
    """Admin can view the full list of all employees."""
    return [serialize_employee(emp) for emp in employees_collection.find()]


# ==================== ADMIN: VIEW ONE EMPLOYEE ====================

@app.get("/employees/{employee_id}")
def get_employee(employee_id: str, current_user: dict = Depends(require_admin)):
    """Admin can view a specific employee's details."""
    employee = get_employee_by_id(employee_id)
    return serialize_employee(employee)


# ==================== ADMIN: UPDATE EMPLOYEE ====================

@app.put("/employees/{employee_id}")
def update_employee(
    employee_id: str,
    employee: EmployeeUpdate,
    current_user: dict = Depends(require_admin),
):
    """Admin can update any employee's details."""
    object_id = ObjectId(employee_id)
    get_employee_by_id(employee_id)  # Validates the ID and that the employee exists

    data = employee.model_dump()
    data["name"] = data["name"].strip()
    data["email"] = normalize_email(str(data["email"]))

    # Check email is not already taken by another employee
    if employees_collection.find_one({"email": data["email"], "_id": {"$ne": object_id}}):
        raise HTTPException(status_code=409, detail="Another employee already uses this email")

    # Find the linked login account for this employee
    linked_account = users_collection.find_one({"employee_id": str(object_id)})

    # Check the email is not taken by another user account
    exclude_id = linked_account["_id"] if linked_account else None
    if users_collection.find_one({"email": data["email"], "_id": {"$ne": exclude_id}}):
        raise HTTPException(status_code=409, detail="Another account already uses this email")

    # Update the employee record
    employees_collection.update_one({"_id": object_id}, {"$set": data})

    # Also update the linked login account's name and email to stay in sync
    if linked_account:
        users_collection.update_one(
            {"_id": linked_account["_id"]},
            {"$set": {"name": data["name"], "email": data["email"]}},
        )

    updated = employees_collection.find_one({"_id": object_id})
    return serialize_employee(updated)


# ==================== ADMIN: DELETE EMPLOYEE ====================

@app.delete("/employees/{employee_id}")
def delete_employee(employee_id: str, current_user: dict = Depends(require_admin)):
    """
    Admin deletes an employee.
    This also deletes their login account and resume file from disk.
    """
    object_id = ObjectId(employee_id)
    employee = get_employee_by_id(employee_id)

    # Delete the resume file from disk if it exists
    stored_resume = employee.get("resume_stored_name")
    if stored_resume:
        resume_path = os.path.join(RESUMES_DIR, stored_resume)
        if os.path.exists(resume_path):
            try:
                os.remove(resume_path)
            except OSError:
                pass

    # Delete the linked login account
    users_collection.delete_many({"employee_id": str(object_id)})

    # Delete the employee record
    employees_collection.delete_one({"_id": object_id})

    return {"message": "Employee and linked login account deleted successfully"}


# ==================== ADMIN: VIEW EMPLOYEE RESUME ====================

@app.get("/employees/{employee_id}/resume")
def get_employee_resume_admin(employee_id: str, current_user: dict = Depends(require_admin)):
    """Admin can view/download any employee's resume."""
    employee = get_employee_by_id(employee_id)

    stored_name = employee.get("resume_stored_name")
    if not stored_name:
        raise HTTPException(status_code=404, detail="This employee has not uploaded a resume yet.")

    file_path = os.path.join(RESUMES_DIR, stored_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Resume file not found on server.")

    original_name = employee.get("resume_original_name", f"{employee.get('name', 'Employee')}_Resume.pdf")
    return FileResponse(file_path, media_type="application/pdf", filename=original_name)


# ==================== ADMIN: SET / RESET EMPLOYEE PASSWORD ====================

@app.post("/employees/{employee_id}/account")
@app.put("/employees/{employee_id}/account")
def set_employee_account_password(
    employee_id: str,
    payload: SetPassword,
    current_user: dict = Depends(require_admin),
):
    """Admin can set or reset the login password for any employee."""
    object_id = ObjectId(employee_id)
    employee = get_employee_by_id(employee_id)

    normalized_email = normalize_email(employee["email"])
    hashed_password = hash_password(payload.password)

    # Find the existing login account by employee_id or email
    user_account = users_collection.find_one({
        "$or": [
            {"employee_id": str(object_id)},
            {"email": normalized_email},
        ]
    })

    if user_account:
        # Update the existing account's password
        users_collection.update_one(
            {"_id": user_account["_id"]},
            {"$set": {
                "password": hashed_password,
                "name": employee.get("name", user_account.get("name", "")),
                "email": normalized_email,
                "role": "employee",
                "employee_id": str(object_id),
            }},
        )
    else:
        # No account exists yet — create one
        users_collection.insert_one({
            "name": employee.get("name", ""),
            "email": normalized_email,
            "password": hashed_password,
            "role": "employee",
            "employee_id": str(object_id),
            "created_at": datetime.now(timezone.utc),
        })

    return {"message": f"Password for {employee.get('name', 'employee')} has been updated successfully"}
