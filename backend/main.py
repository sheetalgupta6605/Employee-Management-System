
import base64
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import os
import secrets

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

RESUMES_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "uploads", "resumes"
)
os.makedirs(RESUMES_DIR, exist_ok=True)


# -------------------- CONFIGURATION --------------------

FRONTEND_ORIGINS = os.getenv(
    "FRONTEND_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
)

allowed_origins = [
    origin.strip()
    for origin in FRONTEND_ORIGINS.split(",")
    if origin.strip()
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    client.admin.command("ping")
    print("MongoDB connected successfully!")
    init_db_indexes()
    yield


app = FastAPI(
    title="Employee Management System",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------- MODELS --------------------

class EmployeeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    department: str = Field(min_length=1, max_length=100)
    contact_number: str = ""
    address: str = ""
    # password: str = Field(min_length=8, max_length=128)


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
    file_data: str  # Base64 encoded PDF string



# -------------------- HELPERS --------------------

def normalize_email(email: str) -> str:
    return email.strip().lower()


def serialize_employee(employee: dict) -> dict:
    employee["id"] = str(employee.pop("_id"))
    return employee


def get_linked_employee(current_user: dict) -> dict:
    employee_id = current_user.get("employee_id")
    employee = None

    if employee_id and ObjectId.is_valid(employee_id):
        employee = employees_collection.find_one(
            {"_id": ObjectId(employee_id)}
        )

    # Fallback: if not linked by ID, lookup by normalized email
    if employee is None and current_user.get("email"):
        normalized_email = normalize_email(current_user["email"])
        employee = employees_collection.find_one({"email": normalized_email})
        if employee:
            # Auto-link employee_id to the user record for future requests
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


# -------------------- HOME / DATABASE --------------------

@app.get("/")
def home():
    return {"message": "Employee Management System API is running!"}


@app.get("/db-check")
def check_database():
    try:
        client.admin.command("ping")
        return {
            "message": "MongoDB connection successful!",
            "database": db.name,
        }
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Unable to connect to MongoDB",
        )


# -------------------- SIGNUP --------------------

@app.post("/auth/signup", status_code=status.HTTP_201_CREATED)
def signup(user: UserSignup):
    email = normalize_email(str(user.email))

    employee = employees_collection.find_one({"email": email})

    if employee is None:
        raise HTTPException(
            status_code=404,
            detail="Employee record not found. Contact the admin first.",
        )

    if users_collection.find_one({"email": email}):
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists",
        )

    new_user = {
        "name": user.name.strip(),
        "email": email,
        "password": hash_password(user.password),
        "role": "employee",
        "employee_id": str(employee["_id"]),
        "created_at": datetime.now(timezone.utc),
    }

    try:
        result = users_collection.insert_one(new_user)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists",
        )

    return {
        "message": "Employee account created successfully",
        "user_id": str(result.inserted_id),
    }


# -------------------- LOGIN --------------------

@app.post("/auth/login")
def login(user: UserLogin):
    email = normalize_email(str(user.email))
    account = users_collection.find_one({"email": email})

    # Handle missing password hashes without crashing the endpoint.
    if (
        account is None
        or not account.get("password")
        or not verify_password(user.password, account["password"])
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    role = account.get("role")

    if role not in ("admin", "employee"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has an invalid role",
        )

    token = create_access_token(account)

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": role,
        "name": account.get("name", ""),
        "email": account["email"],
    }


# -------------------- CURRENT ACCOUNT --------------------

@app.get("/auth/me")
def get_my_account(
    current_user: dict = Depends(get_current_user),
):
    return {
        "id": str(current_user["_id"]),
        "name": current_user.get("name", ""),
        "email": current_user["email"],
        "role": current_user["role"],
    }


# -------------------- EMPLOYEE SELF-SERVICE --------------------
# Keep these routes BEFORE /employees/{employee_id}.

@app.get("/employee/me")
@app.get("/employees/me")
def get_my_employee_profile(
    current_user: dict = Depends(require_employee),
):
    employee = get_linked_employee(current_user)
    return serialize_employee(employee)


@app.put("/employee/me")
@app.put("/employees/me")
def update_my_employee_profile(
    employee_data: EmployeeUpdate,
    current_user: dict = Depends(require_employee),
):
    employee = get_linked_employee(current_user)

    data = employee_data.model_dump()
    data["name"] = data["name"].strip()
    data["email"] = normalize_email(str(data["email"]))

    existing = employees_collection.find_one(
        {
            "email": data["email"],
            "_id": {"$ne": employee["_id"]},
        }
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Another employee already uses this email",
        )

    other_account = users_collection.find_one(
        {
            "email": data["email"],
            "_id": {"$ne": current_user["_id"]},
        }
    )

    if other_account:
        raise HTTPException(
            status_code=409,
            detail="Another account already uses this email",
        )

    employees_collection.update_one(
        {"_id": employee["_id"]},
        {"$set": data},
    )

    users_collection.update_one(
        {"_id": current_user["_id"]},
        {
            "$set": {
                "name": data["name"],
                "email": data["email"],
            }
        },
    )

    updated = employees_collection.find_one(
        {"_id": employee["_id"]}
    )
    return serialize_employee(updated)


@app.put("/employee/me/password")
@app.put("/employees/me/password")
def change_my_password(
    password_data: ChangePassword,
    current_user: dict = Depends(require_employee),
):
    stored_password = current_user.get("password")

    if (
        not stored_password
        or not verify_password(
            password_data.current_password,
            stored_password,
        )
    ):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect",
        )

    users_collection.update_one(
        {"_id": current_user["_id"]},
        {
            "$set": {
                "password": hash_password(password_data.new_password)
            }
        },
    )

    return {"message": "Password updated successfully"}


# -------------------- EMPLOYEE RESUME SELF-SERVICE --------------------

@app.post("/employee/me/resume")
@app.post("/employees/me/resume")
def upload_my_resume(
    payload: ResumeUpload,
    current_user: dict = Depends(require_employee),
):
    """Allow an employee to upload and attach their PDF resume."""
    employee = get_linked_employee(current_user)

    raw_b64 = payload.file_data
    if "," in raw_b64:
        raw_b64 = raw_b64.split(",", 1)[1]

    try:
        pdf_bytes = base64.b64decode(raw_b64)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid Base64 file format. Please upload a valid PDF.",
        )

    # Validate PDF magic bytes
    if not pdf_bytes.startswith(b"%PDF"):
        raise HTTPException(
            status_code=400,
            detail="File is not a valid PDF document. Please upload a .pdf file.",
        )

    # 5MB size limit
    if len(pdf_bytes) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="Resume file exceeds 5MB size limit.",
        )

    safe_name = f"resume_{employee['_id']}_{int(datetime.now(timezone.utc).timestamp())}.pdf"
    file_path = os.path.join(RESUMES_DIR, safe_name)

    # Remove previous stored resume file if exists
    old_filename = employee.get("resume_stored_name")
    if old_filename:
        old_path = os.path.join(RESUMES_DIR, old_filename)
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except OSError:
                pass

    with open(file_path, "wb") as f:
        f.write(pdf_bytes)

    resume_meta = {
        "resume_original_name": payload.filename,
        "resume_stored_name": safe_name,
        "resume_size_bytes": len(pdf_bytes),
        "resume_uploaded_at": datetime.now(timezone.utc).isoformat(),
    }

    employees_collection.update_one(
        {"_id": employee["_id"]},
        {"$set": resume_meta},
    )

    return {
        "message": "Resume uploaded successfully",
        **resume_meta,
    }


@app.get("/employee/me/resume")
@app.get("/employees/me/resume")
def get_my_resume(
    current_user: dict = Depends(require_employee),
):
    """Allow an employee to download their uploaded resume."""
    employee = get_linked_employee(current_user)
    stored_name = employee.get("resume_stored_name")

    if not stored_name:
        raise HTTPException(
            status_code=404,
            detail="No resume has been uploaded yet.",
        )

    file_path = os.path.join(RESUMES_DIR, stored_name)
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404,
            detail="Resume file not found on server.",
        )

    original_name = employee.get("resume_original_name", "Resume.pdf")
    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=original_name,
    )


@app.delete("/employee/me/resume")
@app.delete("/employees/me/resume")
def delete_my_resume(
    current_user: dict = Depends(require_employee),
):
    """Allow an employee to delete their uploaded resume."""
    employee = get_linked_employee(current_user)
    stored_name = employee.get("resume_stored_name")

    if stored_name:
        file_path = os.path.join(RESUMES_DIR, stored_name)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass

    employees_collection.update_one(
        {"_id": employee["_id"]},
        {
            "$unset": {
                "resume_original_name": "",
                "resume_stored_name": "",
                "resume_size_bytes": "",
                "resume_uploaded_at": "",
            }
        },
    )

    return {"message": "Resume deleted successfully"}




# -------------------- CREATE EMPLOYEE (ADMIN) --------------------

@app.post("/employees", status_code=status.HTTP_201_CREATED)
def create_employee(
    employee: EmployeeCreate,
    current_user: dict = Depends(require_admin),
):
    data = employee.model_dump()
    temporary_password = secrets.token_urlsafe(12)

    data["name"] = data["name"].strip()
    data["email"] = normalize_email(str(data["email"]))

    if employees_collection.find_one({"email": data["email"]}):
        raise HTTPException(
            status_code=409,
            detail="Employee email already exists",
        )

    if users_collection.find_one({"email": data["email"]}):
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists",
        )

    employee_id = None
    user_id = None

    try:
        employee_result = employees_collection.insert_one(data)
        employee_id = employee_result.inserted_id

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
        if user_id is not None:
            users_collection.delete_one({"_id": user_id})
        if employee_id is not None:
            employees_collection.delete_one({"_id": employee_id})

        raise HTTPException(
            status_code=409,
            detail="An account or employee with this email already exists",
        )

    except Exception:
        if user_id is not None:
            users_collection.delete_one({"_id": user_id})
        if employee_id is not None:
            employees_collection.delete_one({"_id": employee_id})
        raise

    saved_employee = employees_collection.find_one({"_id": employee_id})
    response = serialize_employee(saved_employee)
    response["temporary_password"] = temporary_password

    return response


# -------------------- VIEW ALL EMPLOYEES (ADMIN) --------------------

@app.get("/employees")
def get_all_employees(
    current_user: dict = Depends(require_admin),
):
    return [
        serialize_employee(employee)
        for employee in employees_collection.find()
    ]


# -------------------- VIEW ONE EMPLOYEE (ADMIN) --------------------

@app.get("/employees/{employee_id}")
def get_employee(
    employee_id: str,
    current_user: dict = Depends(require_admin),
):
    if not ObjectId.is_valid(employee_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid employee ID",
        )

    employee = employees_collection.find_one(
        {"_id": ObjectId(employee_id)}
    )

    if employee is None:
        raise HTTPException(
            status_code=404,
            detail="Employee not found",
        )

    return serialize_employee(employee)


# -------------------- UPDATE EMPLOYEE (ADMIN) --------------------

@app.put("/employees/{employee_id}")
def update_employee(
    employee_id: str,
    employee: EmployeeUpdate,
    current_user: dict = Depends(require_admin),
):
    if not ObjectId.is_valid(employee_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid employee ID",
        )

    object_id = ObjectId(employee_id)
    existing_employee = employees_collection.find_one(
        {"_id": object_id}
    )

    if existing_employee is None:
        raise HTTPException(
            status_code=404,
            detail="Employee not found",
        )

    data = employee.model_dump()
    data["name"] = data["name"].strip()
    data["email"] = normalize_email(str(data["email"]))

    duplicate_employee = employees_collection.find_one(
        {
            "email": data["email"],
            "_id": {"$ne": object_id},
        }
    )

    if duplicate_employee:
        raise HTTPException(
            status_code=409,
            detail="Another employee already uses this email",
        )

    linked_account = users_collection.find_one(
        {"employee_id": str(object_id)}
    )

    duplicate_account = users_collection.find_one(
        {
            "email": data["email"],
            "_id": {"$ne": linked_account["_id"] if linked_account else None},
        }
    )

    if duplicate_account:
        raise HTTPException(
            status_code=409,
            detail="Another account already uses this email",
        )

    employees_collection.update_one(
        {"_id": object_id},
        {"$set": data},
    )

    if linked_account:
        users_collection.update_one(
            {"_id": linked_account["_id"]},
            {
                "$set": {
                    "name": data["name"],
                    "email": data["email"],
                }
            },
        )

    updated_employee = employees_collection.find_one(
        {"_id": object_id}
    )
    return serialize_employee(updated_employee)


# -------------------- DELETE EMPLOYEE (ADMIN) --------------------

@app.delete("/employees/{employee_id}")
def delete_employee(
    employee_id: str,
    current_user: dict = Depends(require_admin),
):
    if not ObjectId.is_valid(employee_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid employee ID",
        )

    object_id = ObjectId(employee_id)
    employee = employees_collection.find_one(
        {"_id": object_id}
    )

    if employee is None:
        raise HTTPException(
            status_code=404,
            detail="Employee not found",
        )

    # Remove stored resume file on disk if exists
    stored_resume = employee.get("resume_stored_name")
    if stored_resume:
        resume_path = os.path.join(RESUMES_DIR, stored_resume)
        if os.path.exists(resume_path):
            try:
                os.remove(resume_path)
            except OSError:
                pass

    # Remove the linked login account, if one exists.
    users_collection.delete_many(
        {"employee_id": str(object_id)}
    )

    employees_collection.delete_one(
        {"_id": object_id}
    )

    return {"message": "Employee and linked login account deleted successfully"}


@app.get("/employees/{employee_id}/resume")
def get_employee_resume_admin(
    employee_id: str,
    current_user: dict = Depends(require_admin),
):
    """Allow an admin to view/download an employee's PDF resume."""
    if not ObjectId.is_valid(employee_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid employee ID",
        )

    employee = employees_collection.find_one({"_id": ObjectId(employee_id)})
    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found",
        )

    stored_name = employee.get("resume_stored_name")
    if not stored_name:
        raise HTTPException(
            status_code=404,
            detail="This employee has not uploaded a resume yet.",
        )

    file_path = os.path.join(RESUMES_DIR, stored_name)
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404,
            detail="Resume file not found on server.",
        )

    original_name = employee.get("resume_original_name", f"{employee.get('name', 'Employee')}_Resume.pdf")
    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=original_name,
    )



# -------------------- SET / RESET EMPLOYEE PASSWORD (ADMIN) --------------------

@app.post("/employees/{employee_id}/account")
@app.put("/employees/{employee_id}/account")
def set_employee_account_password(
    employee_id: str,
    payload: SetPassword,
    current_user: dict = Depends(require_admin),
):
    """Allow an admin to set or reset login credentials for an employee."""
    if not ObjectId.is_valid(employee_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid employee ID",
        )

    object_id = ObjectId(employee_id)
    employee = employees_collection.find_one({"_id": object_id})

    if employee is None:
        raise HTTPException(
            status_code=404,
            detail="Employee not found",
        )

    normalized_email = normalize_email(employee["email"])
    hashed_password = hash_password(payload.password)

    # Find existing linked user account by employee_id or email
    user_account = users_collection.find_one(
        {
            "$or": [
                {"employee_id": str(object_id)},
                {"email": normalized_email},
            ]
        }
    )

    if user_account:
        users_collection.update_one(
            {"_id": user_account["_id"]},
            {
                "$set": {
                    "password": hashed_password,
                    "name": employee.get("name", user_account.get("name", "")),
                    "email": normalized_email,
                    "role": "employee",
                    "employee_id": str(object_id),
                }
            },
        )
    else:
        new_account = {
            "name": employee.get("name", ""),
            "email": normalized_email,
            "password": hashed_password,
            "role": "employee",
            "employee_id": str(object_id),
            "created_at": datetime.now(timezone.utc),
        }
        users_collection.insert_one(new_account)

    return {
        "message": f"Login password for {employee.get('name', 'employee')} has been updated successfully"
    }

