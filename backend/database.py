
import os

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")
DATABASE_NAME = os.getenv("DATABASE_NAME", "employee_db")

if not MONGO_URL:
    raise ValueError(
        "MONGO_URL is missing. Please configure it in your backend .env file."
    )

client = MongoClient(
    MONGO_URL,
    serverSelectionTimeoutMS=5000
)

db = client[DATABASE_NAME]

# Collections used by the application
users_collection = db["users"]
employees_collection = db["employees"]


def check_database_connection():
    """Check whether MongoDB is reachable."""
    client.admin.command("ping")
    return True


def init_db_indexes():
    """
    Ensure unique indexes on email for both users and employees.
    Gracefully catches errors if existing duplicates prevent index creation.
    """
    try:
        users_collection.create_index("email", unique=True)
        employees_collection.create_index("email", unique=True)
        print("MongoDB unique email indexes successfully initialized.")
    except Exception as e:
        print(f"[Warning] Could not apply unique email index: {e}")
        print("Please clean duplicate test records from MongoDB Atlas to enable strict unique indexing.")

