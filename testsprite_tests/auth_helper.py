import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv(".env.local")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

TEST_EMAIL = "test_superadmin@example.com"
TEST_PASSWORD = "TestPassword123!"

def ensure_test_user(email, password, role_name):
    """Creates user and assigns role if not exists."""
    if not SUPABASE_URL or not SERVICE_KEY:
        print("Error: Missing env vars")
        return None

    admin_headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json"
    }
    
    # 1. Create/Get User
    user_id = None
    # Try creating
    create_url = f"{SUPABASE_URL}/auth/v1/admin/users"
    create_payload = {
        "email": email,
        "password": password,
        "email_confirm": True
    }
    try:
        r = requests.post(create_url, json=create_payload, headers=admin_headers)
        if r.status_code == 200:
            user_id = r.json().get("id")
        else:
            # Need to find user id if exists? 
            # Admin list users not efficient.
            # Assuming we can sign in to get ID?
            pass
    except:
        pass

    # If creation failed/exists, sign in to get ID
    if not user_id:
        auth_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
        r_auth = requests.post(auth_url, json={"email": email, "password": password}, headers={"apikey": SUPABASE_KEY, "Content-Type": "application/json"})
        if r_auth.status_code == 200:
             # decode token
             import jwt
             token = r_auth.json().get("access_token")
             decoded = jwt.decode(token, options={"verify_signature": False})
             user_id = decoded.get("sub")

    if not user_id:
        print(f"Failed to resolve user ID for {email}")
        return None

    # 2. Link to Business
    # We need a business. Use the main test business.
    # Find business owned by test_superadmin? Or create one for this user?
    # Better to add to the SAME business (Test Business).
    # Need to find 'Test Business' ID.
    
    # We need to query business_profile as admin.
    biz_query = f"{SUPABASE_URL}/rest/v1/business_profile?select=id&limit=1"
    r_biz = requests.get(biz_query, headers=admin_headers)
    business_id = None
    if r_biz.status_code == 200 and len(r_biz.json()) > 0:
        business_id = r_biz.json()[0]["id"]
    
    if not business_id:
        print("No business found to attach user to.")
        return None

    # 3. Assign Role
    role_url = f"{SUPABASE_URL}/rest/v1/user_roles"
    role_payload = {
        "user_id": user_id,
        "business_id": business_id,
        "role": role_name
    }
    role_headers = admin_headers.copy()
    role_headers["Prefer"] = "resolution=ignore-duplicates"
    requests.post(role_url, json=role_payload, headers=role_headers)
    
    return user_id



def get_authenticated_headers():
    if not SUPABASE_URL or not SERVICE_KEY:
        print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        return None

    # 1. Ensure User Exists (using Admin API)
    admin_headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json"
    }
    
    # Try creating the user (ignores error if already exists)
    # Using Gotrue Admin API: /auth/v1/admin/users
    create_url = f"{SUPABASE_URL}/auth/v1/admin/users"
    create_payload = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "email_confirm": True
    }
    
    # We don't check return value rigorously because it might fail if user exists, which is fine.
    try:
        requests.post(create_url, json=create_payload, headers=admin_headers)
    except Exception as e:
        print(f"Warning: User creation attempt failed: {e}")

    # 2. Sign In to get Access Token (using Public API)
    # We need to sign in to get the JWT
    auth_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    auth_payload = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    # For sign-in we should use the ANON key usually, but Service Key works for admin actions? 
    # Actually for regular sign in we use Anon Key path.
    auth_headers = {
        "apikey": SUPABASE_KEY, 
        "Content-Type": "application/json"
    }
    
    response = requests.post(auth_url, json=auth_payload, headers=auth_headers)
    
    if response.status_code != 200:
        print(f"Failed to sign in: {response.status_code} {response.text}")
        # Fallback: try signing in as admin/service key if possible? No, simply fail.
        return None
        
    data = response.json()
    token = data.get("access_token")
    
    if not token:
        print("No access token returned")
        return None

    # Helper: Ensure business profile exists
    try:
        import jwt
        # decode token to get sub (user_id)
        # Note: We use verify=False because we trust the token we just got from the IdP
        decoded = jwt.decode(token, options={"verify_signature": False})
        user_id = decoded.get("sub")
        
        if user_id:
            # Check if business exists
            query_url = f"{SUPABASE_URL}/rest/v1/business_profile?select=id&owner_id=eq.{user_id}"
            query_headers = {
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            r = requests.get(query_url, headers=query_headers)
            business_id = None
            if r.status_code == 200 and len(r.json()) > 0:
                business_id = r.json()[0]["id"]
            else:
                print("Creating test business profile...")
                create_biz_url = f"{SUPABASE_URL}/rest/v1/business_profile"
                biz_payload = {
                    "owner_id": user_id,
                    "business_name": "Test Business",
                    "business_type": "Retail",
                    "is_active": True
                }
                headers_with_pref = query_headers.copy()
                headers_with_pref["Prefer"] = "return=representation"
                r_create = requests.post(create_biz_url, json=biz_payload, headers=headers_with_pref)
                if r_create.status_code in (200, 201) and len(r_create.json()) > 0:
                    business_id = r_create.json()[0]["id"]
                else:
                    print(f"Warning: Failed to create business profile: {r_create.status_code} {r_create.text}")

            # Ensure 'manager' role for tests (fix for check_permission)
            if business_id:
                print(f"Assigning 'manager' role to user {user_id} for business {business_id}...")
                role_url = f"{SUPABASE_URL}/rest/v1/user_roles"
                role_payload = {
                    "user_id": user_id,
                    "business_id": business_id,
                    "role": "manager"
                }
                # Use admin headers for role assignment
                role_headers = admin_headers.copy()
                role_headers["Prefer"] = "resolution=ignore-duplicates"
                r_role = requests.post(role_url, json=role_payload, headers=role_headers)
                if r_role.status_code not in (200, 201, 204):
                     print(f"Warning: Failed to assign role: {r_role.status_code} {r_role.text}")
    except Exception as e:
        print(f"Warning: Business profile setup error: {e}")

    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

if __name__ == "__main__":
    headers = get_authenticated_headers()
    if headers:
        print("Successfully obtained token!")
        print(f"Token (trunc): {headers['Authorization'][:20]}...")
    else:
        print("Failed to get token.")
