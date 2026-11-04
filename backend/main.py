from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from admin_request_routes import router as admin_request_router
from admin_ticket_routes import (
    notification_router as admin_ticket_notification_router,
    router as admin_ticket_router,
)
from auth_routes import router as auth_router
from database import client, db, init_db_indexes
from employee_routes import router as employee_router
from employee_services import initialize_employee_ids, migrate_legacy_account_requests
from invitation_routes import router as invitation_router
from settings import ALLOWED_ORIGINS
from ticket_routes import router as ticket_router

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        client.admin.command("ping")
        print("MongoDB connected successfully!")
        init_db_indexes()
        initialize_employee_ids()
        migrate_legacy_account_requests()
    except Exception as error:
        print(f"[Warning] Could not connect to MongoDB at startup: {error}")
        print("Server will still start. Check your MONGO_URL and your MongoDB Atlas IP whitelist.")
    yield


app = FastAPI(title="Employee Management System", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(invitation_router)
app.include_router(admin_request_router)
app.include_router(admin_ticket_router)
app.include_router(admin_ticket_notification_router)
app.include_router(employee_router)
app.include_router(ticket_router)


@app.get("/")
def home():
    return {"message": "Employee Management System API is running!"}


@app.get("/db-check")
def check_database():
    try:
        client.admin.command("ping")
        return {"message": "MongoDB connection successful!", "database": db.name}
    except Exception as error:
        raise HTTPException(status_code=503, detail="Unable to connect to MongoDB") from error
