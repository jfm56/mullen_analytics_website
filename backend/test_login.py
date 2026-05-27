"""Test login against Railway backend."""
import http.client, json

conn = http.client.HTTPSConnection("mullenanalyticswebsite-production.up.railway.app")
conn.request(
    "POST",
    "/api/auth/login",
    json.dumps({"email": "admin@mullenanalytics.com", "password": "admin123"}),
    {"Content-Type": "application/json", "Accept": "application/json"},
)
r = conn.getresponse()
body = r.read().decode()
print("Status:", r.status)
print("Headers:")
for h, v in r.getheaders():
    print(f"  {h}: {v}")
print("Body:", body)
