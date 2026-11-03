from pydantic import BaseModel, EmailStr, Field


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


class ProfilePhotoUpload(BaseModel):
    file_data: str = Field(min_length=1)
