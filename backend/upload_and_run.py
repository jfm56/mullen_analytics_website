"""Upload synthetic SBEMS files and trigger a pipeline run."""
import json
import urllib.request
import urllib.error

AGENCY_ID = "8ef0f642-5ed7-420d-8290-ee5410c762b5"
BASE      = "http://localhost:8000"

FILES = [
    (r"D:\MullenAnalytics\ClientData\agencies\SBEMS\SBEMS_Dispatch_2022_2025.csv",  "dispatch"),
    (r"D:\MullenAnalytics\ClientData\agencies\SBEMS\SBEMS_Staffing_2022_2025.csv",  "staffing"),
]

# ── 1. Login ──────────────────────────────────────────────────────────────────
login_data = json.dumps({"email": "admin@mullenanalytics.com", "password": "Admin@Mullen1"}).encode()
req = urllib.request.Request(
    f"{BASE}/api/auth/login",
    data=login_data,
    headers={"Content-Type": "application/json"},
    method="POST",
)
with urllib.request.urlopen(req) as r:
    cookie = r.headers.get("Set-Cookie").split(";")[0]
print(f"Logged in. Cookie: {cookie[:30]}…")

# ── 2. Upload files ───────────────────────────────────────────────────────────
import email.mime.multipart, io

def upload_file(path, file_type, cookie):
    import mimetypes
    boundary = b"uploadboundary42"
    crlf = b"\r\n"

    with open(path, "rb") as fh:
        file_bytes = fh.read()

    filename = path.split("\\")[-1]
    mime = mimetypes.guess_type(filename)[0] or "application/octet-stream"

    body = (
        b"--" + boundary + crlf +
        b'Content-Disposition: form-data; name="file_type"' + crlf + crlf +
        file_type.encode() + crlf +
        b"--" + boundary + crlf +
        f'Content-Disposition: form-data; name="file"; filename="{filename}"'.encode() + crlf +
        f"Content-Type: {mime}".encode() + crlf + crlf +
        file_bytes + crlf +
        b"--" + boundary + b"--" + crlf
    )

    req = urllib.request.Request(
        f"{BASE}/api/agencies/{AGENCY_ID}/files",
        data=body,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary.decode()}",
            "Cookie": cookie,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as r:
            result = json.loads(r.read())
            print(f"  Uploaded {filename}: id={result['id']}, size={result['file_size_bytes']:,}B")
            return True
    except urllib.error.HTTPError as e:
        print(f"  Error uploading {filename}: {e.code} {e.read().decode()[:200]}")
        return False

print("\nUploading files…")
all_ok = True
for path, ftype in FILES:
    ok = upload_file(path, ftype, cookie)
    all_ok = all_ok and ok

# ── 3. Trigger pipeline run ───────────────────────────────────────────────────
if all_ok:
    print("\nTriggering pipeline run…")
    req = urllib.request.Request(
        f"{BASE}/api/agencies/{AGENCY_ID}/pipeline/run",
        data=b"{}",
        headers={"Content-Type": "application/json", "Cookie": cookie},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as r:
            run = json.loads(r.read())
            print(f"Run created: id={run['id']}, status={run['status']}")
            print(f"\nMonitor at: http://localhost:3000/platform/{AGENCY_ID}")
    except urllib.error.HTTPError as e:
        print(f"Pipeline trigger error: {e.code} {e.read().decode()[:300]}")
else:
    print("\nSkipping pipeline run due to upload errors.")
