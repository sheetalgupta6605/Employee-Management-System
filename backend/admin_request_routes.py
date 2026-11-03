from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pymongo import ASCENDING
from pymongo.errors import DuplicateKeyError

from auth import require_admin
from database import (
    account_requests_collection,
    employees_collection,
    users_collection,
)
from employee_services import next_employee_id

router = APIRouter()


@router.get("/admin/account-requests")
def get_account_requests(current_user: dict = Depends(require_admin)):
    requests = []
    seen_emails = set()
    for request in account_requests_collection.find().sort("created_at", ASCENDING):
        email = request["email"]
        seen_emails.add(email)
        created_at = request.get("created_at")
        requests.append(
            {
                "id": str(request["_id"]),
                "name": request.get("name", "Employee"),
                "email": email,
                "department": request.get("department", "General"),
                "created_at": created_at.isoformat() if hasattr(created_at, "isoformat") else created_at,
            }
        )

    for account in users_collection.find(
        {"role": "employee", "status": "pending"}
    ).sort("created_at", ASCENDING):
        if account["email"] in seen_emails:
            continue
        employee_id = account.get("employee_id")
        employee = None
        if employee_id and ObjectId.is_valid(employee_id):
            employee = employees_collection.find_one({"_id": ObjectId(employee_id)})
        if employee is None:
            employee = employees_collection.find_one({"email": account["email"]})
        created_at = account.get("created_at")
        requests.append(
            {
                "id": str(account["_id"]),
                "name": employee.get("name", account.get("name", "Employee")) if employee else account.get("name", "Employee"),
                "email": account["email"],
                "department": employee.get("department", "General") if employee else "General",
                "created_at": created_at.isoformat() if hasattr(created_at, "isoformat") else created_at,
            }
        )
    return requests


@router.post("/admin/account-requests/{request_id}/approve")
def approve_account_request(
    request_id: str,
    current_user: dict = Depends(require_admin),
):
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid account request ID")

    request = account_requests_collection.find_one({"_id": ObjectId(request_id)})
    if request is not None:
        email = request["email"]
        if users_collection.find_one({"email": email}):
            raise HTTPException(status_code=409, detail="An account with this email already exists")

        employee = employees_collection.find_one({"email": email})
        created_employee_id = None
        if employee is None:
            try:
                result = employees_collection.insert_one(
                    {
                        "name": request["name"],
                        "email": email,
                        "department": request.get("department", "General"),
                        "contact_number": "",
                        "address": "",
                        "employee_id": next_employee_id(),
                    }
                )
                created_employee_id = result.inserted_id
                employee = employees_collection.find_one({"_id": created_employee_id})
            except DuplicateKeyError:
                employee = employees_collection.find_one({"email": email})

        try:
            users_collection.insert_one(
                {
                    "name": employee.get("name", request["name"]),
                    "email": email,
                    "password": request["password_hash"],
                    "role": "employee",
                    "employee_id": str(employee["_id"]),
                    "status": "approved",
                    "created_at": datetime.now(timezone.utc),
                }
            )
        except DuplicateKeyError as error:
            if created_employee_id is not None:
                employees_collection.delete_one({"_id": created_employee_id})
            raise HTTPException(status_code=409, detail="An account with this email already exists") from error
        except Exception:
            if created_employee_id is not None:
                employees_collection.delete_one({"_id": created_employee_id})
            raise

        account_requests_collection.delete_one({"_id": request["_id"]})
        return {"message": f"Account request for {request['name']} was approved."}

    account = users_collection.find_one(
        {"_id": ObjectId(request_id), "role": "employee", "status": "pending"}
    )
    if account is None:
        raise HTTPException(status_code=404, detail="Pending account request not found")

    users_collection.update_one(
        {"_id": account["_id"]},
        {"$set": {"status": "approved"}, "$unset": {"created_profile": ""}},
    )
    return {"message": f"Account request for {account.get('name', account['email'])} was approved."}


@router.post("/admin/account-requests/{request_id}/decline")
def decline_account_request(
    request_id: str,
    current_user: dict = Depends(require_admin),
):
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid account request ID")

    request = account_requests_collection.find_one({"_id": ObjectId(request_id)})
    if request is not None:
        account_requests_collection.delete_one({"_id": request["_id"]})
        return {"message": f"Account request for {request['name']} was declined."}

    account = users_collection.find_one(
        {"_id": ObjectId(request_id), "role": "employee", "status": "pending"}
    )
    if account is None:
        raise HTTPException(status_code=404, detail="Pending account request not found")

    users_collection.delete_one({"_id": account["_id"], "status": "pending"})
    employee_id = account.get("employee_id")
    if account.get("created_profile") and employee_id and ObjectId.is_valid(employee_id):
        employees_collection.delete_one({"_id": ObjectId(employee_id)})
    return {"message": f"Account request for {account.get('name', account['email'])} was declined."}
