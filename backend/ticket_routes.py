from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pymongo import ReturnDocument

from auth import require_employee
from database import (
    db,
    ticket_messages_collection,
    ticket_notifications_collection,
    tickets_collection,
    users_collection,
)
from employee_services import get_linked_employee
from models import (
    TicketCreate,
    TicketMessageCreate,
    TicketMessageRecord,
    TicketNotificationRecord,
    TicketRecord,
    TicketStatus,
    TicketStatusHistoryEntry,
)
from ticket_services import save_ticket_message

router = APIRouter(prefix="/tickets", tags=["Employee Tickets"])


def _next_ticket_id() -> str:
    counter = db["counters"].find_one_and_update(
        {"_id": "ticket_id"},
        {"$inc": {"value": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return f"TKT-{counter['value']}"


def _serialize_ticket(ticket: dict) -> dict:
    ticket.pop("_id", None)
    return TicketRecord.model_validate(ticket).model_dump(mode="json")


def _employee_identity(employee: dict, current_user: dict) -> tuple[str, str]:
    employee_id = str(employee["_id"])
    employee_name = str(employee.get("name") or current_user.get("name") or "")
    return employee_id, employee_name


def _get_employee_ticket(ticket_id: str, employee_id: str) -> dict:
    ticket = tickets_collection.find_one(
        {"ticket_id": ticket_id, "employee_id": employee_id}
    )
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


def _notify_admins(ticket_id: str, title: str, message: str, now: datetime) -> None:
    admins = users_collection.find({}, {"_id": 1, "role": 1})
    for admin in admins:
        if str(admin.get("role", "")).strip().lower() != "admin":
            continue
        notification = TicketNotificationRecord(
            notification_id=str(ObjectId()),
            recipient_id=str(admin["_id"]),
            recipient_role="admin",
            ticket_id=ticket_id,
            title=title,
            message=message,
            is_read=False,
            created_at=now,
        )
        ticket_notifications_collection.insert_one(
            notification.model_dump(mode="python")
        )


def _serialize_messages(messages) -> list[dict]:
    return [
        TicketMessageRecord.model_validate(message).model_dump(mode="json")
        for message in messages
    ]


def _serialize_notifications(notifications) -> list[dict]:
    return [
        TicketNotificationRecord.model_validate(notification).model_dump(mode="json")
        for notification in notifications
    ]


@router.post("/", response_model=TicketRecord, status_code=201)
def create_ticket(
    payload: TicketCreate,
    current_user: dict = Depends(require_employee),
):
    employee = get_linked_employee(current_user)
    now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    employee_id = str(employee["_id"])
    employee_name = str(employee.get("name") or current_user.get("name") or "")
    employee_email = str(employee.get("email") or current_user.get("email") or "")

    ticket = TicketRecord(
        ticket_id=_next_ticket_id(),
        employee_id=employee_id,
        employee_name=employee_name,
        employee_email=employee_email,
        employee_phone=payload.phone_number,
        description=payload.description,
        status=TicketStatus.PENDING,
        created_at=now,
        updated_at=now,
        status_history=[
            TicketStatusHistoryEntry(
                status=TicketStatus.PENDING,
                changed_by=employee_id,
                changed_by_role="employee",
                changed_at=now,
                note="Ticket created",
            )
        ],
    )
    ticket_data = ticket.model_dump(mode="python")
    tickets_collection.insert_one(ticket_data)
    _notify_admins(
        ticket.ticket_id,
        "New employee ticket",
        f"{employee_name} created ticket {ticket.ticket_id}.",
        now,
    )
    return ticket.model_dump(mode="json")


@router.get("/my", response_model=list[TicketRecord])
def get_my_tickets(
    status: TicketStatus | None = Query(default=None),
    current_user: dict = Depends(require_employee),
):
    employee = get_linked_employee(current_user)
    employee_id, _ = _employee_identity(employee, current_user)
    query = {"employee_id": employee_id}
    if status is not None:
        query["status"] = status.value

    tickets = tickets_collection.find(query).sort("created_at", -1)
    return [_serialize_ticket(ticket) for ticket in tickets]


@router.get("/{ticket_id}", response_model=TicketRecord)
def get_my_ticket(
    ticket_id: str,
    current_user: dict = Depends(require_employee),
):
    employee = get_linked_employee(current_user)
    employee_id, _ = _employee_identity(employee, current_user)
    ticket = _get_employee_ticket(ticket_id, employee_id)
    return _serialize_ticket(ticket)


@router.get(
    "/my/notifications",
    response_model=list[TicketNotificationRecord],
)
def get_my_notifications(
    current_user: dict = Depends(require_employee),
):
    notifications = ticket_notifications_collection.find(
        {
            "recipient_id": str(current_user["_id"]),
            "recipient_role": "employee",
        }
    ).sort("created_at", -1)
    return _serialize_notifications(notifications)


@router.patch(
    "/my/notifications/{notification_id}/read",
    response_model=TicketNotificationRecord,
)
def mark_my_notification_read(
    notification_id: str,
    current_user: dict = Depends(require_employee),
):
    notification = ticket_notifications_collection.find_one_and_update(
        {
            "notification_id": notification_id,
            "recipient_id": str(current_user["_id"]),
            "recipient_role": "employee",
        },
        {"$set": {"is_read": True}},
        return_document=ReturnDocument.AFTER,
    )
    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    return TicketNotificationRecord.model_validate(notification).model_dump(
        mode="json"
    )


@router.get(
    "/{ticket_id}/messages",
    response_model=list[TicketMessageRecord],
)
def get_my_ticket_messages(
    ticket_id: str,
    current_user: dict = Depends(require_employee),
):
    employee = get_linked_employee(current_user)
    employee_id, _ = _employee_identity(employee, current_user)
    _get_employee_ticket(ticket_id, employee_id)
    messages = ticket_messages_collection.find({"ticket_id": ticket_id}).sort(
        "timestamp", 1
    )
    return _serialize_messages(messages)


@router.post(
    "/{ticket_id}/messages",
    response_model=TicketMessageRecord,
    status_code=201,
)
def send_my_ticket_message(
    ticket_id: str,
    payload: TicketMessageCreate,
    current_user: dict = Depends(require_employee),
):
    employee = get_linked_employee(current_user)
    employee_id, employee_name = _employee_identity(employee, current_user)
    now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    message = TicketMessageRecord(
        ticket_id=ticket_id,
        sender_id=str(current_user["_id"]),
        sender_role="employee",
        sender_name=employee_name,
        message=payload.message,
        timestamp=now,
    )
    admin_notifications = [
        TicketNotificationRecord(
            notification_id=str(ObjectId()),
            recipient_id=str(admin["_id"]),
            recipient_role="admin",
            ticket_id=ticket_id,
            title="New employee ticket message",
            message=f"{employee_name} sent a message on ticket {ticket_id}.",
            is_read=False,
            created_at=now,
        )
        for admin in users_collection.find({}, {"_id": 1, "role": 1})
        if str(admin.get("role", "")).strip().lower() == "admin"
    ]
    save_ticket_message(
        {"ticket_id": ticket_id, "employee_id": employee_id},
        message,
        admin_notifications,
    )
    return message.model_dump(mode="json")


@router.patch("/{ticket_id}/close", response_model=TicketRecord)
def close_my_ticket(
    ticket_id: str,
    current_user: dict = Depends(require_employee),
):
    employee = get_linked_employee(current_user)
    employee_id, employee_name = _employee_identity(employee, current_user)
    ticket = _get_employee_ticket(ticket_id, employee_id)
    if ticket.get("status") == TicketStatus.CLOSED.value:
        raise HTTPException(status_code=409, detail="Ticket is already closed")

    now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    history_entry = TicketStatusHistoryEntry(
        status=TicketStatus.CLOSED,
        changed_by=employee_id,
        changed_by_role="employee",
        changed_at=now,
        note="Ticket closed by employee",
    ).model_dump(mode="python")
    result = tickets_collection.update_one(
        {
            "ticket_id": ticket_id,
            "employee_id": employee_id,
            "status": {"$ne": TicketStatus.CLOSED.value},
        },
        {
            "$set": {
                "status": TicketStatus.CLOSED.value,
                "updated_at": now,
                "closed_at": now,
                "closed_by": employee_id,
                "closed_by_name": employee_name,
            },
            "$push": {"status_history": history_entry},
        },
    )
    if result.modified_count != 1:
        raise HTTPException(status_code=409, detail="Ticket is already closed")

    updated_ticket = tickets_collection.find_one(
        {"ticket_id": ticket_id, "employee_id": employee_id}
    )
    if updated_ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    _notify_admins(
        ticket_id,
        "Employee closed a ticket",
        f"{employee_name} closed ticket {ticket_id}.",
        now,
    )

    return _serialize_ticket(updated_ticket)
