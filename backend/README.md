# Backend modules

Run the API from this directory so the existing frontend can continue using
`http://127.0.0.1:8000`:

```text
python -m uvicorn main:app --reload
```

The frontend API paths and response shapes are unchanged.

- `main.py` creates the FastAPI app, configures CORS and startup, and mounts the
  feature routers.
- `auth_routes.py` contains `/auth/...` endpoints and is mounted by `main.py`.
- `invitation_routes.py` contains employee invitation and account-completion
  endpoints.
- `admin_request_routes.py` contains admin account-request review endpoints.
- `employee_routes.py` contains employee profile, resume, directory, and
  employee-management endpoints.
- `models.py` contains request validation models shared by endpoints.
- `employee_services.py` contains employee ID, profile-image, and employee
  lookup/migration helpers.
- `email_service.py` sends employee invitation messages using SMTP settings
  from `.env`.
- `auth.py` handles password hashing, JWTs, and role/access checks.
- `database.py` configures MongoDB collections and indexes.

Keep the backend `.env` file local. Do not commit provider passwords or JWT
secrets.
