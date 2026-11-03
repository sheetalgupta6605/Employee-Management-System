import os
import smtplib
import ssl
from dotenv import load_dotenv

load_dotenv()

host = os.getenv("SMTP_HOST")
username = os.getenv("SMTP_USERNAME")
password = os.getenv("SMTP_PASSWORD", "").replace(" ", "")

print("Username configured:", bool(username))
print("Password configured:", bool(password))
print("Password length:", len(password))

try:
    print("\nConnecting to Gmail...")

    with smtplib.SMTP(host, 587, timeout=30) as server:

        print("SMTP connection established")

        server.ehlo()
        print("EHLO successful")

        server.starttls(
            context=ssl.create_default_context()
        )
        print("TLS encryption successful")

        server.ehlo()
        print("Secure EHLO successful")

        server.login(username, password)
        print("GMAIL AUTHENTICATION SUCCESSFUL!")

except Exception as e:
    print("\nFAILED AT SMTP STAGE")
    print("Error type:", type(e).__name__)
    print("Error details:", str(e))