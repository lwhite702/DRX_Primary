import os
import requests
import json
from dotenv import load_dotenv

load_dotenv(".env.local")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
ANON_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

# Get token using auth_helper logic (simplified or import)
import sys
sys.path.append("testsprite_tests")
from auth_helper import get_authenticated_headers

headers = get_authenticated_headers()
if not headers:
    print("Failed to get headers")
    sys.exit(1)

token = headers["Authorization"].split(" ")[1]

print(f"Token: {token[:20]}...")

# 1. Get User ID
verify_url = f"{SUPABASE_URL}/auth/v1/user"
resp = requests.get(verify_url, headers={
    "Authorization": f"Bearer {token}",
    "apikey": ANON_KEY
})
if resp.status_code != 200:
    print(f"Failed to get user: {resp.status_code} {resp.text}")
    sys.exit(1)

user_id = resp.json().get("id")
print(f"User ID: {user_id}")

# 2. Query Business Profile
print("Querying business_profile...")
query_url = f"{SUPABASE_URL}/rest/v1/business_profile?select=*&owner_id=eq.{user_id}"
resp = requests.get(query_url, headers={
    "Authorization": f"Bearer {token}",
    "apikey": ANON_KEY
})

# 3. Test has_business_access
business = resp.json()[0]
business_id = business["id"]
print(f"Business ID: {business_id}")

rpc_url = f"{SUPABASE_URL}/rest/v1/rpc/has_business_access"
payload = {"user_id": user_id, "business_id": business_id}
print(f"Calling RPC has_business_access with {payload}")

resp = requests.post(rpc_url, json=payload, headers={
    "Authorization": f"Bearer {token}",
    "apikey": ANON_KEY
})

print(f"RPC Status: {resp.status_code}")
print(f"RPC Body: {resp.text}")

# 4. Check user_roles
print("Querying user_roles...")
roles_url = f"{SUPABASE_URL}/rest/v1/user_roles?user_id=eq.{user_id}"
resp = requests.get(roles_url, headers={
    "Authorization": f"Bearer {token}",
    "apikey": ANON_KEY
})
print(f"Roles Status: {resp.status_code}")
print(f"Roles Body: {resp.text}")
