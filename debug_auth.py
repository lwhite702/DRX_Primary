import os
import sys
import jwt
from dotenv import load_dotenv

# Load env from .env.local in current dir
load_dotenv(".env.local")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
ANON_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

print(f"SUPABASE_URL: {SUPABASE_URL}")
print(f"ANON_KEY length: {len(ANON_KEY) if ANON_KEY else 0}")

# Import auth_helper
sys.path.append("testsprite_tests")
try:
    from auth_helper import get_authenticated_headers
    headers = get_authenticated_headers()
    if headers:
        token = headers["Authorization"].split(" ")[1]
        print(f"Token: {token[:20]}...")
        
        # Decode without verification to see claims
        decoded = jwt.decode(token, options={"verify_signature": False})
        print(f"Token Issuer: {decoded.get('iss')}")
        print(f"Token Aud: {decoded.get('aud')}")

        # Verify against Supabase directly
        print("Verifying against Supabase API...")
        import requests
        verify_url = f"{SUPABASE_URL}/auth/v1/user"
        resp = requests.get(verify_url, headers={
            "Authorization": f"Bearer {token}",
            "apikey": ANON_KEY
        })
        print(f"Verify Status: {resp.status_code}")
        print(f"Verify Body: {resp.text[:200]}...")
    else:
        print("Failed to get headers")
except Exception as e:
    print(f"Error: {e}")
