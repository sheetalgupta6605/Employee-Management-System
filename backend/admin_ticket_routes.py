# import re
# from datetime import datetime, timedelta, timezone

# from bson import ObjectId
# from fastapi import APIRouter, Depends, HTTPException, Query
# from pymongo import ReturnDocument

# from auth import require_admin
# from database import (
#     ticket_messages_collection,
#     ticket_notifications_collection,
#     tickets_collection,
#     users_collection,
# )
# from models import (
#     TicketDecline,
#     TicketMessageCreate,
#     TicketMessageRecord,
#     TicketNotificationRecord,
#     TicketRecord,
#     TicketStatus,
#     TicketStatusHistoryEntry,
#     TicketStatusUpdate,
# )
# from ticket_services import save_ticket_message

# router = APIRouter(prefix="/admin/tickets", tags=["Admin Tickets"])
# notification_router = APIRouter(
#     prefix="/admin/ticket-notifications",
#     tags=["Admin Ticket Notifications"],
# )


# def _serialize_ticket(ticket: dict) -> dict:
#     ticket.pop("_id", None)
#     return TicketRecord.model_validate(ticket).model_dump(mode="json")


# def _admin_identity(admin: dict) -> tuple[str, str]:
#     admin_name = admin.get("name") or admin.get("email") or "Administrator"
#     return str(admin["_id"]), str(admin_name)


# def _get_employee_account(ticket: dict) -> dict:
#     employee_email = str(ticket.get("employee_email", "")).strip().lower()
#     employee_id = str(ticket.get("employee_id", ""))
#     account = users_collection.find_one(
#         {
#             "$and": [
#                 {"role": {"$regex": "^employee$", "$options": "i"}},
#                 {
#                     "$or": [
#                         {"employee_id": employee_id},
#                         {"email": employee_email},
#                     ]
#                 },
#             ]
#         },
#         {"_id": 1, "name": 1},
#     )
#     if account is None:
#         raise HTTPException(
#             status_code=409,
#             detail="Could not find the employee account to notify.",
#         )
#     return account


# def _notify_employee(
#     ticket: dict,
#     account: dict,
#     title: str,
#     message: str,
#     now: datetime,
# ) -> None:
#     notification = TicketNotificationRecord(
#         notification_id=str(ObjectId()),
#         recipient_id=str(account["_id"]),
#         recipient_role="employee",
#         ticket_id=ticket["ticket_id"],
#         title=title,
#         message=message,
#         is_read=False,
#         created_at=now,
#     )
#     ticket_notifications_collection.insert_one(
#         notification.model_dump(mode="python")
#     )


# def _serialize_messages(messages) -> ist[dict]:
#     return [
#         TicketMessageRecord.model_validate(message).model_dump(mode="json")
#         for message in messages
#     ]


# def _serialize_notifications(notifications) -> ist[dict]:
#     return [
#         TicketNotificationRecord.model_validate(notification).model_dump(mode="json")
#         for notification in notifications
#     ]


# def _apply_transition(
#     ticket_id: str,
#     current_status: TicketStatus,
#     next_status: TicketStatus,
#     admin: dict,
#     fields: dict | None = None,
# ) -> tuple[dict, dict, datetime]:
#     ticket = tickets_collection.find_one({"ticket_id": ticket_id})
#     if ticket is None:
#         raise HTTPException(status_code=404, detail="Ticket not found")
#     if ticket.get("status") != current_status.value:
#         raise HTTPException(
#             status_code=409,
#             detail=f"Ticket must be {current_status.value} before it can be {next_status.value}.",
#         )

#     employee_account = _get_employee_account(ticket)
#     now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
#     admin_id, admin_name = _admin_identity(admin)
#     history_entry = TicketStatusHistoryEntry(
#         status=next_status,
#         changed_by=admin_id,
#         changed_by_role="admin",
#         changed_at=now,
#         note=f"Status changed to {next_status.value} by {admin_name}",
#     ).model_dump(mode="python")

#     update_fields = {
#         "status": next_status.value,
#         "updated_at": now,
#         **(fields or {}),
#     }
#     if next_status == TicketStatus.ACCEPTED:
#         update_fields["accepted_at"] = now
#     elif next_status == TicketStatus.DECLINED:
#         update_fields["declined_at"] = now
#     elif next_status == TicketStatus.IN_PROGRESS:
#         update_fields["in_progress_at"] = now
#     result = tickets_collection.update_one(
#         {"ticket_id": ticket_id, "status": current_status.value},
#         {"$set": update_fields, "$push": {"status_history": history_entry}},
#     )
#     if result.modified_count != 1:
#         raise HTTPException(
#             status_code=409,
#             detail="Ticket status changed before this update could be applied.",
#         )

#     updated_ticket = tickets_collection.find_one({"ticket_id": ticket_id})
#     if updated_ticket is None:
#         raise HTTPException(status_code=404, detail="Ticket not found")
#     return updated_ticket, employee_account, now


# @router.get("", response_model=ist[TicketRecord])
# def get_all_tickets(
#     status: TicketStatus | None = Query(default=None),
#     search: str | None = Query(default=None, max_length=200),
#     current_admin: dict = Depends(require_admin),
# ):
#     query: dict = {}
#     if status is not None:
#         query["status"] = status.value
#     if search and search.strip():
#         term = re.escape(search.strip())
#         query["$or"] = [
#             {"employee_name": {"$regex": term, "$options": "i"}},
#             {"employee_email": {"$regex": term, "$options": "i"}},
#             {"ticket_id": {"$regex": term, "$options": "i"}},
#         ]

#     tickets = tickets_collection.find(query).sort("created_at", -1)
#     return [_serialize_ticket(ticket) for ticket in tickets]


# @router.get("/{ticket_id}", response_model=TicketRecord)
# def get_ticket_details(
#     ticket_id: str,
#     current_admin: dict = Depends(require_admin),
# ):
#     ticket = tickets_collection.find_one({"ticket_id": ticket_id})
#     if ticket is None:
#         raise HTTPException(status_code=404, detail="Ticket not found")
#     return _serialize_ticket(ticket)


# @router.get(
#     "/{ticket_id}/messages",
#     response_model=ist[TicketMessageRecord],
# )
# def get_ticket_messages(
#     ticket_id: str,
#     current_admin: dict = Depends(require_admin),
# ):
#     if tickets_collection.find_one({"ticket_id": ticket_id}) is None:
#         raise HTTPException(status_code=404, detail="Ticket not found")
#     messages = ticket_messages_collection.find({"ticket_id": ticket_id}).sort(
#         "timestamp", 1
#     )
#     return _serialize_messages(messages)


# @router.post(
#     "/{ticket_id}/messages",
#     response_model=TicketMessageRecord,
#     status_code=201,
# )
# def send_ticket_message(
#     ticket_id: str,
#     payload: TicketMessageCreate,
#     current_admin: dict = Depends(require_admin),
# ):
#     ticket = tickets_collection.find_one({"ticket_id": ticket_id})
#     if ticket is None:
#         raise HTTPException(status_code=404, detail="Ticket not found")
#     employee_account = _get_employee_account(ticket)
#     now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
#     _, admin_name = _admin_identity(current_admin)
#     message = TicketMessageRecord(
#         ticket_id=ticket_id,
#         sender_id=str(current_admin["_id"]),
#         sender_role="admin",
#         sender_name=admin_name,
#         message=payload.message,
#         timestamp=now,
#     )
#     employee_notification = TicketNotificationRecord(
#         notification_id=str(ObjectId()),
#         recipient_id=str(employee_account["_id"]),
#         recipient_role="employee",
#         ticket_id=ticket_id,
#         title="New ticket message",
#         message=f"{admin_name} sent a message on ticket {ticket_id}.",
#         is_read=False,
#         created_at=now,
#     )
#     save_ticket_message(
#         {"ticket_id": ticket_id},
#         message,
#         [employee_notification],
#     )
#     return message.model_dump(mode="json")


# @notification_router.get("", response_model=ist[TicketNotificationRecord])
# def get_admin_notifications(
#     current_admin: dict = Depends(require_admin),
# ):
#     notifications = ticket_notifications_collection.find(
#         {
#             "recipient_id": str(current_admin["_id"]),
#             "recipient_role": "admin",
#         }
#     ).sort("created_at", -1)
#     return _serialize_notifications(notifications)


# @notification_router.patch(
#     "/{notification_id}/read",
#     response_model=TicketNotificationRecord,
# )
# def mark_admin_notification_read(
#     notification_id: str,
#     current_admin: dict = Depends(require_admin),
# ):
#     notification = ticket_notifications_collection.find_one_and_update(
#         {
#             "notification_id": notification_id,
#             "recipient_id": str(current_admin["_id"]),
#             "recipient_role": "admin",
#         },
#         {"$set": {"is_read": True}},
#         return_document=ReturnDocument.AFTER,
#     )
#     if notification is None:
#         raise HTTPException(status_code=404, detail="Notification not found")
#     return TicketNotificationRecord.model_validate(notification).model_dump(
#         mode="json"
#     )


# @router.patch("/{ticket_id}/accept", response_model=TicketRecord)
# def accept_ticket(
#     ticket_id: str,
#     current_admin: dict = Depends(require_admin),
# ):
#     admin_id, admin_name = _admin_identity(current_admin)
#     ticket, employee_account, now = _apply_transition(
#         ticket_id,
#         TicketStatus.PENDING,
#         TicketStatus.ACCEPTED,
#         current_admin,
#         {
#             "accepted_by": admin_id,
#             "accepted_by_name": admin_name,
#         },
#     )
#     _notify_employee(
#         ticket,
#         employee_account,
#         "Ticket accepted",
#         f"Your ticket {ticket_id} was accepted by {admin_name}.",
#         now,
#     )
#     return _serialize_ticket(ticket)


# @router.patch("/{ticket_id}/decline", response_model=TicketRecord)
# def decline_ticket(
#     ticket_id: str,
#     payload: TicketDecline,
#     current_admin: dict = Depends(require_admin),
# ):
#     admin_id, admin_name = _admin_identity(current_admin)
#     ticket, employee_account, now = _apply_transition(
#         ticket_id,
#         TicketStatus.PENDING,
#         TicketStatus.DECLINED,
#         current_admin,
#         {
#             "decline_reason": payload.reason,
#             "declined_by": admin_id,
#             "declined_by_name": admin_name,
#         },
#     )
#     _notify_employee(
#         ticket,
#         employee_account,
#         "Ticket declined",
#         f"Your ticket {ticket_id} was declined. Reason: {payload.reason}",
#         now,
#     )
#     return _serialize_ticket(ticket)


# @router.patch("/{ticket_id}/status", response_model=TicketRecord)
# def update_ticket_status(
#     ticket_id: str,
#     payload: TicketStatusUpdate,
#     current_admin: dict = Depends(require_admin),
# ):
#     if payload.status != TicketStatus.IN_PROGRESS:
#         raise HTTPException(
#             status_code=400,
#             detail="Admins may only move accepted tickets to In Progress.",
#         )

#     admin_id, admin_name = _admin_identity(current_admin)
#     ticket, employee_account, now = _apply_transition(
#         ticket_id,
#         TicketStatus.ACCEPTED,
#         TicketStatus.IN_PROGRESS,
#         current_admin,
#         {
#             "in_progress_by": admin_id,
#             "in_progress_by_name": admin_name,
#         },
#     )
#     _notify_employee(
#         ticket,
#         employee_account,
#         "Ticket in progress",
#         f"Your ticket {ticket_id} is now In Progress.",
#         now,
#     )
#     return _serialize_ticket(ticket)



import re
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pymongo import ReturnDocument

from auth import require_admin
from database import (
    ticket_messages_collection,
    ticket_notifications_collection,
    tickets_collection,
    users_collection,
)
from models import (
    TicketDecline,
    TicketMessageCreate,
    TicketMessageRecord,
    TicketNotificationRecord,
    TicketRecord,
    TicketStatus,
    TicketStatusHistoryEntry,
    TicketStatusUpdate,
)
from ticket_services import save_ticket_message


router = APIRouter(prefix="/admin/tickets", tags=["Admin Tickets"])

notification_router = APIRouter(
    prefix="/admin/ticket-notifications",
    tags=["Admin Ticket Notifications"],
)


# Convert MongoDB ticket into JSON
def _serialize_ticket(ticket: dict) -> dict:
    ticket.pop("_id", None)
    return TicketRecord.model_validate(ticket).model_dump(mode="json")


# Get admin ID and name
def _admin_identity(admin: dict) -> tuple[str, str]:
    admin_name = admin.get("name") or admin.get("email") or "Administrator"
    return str(admin["_id"]), str(admin_name)


# Find employee account related to ticket
def _get_employee_account(ticket: dict) -> dict:
    employee_email = str(ticket.get("employee_email", "")).strip().lower()
    employee_id = str(ticket.get("employee_id", ""))

    account = users_collection.find_one(
        {
            "$and": [
                {"role": {"$regex": "^employee$", "$options": "i"}},
                {
                    "$or": [
                        {"employee_id": employee_id},
                        {"email": employee_email},
                    ]
                },
            ]
        },
        {"_id": 1, "name": 1},
    )

    if account is None:
        raise HTTPException(
            status_code=409,
            detail="Could not find the employee account to notify.",
        )

    return account


# Send notification to employee
def _notify_employee(
    ticket: dict,
    account: dict,
    title: str,
    message: str,
    now: datetime,
) -> None:
    notification = TicketNotificationRecord(
        notification_id=str(ObjectId()),
        recipient_id=str(account["_id"]),
        recipient_role="employee",
        ticket_id=ticket["ticket_id"],
        title=title,
        message=message,
        is_read=False,
        created_at=now,
    )

    ticket_notifications_collection.insert_one(
        notification.model_dump(mode="python")
    )


# Convert messages into JSON
def _serialize_messages(messages) -> list[dict]:
    return [
        TicketMessageRecord.model_validate(message).model_dump(mode="json")
        for message in messages
    ]


# Convert notifications into JSON
def _serialize_notifications(notifications) -> list[dict]:
    return [
        TicketNotificationRecord.model_validate(notification).model_dump(
            mode="json"
        )
        for notification in notifications
    ]


# Apply ticket status changes
def _apply_transition(
    ticket_id: str,
    current_status: TicketStatus,
    next_status: TicketStatus,
    admin: dict,
    fields: dict | None = None,
) -> tuple[dict, dict, datetime]:

    ticket = tickets_collection.find_one({"ticket_id": ticket_id})

    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if ticket.get("status") != current_status.value:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Ticket must be {current_status.value} "
                f"before it can be {next_status.value}."
            ),
        )

    employee_account = _get_employee_account(ticket)

    now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    admin_id, admin_name = _admin_identity(admin)

    history_entry = TicketStatusHistoryEntry(
        status=next_status,
        changed_by=admin_id,
        changed_by_role="admin",
        changed_at=now,
        note=f"Status changed to {next_status.value} by {admin_name}",
    ).model_dump(mode="python")

    update_fields = {
        "status": next_status.value,
        "updated_at": now,
        **(fields or {}),
    }

    if next_status == TicketStatus.ACCEPTED:
        update_fields["accepted_at"] = now

    elif next_status == TicketStatus.DECLINED:
        update_fields["declined_at"] = now

    elif next_status == TicketStatus.IN_PROGRESS:
        update_fields["in_progress_at"] = now

    result = tickets_collection.update_one(
        {"ticket_id": ticket_id, "status": current_status.value},
        {
            "$set": update_fields,
            "$push": {"status_history": history_entry},
        },
    )

    if result.modified_count != 1:
        raise HTTPException(
            status_code=409,
            detail="Ticket status changed before this update could be applied.",
        )

    updated_ticket = tickets_collection.find_one({"ticket_id": ticket_id})

    if updated_ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return updated_ticket, employee_account, now


# GET ALL TICKETS
@router.get("", response_model=list[TicketRecord])
def get_all_tickets(
    status: TicketStatus | None = Query(default=None),
    search: str | None = Query(default=None, max_length=200),
    current_admin: dict = Depends(require_admin),
):
    query: dict = {}

    if status is not None:
        query["status"] = status.value

    if search and search.strip():
        term = re.escape(search.strip())

        query["$or"] = [
            {"employee_name": {"$regex": term, "$options": "i"}},
            {"employee_email": {"$regex": term, "$options": "i"}},
            {"ticket_id": {"$regex": term, "$options": "i"}},
        ]

    tickets = tickets_collection.find(query).sort("created_at", -1)

    return [_serialize_ticket(ticket) for ticket in tickets]


# GET TICKET DETAILS
@router.get("/{ticket_id}", response_model=TicketRecord)
def get_ticket_details(
    ticket_id: str,
    current_admin: dict = Depends(require_admin),
):
    ticket = tickets_collection.find_one({"ticket_id": ticket_id})

    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return _serialize_ticket(ticket)


# GET TICKET MESSAGES
@router.get(
    "/{ticket_id}/messages",
    response_model=list[TicketMessageRecord],
)
def get_ticket_messages(
    ticket_id: str,
    current_admin: dict = Depends(require_admin),
):
    if tickets_collection.find_one({"ticket_id": ticket_id}) is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    messages = ticket_messages_collection.find(
        {"ticket_id": ticket_id}
    ).sort("timestamp", 1)

    return _serialize_messages(messages)


# SEND TICKET MESSAGE
@router.post(
    "/{ticket_id}/messages",
    response_model=TicketMessageRecord,
    status_code=201,
)
def send_ticket_message(
    ticket_id: str,
    payload: TicketMessageCreate,
    current_admin: dict = Depends(require_admin),
):
    ticket = tickets_collection.find_one({"ticket_id": ticket_id})

    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    employee_account = _get_employee_account(ticket)

    now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    _, admin_name = _admin_identity(current_admin)

    message = TicketMessageRecord(
        ticket_id=ticket_id,
        sender_id=str(current_admin["_id"]),
        sender_role="admin",
        sender_name=admin_name,
        message=payload.message,
        timestamp=now,
    )

    employee_notification = TicketNotificationRecord(
        notification_id=str(ObjectId()),
        recipient_id=str(employee_account["_id"]),
        recipient_role="employee",
        ticket_id=ticket_id,
        title="New ticket message",
        message=f"{admin_name} sent a message on ticket {ticket_id}.",
        is_read=False,
        created_at=now,
    )

    save_ticket_message(
        {"ticket_id": ticket_id},
        message,
        [employee_notification],
    )

    return message.model_dump(mode="json")


# GET ADMIN NOTIFICATIONS
@notification_router.get(
    "",
    response_model=list[TicketNotificationRecord],
)
def get_admin_notifications(
    current_admin: dict = Depends(require_admin),
):
    notifications = ticket_notifications_collection.find(
        {
            "recipient_id": str(current_admin["_id"]),
            "recipient_role": "admin",
        }
    ).sort("created_at", -1)

    return _serialize_notifications(notifications)


# MARK ADMIN NOTIFICATION AS READ
@notification_router.patch(
    "/{notification_id}/read",
    response_model=TicketNotificationRecord,
)
def mark_admin_notification_read(
    notification_id: str,
    current_admin: dict = Depends(require_admin),
):
    notification = ticket_notifications_collection.find_one_and_update(
        {
            "notification_id": notification_id,
            "recipient_id": str(current_admin["_id"]),
            "recipient_role": "admin",
        },
        {"$set": {"is_read": True}},
        return_document=ReturnDocument.AFTER,
    )

    if notification is None:
        raise HTTPException(
            status_code=404,
            detail="Notification not found",
        )

    return TicketNotificationRecord.model_validate(
        notification
    ).model_dump(mode="json")


# ACCEPT TICKET
@router.patch("/{ticket_id}/accept", response_model=TicketRecord)
def accept_ticket(
    ticket_id: str,
    current_admin: dict = Depends(require_admin),
):
    admin_id, admin_name = _admin_identity(current_admin)

    ticket, employee_account, now = _apply_transition(
        ticket_id,
        TicketStatus.PENDING,
        TicketStatus.ACCEPTED,
        current_admin,
        {
            "accepted_by": admin_id,
            "accepted_by_name": admin_name,
        },
    )

    ticket_notifications_collection.update_many(
        {
            "ticket_id": ticket_id,
            "recipient_role": "admin",
            "title": "New employee ticket",
            "is_read": False,
        },
        {"$set": {"is_read": True}},
    )

    _notify_employee(
        ticket,
        employee_account,
        "Ticket accepted",
        f"Your ticket {ticket_id} was accepted by {admin_name}.",
        now,
    )

    return _serialize_ticket(ticket)


# DECLINE TICKET
@router.patch("/{ticket_id}/decline", response_model=TicketRecord)
def decline_ticket(
    ticket_id: str,
    payload: TicketDecline,
    current_admin: dict = Depends(require_admin),
):
    admin_id, admin_name = _admin_identity(current_admin)

    ticket, employee_account, now = _apply_transition(
        ticket_id,
        TicketStatus.PENDING,
        TicketStatus.DECLINED,
        current_admin,
        {
            "decline_reason": payload.reason,
            "declined_by": admin_id,
            "declined_by_name": admin_name,
        },
    )

    _notify_employee(
        ticket,
        employee_account,
        "Ticket declined",
        f"Your ticket {ticket_id} was declined. Reason: {payload.reason}",
        now,
    )

    return _serialize_ticket(ticket)


# UPDATE TICKET STATUS
@router.patch("/{ticket_id}/status", response_model=TicketRecord)
def update_ticket_status(
    ticket_id: str,
    payload: TicketStatusUpdate,
    current_admin: dict = Depends(require_admin),
):
    if payload.status != TicketStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=400,
            detail="Admins may only move accepted tickets to In Progress.",
        )

    admin_id, admin_name = _admin_identity(current_admin)

    ticket, employee_account, now = _apply_transition(
        ticket_id,
        TicketStatus.ACCEPTED,
        TicketStatus.IN_PROGRESS,
        current_admin,
        {
            "in_progress_by": admin_id,
            "in_progress_by_name": admin_name,
        },
    )

    _notify_employee(
        ticket,
        employee_account,
        "Ticket in progress",
        f"Your ticket {ticket_id} is now In Progress.",
        now,
    )

    return _serialize_ticket(ticket)
