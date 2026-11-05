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

## OCR document reader

`ocr_service.py` runs image and scanned-PDF OCR on the API server with
`pytesseract` calling the native Tesseract engine. Python packages are listed
in `requirements.txt`; Tesseract itself and its language data are system
packages and must be installed separately. This project does not use a
Dockerfile. For local development, install Tesseract and the language models
you need on the PC, then make sure `tesseract.exe` is on `PATH`.

For a native Render service, use a Python runtime and install both the system
Tesseract packages and Python requirements in the service build command. For
example, on Render's Debian runtime:

```sh
apt-get update && apt-get install -y tesseract-ocr tesseract-ocr-osd tesseract-ocr-eng tesseract-ocr-hin tesseract-ocr-ben tesseract-ocr-guj tesseract-ocr-kan tesseract-ocr-mal tesseract-ocr-mar tesseract-ocr-nep tesseract-ocr-ori tesseract-ocr-pan tesseract-ocr-san tesseract-ocr-tam tesseract-ocr-tel && pip install -r requirements.txt
```

Adjust the installed language packages to match the scripts you intend to
recognize. The OCR feature cannot run on a deployment where only the Python
requirements were installed and the native Tesseract executable is missing.

OCR accepts images and PDFs up to 10 MB (PDFs up to 12 pages). Employees can
upload multiple documents and label each one. Source files are stored under
`uploads/ocr/` and can be opened or downloaded by the employee and admins.
Only admins can run OCR on an uploaded document; each run stores the extracted
text in a `.txt` file beside the source file.

Keep the backend `.env` file local. Do not commit provider passwords or JWT
secrets.
