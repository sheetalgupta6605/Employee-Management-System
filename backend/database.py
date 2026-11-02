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


def init_db_indexes():
    """Create unique indexes on email to prevent duplicate accounts."""
    try:
        users_collection.create_index("email", unique=True)
        employees_collection.create_index("email", unique=True)
        print("MongoDB indexes created successfully.")
    except Exception as e:
        print(f"[Warning] Could not create indexes: {e}")
