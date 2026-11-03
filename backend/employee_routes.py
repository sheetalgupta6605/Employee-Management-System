import base64
import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from auth import hash_password, require_admin, require_employee, verify_password
from database import (
    account_requests_collection,
    employees_collection,
    users_collection,
)
from employee_services import (
    employee_account_info,
    get_employee_by_id,
    get_linked_employee,
    normalize_email,
    serialize_employee,
    validate_profile_image,
)
from models import (
    ChangePassword,
    DeactivateEmployee,
    EmployeeUpdate,
    ProfilePhotoUpload,
    ResumeUpload,
    SetPassword,
)
from settings import RESUMES_DIR

router = APIRouter()


@router.get("/employees/me")
def get_my_employee_profile(current_user: dict = Depends(require_employee)):
    return serialize_employee(get_linked_employee(current_user))


@router.put("/employees/me")
def update_my_employee_profile(
    employee_data: EmployeeUpdate,
    current_user: dict = Depends(require_employee),
):
    employee = get_linked_employee(current_user)

    data = employee_data.model_dump()
    data["name"] = data["name"].strip()
    data["email"] = normalize_email(str(data["email"]))

    if employees_collection.find_one({"email": data["email"], "_id": {"$ne": employee["_id"]}}):
        raise HTTPException(status_code=409, detail="Another employee already uses this email")

    if users_collection.find_one({"email": data["email"], "_id": {"$ne": current_user["_id"]}}):
        raise HTTPException(status_code=409, detail="Another account already uses this email")

    employees_collection.update_one({"_id": employee["_id"]}, {"$set": data})
    users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"name": data["name"], "email": data["email"]}},
    )

    return serialize_employee(employees_collection.find_one({"_id": employee["_id"]}))


@router.put("/employees/me/password")
def change_my_password(
    password_data: ChangePassword,
    current_user: dict = Depends(require_employee),
):
    stored_password = current_user.get("password")
    if not stored_password or not verify_password(password_data.current_password, stored_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    users_collection.update_one(
        {"_id": current_user["_id"]},
        {
            "$set": {"password": hash_password(password_data.new_password)},
            "$unset": {"must_change_password": ""},
        },
    )
    return {"message": "Password updated successfully"}


@router.post("/employees/me/resume")
def upload_my_resume(
    payload: ResumeUpload,
    current_user: dict = Depends(require_employee),
):
    employee = get_linked_employee(current_user)
    raw_b64 = payload.file_data
    if "," in raw_b64:
        raw_b64 = raw_b64.split(",", 1)[1]

    try:
        pdf_bytes = base64.b64decode(raw_b64)
    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail="Invalid Base64 file format. Please upload a valid PDF.",
        ) from error

    if not pdf_bytes.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="File is not a valid PDF document.")
    if len(pdf_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Resume file exceeds the 5MB size limit.")

    safe_name = f"resume_{employee['_id']}_{int(datetime.now(timezone.utc).timestamp())}.pdf"
    file_path = os.path.join(RESUMES_DIR, safe_name)

    old_filename = employee.get("resume_stored_name")
    if old_filename:
        old_path = os.path.join(RESUMES_DIR, old_filename)
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except OSError:
                pass

    with open(file_path, "wb") as file:
        file.write(pdf_bytes)

    resume_meta = {
        "resume_original_name": payload.filename,
        "resume_stored_name": safe_name,
        "resume_size_bytes": len(pdf_bytes),
        "resume_uploaded_at": datetime.now(timezone.utc).isoformat(),
    }
    employees_collection.update_one({"_id": employee["_id"]}, {"$set": resume_meta})
    return {"message": "Resume uploaded successfully", **resume_meta}


@router.put("/employees/me/photo")
def update_my_profile_photo(
    payload: ProfilePhotoUpload,
    current_user: dict = Depends(require_employee),
):
    profile_image = validate_profile_image(payload.file_data)
    employee = get_linked_employee(current_user)
    employees_collection.update_one(
        {"_id": employee["_id"]},
        {"$set": {"profile_image": profile_image}},
    )
    return {"profile_image": profile_image}


@router.delete("/employees/me/photo")
def delete_my_profile_photo(current_user: dict = Depends(require_employee)):
    employee = get_linked_employee(current_user)
    employees_collection.update_one(
        {"_id": employee["_id"]},
        {"$unset": {"profile_image": ""}},
    )
    return {"message": "Profile photo removed."}


@router.get("/employees/me/resume")
def get_my_resume(current_user: dict = Depends(require_employee)):
    employee = get_linked_employee(current_user)
    stored_name = employee.get("resume_stored_name")
    if not stored_name:
        raise HTTPException(status_code=404, detail="No resume has been uploaded yet.")

    file_path = os.path.join(RESUMES_DIR, stored_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Resume file not found on server.")

    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=employee.get("resume_original_name", "Resume.pdf"),
    )


@router.delete("/employees/me/resume")
def delete_my_resume(current_user: dict = Depends(require_employee)):
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
        {"$unset": {
            "resume_original_name": "",
            "resume_stored_name": "",
            "resume_size_bytes": "",
            "resume_uploaded_at": "",
        }},
    )
    return {"message": "Resume deleted successfully"}


@router.get("/employees")
def get_all_employees(current_user: dict = Depends(require_admin)):
    results = []
    for employee in employees_collection.find():
        account_info = employee_account_info(employee)
        serialized = serialize_employee(employee)
        serialized["account_status"] = account_info["status"]
        serialized["deactivated_until"] = account_info["deactivated_until"]
        email = normalize_email(str(serialized["email"]))
        pending_request = account_requests_collection.find_one(
            {"email": email}, {"_id": 1}
        )
        if pending_request is None:
            pending_request = users_collection.find_one(
                {"email": email, "role": "employee", "status": "pending"},
                {"_id": 1},
            )
        serialized["account_request_id"] = (
            str(pending_request["_id"]) if pending_request else None
        )
        results.append(serialized)
    return results


@router.get("/employees/{employee_id}")
def get_employee(employee_id: str, current_user: dict = Depends(require_admin)):
    return serialize_employee(get_employee_by_id(employee_id))


@router.put("/employees/{employee_id}")
def update_employee(
    employee_id: str,
    employee: EmployeeUpdate,
    current_user: dict = Depends(require_admin),
):
    existing_employee = get_employee_by_id(employee_id)
    object_id = existing_employee["_id"]

    data = employee.model_dump()
    data["name"] = data["name"].strip()
    data["email"] = normalize_email(str(data["email"]))

    if employees_collection.find_one({"email": data["email"], "_id": {"$ne": object_id}}):
        raise HTTPException(status_code=409, detail="Another employee already uses this email")

    linked_account = users_collection.find_one({"employee_id": str(object_id)})
    exclude_id = linked_account["_id"] if linked_account else None
    if users_collection.find_one({"email": data["email"], "_id": {"$ne": exclude_id}}):
        raise HTTPException(status_code=409, detail="Another account already uses this email")

    employees_collection.update_one({"_id": object_id}, {"$set": data})
    if linked_account:
        users_collection.update_one(
            {"_id": linked_account["_id"]},
            {"$set": {"name": data["name"], "email": data["email"]}},
        )

    return serialize_employee(employees_collection.find_one({"_id": object_id}))


@router.delete("/employees/{employee_id}")
def delete_employee(employee_id: str, current_user: dict = Depends(require_admin)):
    employee = get_employee_by_id(employee_id)
    object_id = employee["_id"]

    stored_resume = employee.get("resume_stored_name")
    if stored_resume:
        resume_path = os.path.join(RESUMES_DIR, stored_resume)
        if os.path.exists(resume_path):
            try:
                os.remove(resume_path)
            except OSError:
                pass

    users_collection.delete_many({"employee_id": str(object_id)})
    account_requests_collection.delete_many(
        {"email": normalize_email(str(employee["email"]))}
    )
    employees_collection.delete_one({"_id": object_id})
    return {"message": "Employee and linked login account deleted successfully"}


@router.post("/employees/{employee_id}/deactivate")
def deactivate_employee(
    employee_id: str,
    payload: DeactivateEmployee,
    current_user: dict = Depends(require_admin),
):
    employee = get_employee_by_id(employee_id)
    account = users_collection.find_one(
        {
            "role": "employee",
            "$or": [
                {"employee_id": str(employee["_id"])},
                {"email": normalize_email(str(employee["email"]))},
            ],
        }
    )
    if account is None or account.get("status", "approved") != "approved":
        raise HTTPException(
            status_code=409,
            detail="Only an approved employee account can be deactivated.",
        )

    deactivated_until = datetime.now(timezone.utc) + timedelta(days=payload.duration_days)
    users_collection.update_one(
        {"_id": account["_id"]},
        {"$set": {"deactivated_until": deactivated_until}},
    )
    return {
        "message": f"Employee access deactivated for {payload.duration_days} days.",
        "employee_id": employee.get("employee_id"),
        "account_status": "deactivated",
        "deactivated_until": deactivated_until.isoformat(),
    }


@router.post("/employees/{employee_id}/reactivate")
def reactivate_employee(
    employee_id: str,
    current_user: dict = Depends(require_admin),
):
    employee = get_employee_by_id(employee_id)
    account = users_collection.find_one(
        {
            "role": "employee",
            "$or": [
                {"employee_id": str(employee["_id"])},
                {"email": normalize_email(str(employee["email"]))},
            ],
        }
    )
    if account is None or account.get("status", "approved") != "approved":
        raise HTTPException(
            status_code=409,
            detail="Only an approved employee account can be reactivated.",
        )

    users_collection.update_one(
        {"_id": account["_id"]},
        {"$unset": {"deactivated_until": ""}},
    )
    return {
        "message": "Employee account reactivated.",
        "employee_id": employee.get("employee_id"),
        "account_status": "approved",
        "deactivated_until": None,
    }


@router.get("/employees/{employee_id}/resume")
def get_employee_resume_admin(
    employee_id: str,
    current_user: dict = Depends(require_admin),
):
    employee = get_employee_by_id(employee_id)
    stored_name = employee.get("resume_stored_name")
    if not stored_name:
        raise HTTPException(status_code=404, detail="This employee has not uploaded a resume yet.")

    file_path = os.path.join(RESUMES_DIR, stored_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Resume file not found on server.")

    original_name = employee.get(
        "resume_original_name",
        f"{employee.get('name', 'Employee')}_Resume.pdf",
    )
    return FileResponse(file_path, media_type="application/pdf", filename=original_name)


@router.post("/employees/{employee_id}/account")
@router.put("/employees/{employee_id}/account")
def set_employee_account_password(
    employee_id: str,
    payload: SetPassword,
    current_user: dict = Depends(require_admin),
):
    employee = get_employee_by_id(employee_id)
    object_id = employee["_id"]

    normalized_email = normalize_email(employee["email"])
    hashed_password = hash_password(payload.password)
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
            {"$set": {
                "password": hashed_password,
                "name": employee.get("name", user_account.get("name", "")),
                "email": normalized_email,
                "role": "employee",
                "employee_id": str(object_id),
                "status": "approved",
            }},
        )
    else:
        users_collection.insert_one({
            "name": employee.get("name", ""),
            "email": normalized_email,
            "password": hashed_password,
            "role": "employee",
            "employee_id": str(object_id),
            "status": "approved",
            "created_at": datetime.now(timezone.utc),
        })

    account_requests_collection.delete_one({"email": normalized_email})
    return {
        "message": f"Password for {employee.get('name', 'employee')} has been updated successfully"
    }
