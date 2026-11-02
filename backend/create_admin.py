
from getpass import getpass
from datetime import datetime, timezone

from pymongo.errors import DuplicateKeyError

from database import users_collection
from auth import hash_password


print("Create First Admin Account")

name = input("Enter admin name: ").strip()
email = input("Enter admin email: ").lower().strip()
password = getpass("Enter admin password: ")
confirm_password = getpass("Confirm admin password: ")

if not name or not email or not password:
    raise SystemExit("All fields are required.")

if password != confirm_password:
    raise SystemExit("Passwords do not match.")

if len(password) < 8:
    raise SystemExit("Password must be at least 8 characters long.")

if users_collection.find_one({"email": email}):
    raise SystemExit("An account with this email already exists.")

admin = {
    "name": name,
    "email": email,
    "password": hash_password(password),
    "role": "admin",
    "created_at": datetime.now(timezone.utc),
}

try:
    result = users_collection.insert_one(admin)
    print("Admin created successfully!")
    print("Admin ID:", result.inserted_id)

except DuplicateKeyError:
    print("An account with this email already exists.")
