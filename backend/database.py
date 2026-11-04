import os

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

# Read MongoDB URL from .env file
MONGO_URL = os.getenv("MONGO_URL")

if not MONGO_URL:
    raise ValueError("MONGO_URL is missing. Please add it to your backend .env file.")

# Connect to MongoDB Atlas
# tlsAllowInvalidCertificates=True fixes SSL handshake errors on some networks/Python versions
client = MongoClient(
    MONGO_URL,
    serverSelectionTimeoutMS=10000,
    tlsAllowInvalidCertificates=True
)

# Select the database and collections
db = client["employee_management"]
users_collection = db["users"]
employees_collection = db["employees"]
account_requests_collection = db["account_requests"]
employee_invites_collection = db["employee_invites"]
tickets_collection = db["tickets"]
ticket_messages_collection = db["ticket_messages"]
ticket_notifications_collection = db["ticket_notifications"]


def init_db_indexes():
    """Create indexes used by account and ticket collections."""
    try:
        users_collection.create_index("email", unique=True)
        employees_collection.create_index("email", unique=True)
        employees_collection.create_index(
            "employee_id",
            unique=True,
            partialFilterExpression={"employee_id": {"$type": "string"}},
        )
        account_requests_collection.create_index("email", unique=True)
        employee_invites_collection.create_index("token_hash", unique=True)
        employee_invites_collection.create_index("expires_at", expireAfterSeconds=0)
        tickets_collection.create_index("ticket_id", unique=True)
        tickets_collection.create_index(
            [("employee_id", 1), ("created_at", -1)]
        )
        tickets_collection.create_index(
            [("status", 1), ("created_at", -1)]
        )
        tickets_collection.create_index("accepted_by")
        ticket_messages_collection.create_index(
            [("ticket_id", 1), ("timestamp", 1)]
        )
        ticket_notifications_collection.create_index(
            "notification_id",
            unique=True,
        )
        ticket_notifications_collection.create_index(
            [
                ("recipient_id", 1),
                ("recipient_role", 1),
                ("is_read", 1),
                ("created_at", -1),
            ]
        )
        ticket_notifications_collection.create_index("ticket_id")
        print("MongoDB indexes created successfully.")
    except Exception as e:
        print(f"[Warning] Could not create indexes: {e}")
