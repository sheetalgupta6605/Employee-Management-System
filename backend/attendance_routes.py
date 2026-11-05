"""Admin-managed attendance records and employee summaries."""

import base64
import binascii
import os
import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from bson import ObjectId
from pymongo import ReturnDocument

from auth import require_admin, require_employee
from database import attendance_collection, db, employees_collection, leave_requests_collection
from employee_services import get_linked_employee

router = APIRouter(tags=["Attendance"])
attendance_holidays_collection = db["attendance_holidays"]
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads", "attendance")
os.makedirs(UPLOAD_DIR, exist_ok=True)
IST = timezone(timedelta(hours=5, minutes=30))


class AttendanceEntry(BaseModel):
    employee_id: str = Field(min_length=1, max_length=100)
    status: str = Field(pattern="^(Present|Absent|Leave)$")
    leave_reason: str = Field(default="", max_length=1000)
    attachment_name: str = Field(default="", max_length=255)


class AttendanceSave(BaseModel):
    date: date
    records: list[AttendanceEntry] = Field(max_length=5000)


class AttendanceHoliday(BaseModel):
    date: date
    name: str = Field(default="Holiday", max_length=100)


class LeaveRequestCreate(BaseModel):
    date: date
    reason: str = Field(min_length=1, max_length=1000)
    attachment_name: str = Field(default="", max_length=255)
    attachment_data: str | None = Field(default=None, max_length=7_000_000)


class LeaveRequestReview(BaseModel):
    status: str = Field(pattern="^(approved|declined)$")


def _save_leave_attachment(name: str, data: str | None) -> tuple[str, str]:
    safe_name = os.path.basename(name.strip())[:255]
    if not data:
        return "", safe_name
    try:
        content = base64.b64decode(data.split(",", 1)[-1], validate=True)
    except (binascii.Error, ValueError) as error:
        raise HTTPException(status_code=400, detail="The leave attachment is invalid.") from error
    if not content or len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Leave attachments must be no larger than 5MB.")
    if os.path.splitext(safe_name)[1].lower() not in {".pdf", ".png", ".jpg", ".jpeg"}:
        raise HTTPException(status_code=400, detail="Use a PDF, PNG, or JPEG leave attachment.")
    stored_id = uuid.uuid4().hex
    with open(os.path.join(UPLOAD_DIR, stored_id), "wb") as file:
        file.write(content)
    return stored_id, safe_name


def _serialize_leave_request(row: dict) -> dict:
    return {"id": str(row["_id"]), "employee_id": row["employee_id"],
            "employee_name": row.get("employee_name", "Employee"),
            "department": row.get("department", "General"), "date": row["date"],
            "reason": row["reason"], "attachment_name": row.get("attachment_name", ""),
            "attachment_id": row.get("attachment_id", ""), "status": row["status"],
            "created_at": row.get("created_at", ""), "reviewed_at": row.get("reviewed_at", "")}


@router.post("/employees/me/leave-requests", status_code=201)
def create_leave_request(payload: LeaveRequestCreate, current_user: dict = Depends(require_employee)):
    reason = payload.reason.strip()
    if not reason:
        raise HTTPException(status_code=422, detail="Enter a reason for your leave request.")
    employee = get_linked_employee(current_user)
    attachment_id, attachment_name = _save_leave_attachment(payload.attachment_name, payload.attachment_data)
    row = {"employee_id": str(employee["_id"]), "employee_name": employee.get("name", "Employee"),
           "department": employee.get("department", "General"), "date": payload.date.isoformat(),
           "reason": reason, "attachment_id": attachment_id, "attachment_name": attachment_name,
           "status": "pending", "created_at": datetime.now(IST).isoformat()}
    result = leave_requests_collection.insert_one(row)
    row["_id"] = result.inserted_id
    return _serialize_leave_request(row)


@router.get("/employees/me/leave-requests")
def get_my_leave_requests(current_user: dict = Depends(require_employee)):
    employee = get_linked_employee(current_user)
    rows = leave_requests_collection.find({"employee_id": str(employee["_id"])}).sort("created_at", -1).limit(50)
    return [_serialize_leave_request(row) for row in rows]


@router.get("/attendance/leave-requests")
def get_leave_requests(status: str = Query(default="pending", pattern="^(pending|approved|declined|all)$"), _: dict = Depends(require_admin)):
    query = {} if status == "all" else {"status": status}
    rows = leave_requests_collection.find(query).sort("created_at", -1).limit(500)
    return [_serialize_leave_request(row) for row in rows]


@router.post("/attendance/leave-requests/{request_id}/review")
def review_leave_request(request_id: str, payload: LeaveRequestReview, _: dict = Depends(require_admin)):
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=404, detail="Leave request not found.")
    now = datetime.now(IST).isoformat()
    row = leave_requests_collection.find_one_and_update(
        {"_id": ObjectId(request_id), "status": "pending"},
        {"$set": {"status": payload.status, "reviewed_at": now}},
        return_document=ReturnDocument.BEFORE,
    )
    if row is None:
        raise HTTPException(status_code=409, detail="This leave request has already been reviewed.")
    if payload.status == "approved" and not attendance_holidays_collection.find_one({"_id": row["date"]}):
        attendance_collection.update_one(
            {"employee_id": row["employee_id"], "date": row["date"]},
            {"$set": {"employee_id": row["employee_id"], "date": row["date"], "status": "Leave",
                      "leave_reason": row["reason"], "attachment_id": row.get("attachment_id", ""),
                      "attachment_name": row.get("attachment_name", ""), "updated_at": now}},
            upsert=True,
        )
    row["status"] = payload.status
    row["reviewed_at"] = now
    return _serialize_leave_request(row)


@router.get("/attendance/leave-requests/{request_id}/attachment")
def get_leave_request_attachment(request_id: str, _: dict = Depends(require_admin)):
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=404, detail="Attachment not found.")
    row = leave_requests_collection.find_one({"_id": ObjectId(request_id)})
    stored_id = row.get("attachment_id", "") if row else ""
    path = os.path.join(UPLOAD_DIR, stored_id)
    if not stored_id or not stored_id.isalnum() or len(stored_id) != 32 or not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Attachment not found.")
    return FileResponse(path, filename=row.get("attachment_name") or "leave-application")


def _record_output(record: dict | None, employee: dict, day: str) -> dict:
    record = record or {}
    return {
        "employee_id": str(employee["_id"]),
        "employee_code": employee.get("employee_id", ""),
        "employee_name": employee.get("name", "Employee"),
        "department": employee.get("department", "General"),
        "date": day,
        "status": record.get("status", "Present"),
        "leave_reason": record.get("leave_reason", ""),
        "attachment_name": record.get("attachment_name", ""),
        "attachment_id": record.get("attachment_id", ""),
        "updated_at": record.get("updated_at"),
    }


@router.get("/attendance/holidays")
def get_attendance_holidays(month: str = Query(pattern=r"^\d{4}-\d{2}$"), _: dict = Depends(require_admin)):
    try:
        start = date.fromisoformat(f"{month}-01")
    except ValueError as error:
        raise HTTPException(status_code=422, detail="Month must use YYYY-MM format.") from error
    next_month = date(start.year + (start.month == 12), start.month % 12 + 1, 1)
    rows = attendance_holidays_collection.find(
        {"_id": {"$gte": start.isoformat(), "$lt": next_month.isoformat()}}
    ).sort("_id", 1)
    return [{"date": row["_id"], "name": row.get("name", "Holiday")} for row in rows]


@router.put("/attendance/holidays")
def mark_attendance_holiday(payload: AttendanceHoliday, _: dict = Depends(require_admin)):
    day = payload.date.isoformat()
    attendance_holidays_collection.update_one(
        {"_id": day},
        {"$set": {"name": payload.name.strip() or "Holiday", "updated_at": datetime.now(IST).isoformat()}},
        upsert=True,
    )
    attendance_collection.delete_many({"date": day})
    return {"message": "Holiday marked; attendance records cleared for this date.", "date": day}


@router.delete("/attendance/holidays")
def clear_attendance_holiday(date_value: date = Query(alias="date"), _: dict = Depends(require_admin)):
    day = date_value.isoformat()
    attendance_holidays_collection.delete_one({"_id": day})
    return {"message": "Holiday cleared.", "date": day}


@router.get("/attendance")
def get_attendance(date_value: date = Query(alias="date"), _: dict = Depends(require_admin)):
    day = date_value.isoformat()
    employees = list(employees_collection.find({}).sort("name", 1))
    saved = {row["employee_id"]: row for row in attendance_collection.find({"date": day})}
    is_holiday = attendance_holidays_collection.find_one({"_id": day}) is not None
    records = [_record_output(saved.get(str(employee["_id"])), employee, day) for employee in employees]
    if is_holiday:
        for record in records:
            record["status"] = "No record"
            record["holiday"] = True
    return records


@router.put("/attendance")
def save_attendance(payload: AttendanceSave, _: dict = Depends(require_admin)):
    day = payload.date.isoformat()
    if attendance_holidays_collection.find_one({"_id": day}):
        raise HTTPException(status_code=409, detail="This date is marked as a holiday. Clear the holiday before saving attendance.")
    employees = {str(row["_id"]): row for row in employees_collection.find({})}
    submitted = {entry.employee_id: entry for entry in payload.records}
    for employee_id, entry in submitted.items():
        if employee_id not in employees:
            raise HTTPException(status_code=404, detail="An employee in this attendance list no longer exists.")
    now = datetime.now(IST).isoformat()
    for employee_id, employee in employees.items():
        entry = submitted.get(employee_id)
        status = entry.status if entry else "Present"
        reason = entry.leave_reason.strip() if entry and status == "Leave" else ""
        existing = attendance_collection.find_one({"employee_id": employee_id, "date": day})
        attachment_id = existing.get("attachment_id", "") if status == "Leave" and existing else ""
        attachment_name = (entry.attachment_name.strip() or (existing.get("attachment_name", "") if existing else "")) if status == "Leave" and entry else ""
        attendance_collection.update_one(
            {"employee_id": employee_id, "date": day},
            {"$set": {"employee_id": employee_id, "date": day, "status": status,
                      "leave_reason": reason, "attachment_id": attachment_id,
                      "attachment_name": attachment_name, "updated_at": now}},
            upsert=True,
        )
    return {"message": "Attendance saved for all employees.", "date": day, "updated_at": now}


@router.get("/attendance/monthly")
def get_monthly_attendance(month: str = Query(pattern=r"^\d{4}-\d{2}$"), _: dict = Depends(require_admin)):
    try:
        start = date.fromisoformat(f"{month}-01")
    except ValueError as error:
        raise HTTPException(status_code=422, detail="Month must use YYYY-MM format.") from error
    next_month = date(start.year + (start.month == 12), start.month % 12 + 1, 1)
    saved_rows = list(attendance_collection.find({"date": {"$gte": start.isoformat(), "$lt": next_month.isoformat()}}))
    days = sorted({row["date"] for row in saved_rows})
    saved = {(row["employee_id"], row["date"]): row for row in saved_rows}
    employees = list(employees_collection.find({}).sort("name", 1))
    return [
        _record_output(saved.get((str(employee["_id"]), day)), employee, day)
        for day in days
        for employee in employees
    ]


@router.get("/attendance/attachments/{attachment_id}")
def get_attendance_attachment(attachment_id: str, _: dict = Depends(require_admin)):
    if not attachment_id.isalnum() or len(attachment_id) != 32:
        raise HTTPException(status_code=404, detail="Attachment not found.")
    record = attendance_collection.find_one({"attachment_id": attachment_id})
    path = os.path.join(UPLOAD_DIR, attachment_id)
    if not record or not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Attachment not found.")
    return FileResponse(path, filename=record.get("attachment_name") or "leave-application")


@router.get("/employees/me/attendance")
def get_my_attendance(month: str = Query(pattern=r"^\d{4}-\d{2}$"), current_user: dict = Depends(require_employee)):
    try:
        date.fromisoformat(f"{month}-01")
    except ValueError as error:
        raise HTTPException(status_code=422, detail="Month must use YYYY-MM format.") from error
    employee = get_linked_employee(current_user)
    employee_id = str(employee["_id"])
    rows = list(attendance_collection.find({"employee_id": employee_id, "date": {"$regex": f"^{month}-"}}).sort("date", 1))
    today = datetime.now(IST).date().isoformat()
    today_record = attendance_collection.find_one({"employee_id": employee_id, "date": today}) or {}
    today_is_holiday = attendance_holidays_collection.find_one({"_id": today}) is not None
    return {
        "today": {"date": today, "status": "No record" if today_is_holiday else today_record.get("status", "Present"),
                  "updated_at": today_record.get("updated_at")},
        "month": month,
        "present_days": sum(row.get("status") == "Present" for row in rows),
        "absent_days": sum(row.get("status") == "Absent" for row in rows),
        "leave_days": sum(row.get("status") == "Leave" for row in rows),
        "records": [{"date": row["date"], "status": row.get("status", "Present")} for row in rows],
        "last_updated": max((row.get("updated_at", "") for row in rows), default=""),
    }
