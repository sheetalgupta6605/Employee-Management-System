# from datetime import datetime

# from fastapi import HTTPException

# from database import (
#     client,
#     ticket_messages_collection,
#     ticket_notifications_collection,
#     tickets_collection,
# )
# from models import TicketMessageRecord, TicketNotificationRecord, TicketStatus


# def save_ticket_message(
#     ticket_query: dict,
#     message: TicketMessageRecord,
#     notifications: list[TicketNotificationRecord],
# ) -> None:
#     open_ticket_query = {
#         **ticket_query,
#         "status": {"$ne": TicketStatus.CLOSED.value},
#     }
#     timestamp: datetime = message.timestamp

#     with client.start_session() as session:
#         with session.start_transaction():
#             ticket = tickets_collection.find_one(
#                 open_ticket_query,
#                 {"_id": 1},
#                 session=session,
#             )
#             if ticket is None:
#                 exists = tickets_collection.find_one(
#                     ticket_query,
#                     {"_id": 1},
#                     session=session,
#                 )
#                 if exists is None:
#                     raise HTTPException(status_code=404, detail="Ticket not found")
#                 raise HTTPException(
#                     status_code=409,
#                     detail="Closed tickets cannot receive messages",
#                 )

#             result = tickets_collection.update_one(
#                 open_ticket_query,
#                 {
#                     "$inc": {"message_count": 1},
#                     "$set": {
#                         "last_message_at": timestamp,
#                         "updated_at": timestamp,
#                     },
#                 },
#                 session=session,
#             )
#             if result.matched_count != 1:
#                 raise HTTPException(
#                     status_code=409,
#                     detail="Ticket status changed before the message could be saved.",
#                 )

#             ticket_messages_collection.insert_one(
#                 message.model_dump(mode="python"),
#                 session=session,
#             )
#             for notification in notifications:
#                 ticket_notifications_collection.insert_one(
#                     notification.model_dump(mode="python"),
#                     session=session,
#                 )




from datetime import datetime

from fastapi import HTTPException

from database import (
    client,
    ticket_messages_collection,
    ticket_notifications_collection,
    tickets_collection,
)

from models import (
    TicketMessageRecord,
    TicketNotificationRecord,
    TicketStatus,
)


def save_ticket_message(
    ticket_query: dict,
    message: TicketMessageRecord,
    notifications: list[TicketNotificationRecord],
) -> None:

    open_ticket_query = {
        **ticket_query,
        "status": {"$ne": TicketStatus.CLOSED.value},
    }

    timestamp: datetime = message.timestamp

    with client.start_session() as session:
        with session.start_transaction():

            ticket = tickets_collection.find_one(
                open_ticket_query,
                {"_id": 1},
                session=session,
            )

            if ticket is None:
                exists = tickets_collection.find_one(
                    ticket_query,
                    {"_id": 1},
                    session=session,
                )

                if exists is None:
                    raise HTTPException(
                        status_code=404,
                        detail="Ticket not found",
                    )

                raise HTTPException(
                    status_code=409,
                    detail="Closed tickets cannot receive messages",
                )

            result = tickets_collection.update_one(
                open_ticket_query,
                {
                    "$inc": {"message_count": 1},
                    "$set": {
                        "last_message_at": timestamp,
                        "updated_at": timestamp,
                    },
                },
                session=session,
            )

            if result.matched_count != 1:
                raise HTTPException(
                    status_code=409,
                    detail="Ticket status changed before the message could be saved.",
                )

            ticket_messages_collection.insert_one(
                message.model_dump(mode="python"),
                session=session,
            )

            for notification in notifications:
                ticket_notifications_collection.insert_one(
                    notification.model_dump(mode="python"),
                    session=session,
                )
