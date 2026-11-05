from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Literal

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)


class EmployeeCreate(BaseModel):
    email: EmailStr


class EmployeeInviteComplete(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    department: str = Field(min_length=1, max_length=100)
    contact_number: str = Field(default="", max_length=50)
    address: str = Field(default="", max_length=500)
    password: str = Field(min_length=8, max_length=128)


class EmployeeUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    department: str = Field(min_length=1, max_length=100)
    contact_number: str = ""
    address: str = ""


class UserSignup(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    department: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class SetPassword(BaseModel):
    password: str = Field(min_length=8, max_length=128)


class DeactivateEmployee(BaseModel):
    duration_days: int = Field(ge=1, le=365)


class ChangePassword(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class ResumeUpload(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    file_data: str


class EmployeeDocumentUpload(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    file_data: str = Field(min_length=1, max_length=14_000_000)
    document_label: str = Field(min_length=1, max_length=100)


class EmployeeDocumentLabelUpdate(BaseModel):
    document_label: str = Field(min_length=1, max_length=100)


class ProfilePhotoUpload(BaseModel):
    file_data: str = Field(min_length=1)


class TicketStatus(str, Enum):
    PENDING = "Pending"
    ACCEPTED = "Accepted"
    DECLINED = "Declined"
    IN_PROGRESS = "In Progress"
    CLOSED = "Closed"


class TicketStatusHistoryEntry(BaseModel):
    status: TicketStatus
    changed_by: str = Field(min_length=1, max_length=100)
    changed_by_role: Literal["admin", "employee"]
    changed_at: datetime = Field(default_factory=lambda: datetime.now(timezone(timedelta(hours=5, minutes=30))))
    note: str = Field(default="", max_length=1000)


class TicketCreate(BaseModel):
    phone_number: str = Field(min_length=1, max_length=50)
    description: str = Field(min_length=1, max_length=5000)

    @field_validator("phone_number")
    @classmethod
    def phone_number_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Phone number must not be blank.")
        return value

    @field_validator("description")
    @classmethod
    def description_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Description must not be blank.")
        return value


class TicketRecord(BaseModel):
    ticket_id: str = Field(min_length=1, max_length=100)
    employee_id: str = Field(min_length=1, max_length=100)
    employee_name: str = Field(min_length=1, max_length=100)
    employee_email: EmailStr
    employee_phone: str = Field(default="", max_length=50)
    description: str = Field(min_length=1, max_length=5000)
    status: TicketStatus = TicketStatus.PENDING
    decline_reason: str = Field(default="", max_length=1000)
    accepted_by: str | None = Field(default=None, max_length=100)
    accepted_by_name: str | None = Field(default=None, max_length=100)
    accepted_at: datetime | None = None
    declined_by: str | None = Field(default=None, max_length=100)
    declined_by_name: str | None = Field(default=None, max_length=100)
    declined_at: datetime | None = None
    in_progress_by: str | None = Field(default=None, max_length=100)
    in_progress_by_name: str | None = Field(default=None, max_length=100)
    in_progress_at: datetime | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone(timedelta(hours=5, minutes=30))))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone(timedelta(hours=5, minutes=30))))
    closed_at: datetime | None = None
    closed_by: str | None = Field(default=None, max_length=100)
    closed_by_name: str | None = Field(default=None, max_length=100)
    status_history: list[TicketStatusHistoryEntry] = Field(default_factory=list)


class TicketStatusUpdate(BaseModel):
    status: TicketStatus
    decline_reason: str = Field(default="", max_length=1000)

    @model_validator(mode="after")
    def declined_ticket_requires_reason(self) -> "TicketStatusUpdate":
        self.decline_reason = self.decline_reason.strip()
        if self.status == TicketStatus.DECLINED and not self.decline_reason:
            raise ValueError("A decline reason is required when declining a ticket.")
        return self


class TicketDecline(BaseModel):
    reason: str = Field(min_length=1, max_length=1000)

    @field_validator("reason")
    @classmethod
    def reason_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("A decline reason is required.")
        return value


class TicketMessageCreate(BaseModel):
    message: str = Field(min_length=1, max_length=5000)

    @field_validator("message")
    @classmethod
    def message_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message must not be blank.")
        return value


class TicketMessageRecord(BaseModel):
    ticket_id: str = Field(min_length=1, max_length=100)
    sender_id: str = Field(min_length=1, max_length=100)
    sender_role: Literal["admin", "employee"]
    sender_name: str = Field(min_length=1, max_length=100)
    message: str = Field(min_length=1, max_length=5000)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone(timedelta(hours=5, minutes=30))))


class TicketNotificationRecord(BaseModel):
    notification_id: str = Field(min_length=1, max_length=100)
    recipient_id: str = Field(min_length=1, max_length=100)
    recipient_role: Literal["admin", "employee"]
    ticket_id: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1, max_length=2000)
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone(timedelta(hours=5, minutes=30))))
