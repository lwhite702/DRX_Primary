import requests
import uuid
import os
import sys
import time

# Add current directory to path to import auth_helper
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from auth_helper import get_authenticated_headers, ensure_test_user, SUPABASE_URL, SUPABASE_KEY

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def get_token_for_user(email, password):
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    payload = {
        "email": email,
        "password": password,
    }
    headers = {
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json"
    }
    resp = requests.post(url, json=payload, headers=headers)
    if resp.status_code == 200:
        return resp.json().get("access_token")
    return None

def test_team_management_role_based_permissions():
    # 1. Get Manager Headers (Default)
    manager_headers = get_authenticated_headers()
    assert manager_headers, "Failed to get manager headers"

    # 2. Setup Cashier User
    cashier_email = f"test_cashier_{uuid.uuid4().hex[:8]}@example.com"
    cashier_password = "TestPassword123!"
    # Ensure user exists and has cashier role
    ensure_test_user(cashier_email, cashier_password, "cashier")
    
    cashier_token = get_token_for_user(cashier_email, cashier_password)
    assert cashier_token, "Failed to get cashier token"
    cashier_headers = {
        "Authorization": f"Bearer {cashier_token}",
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY
    }

    team_member_id = None
    try:
        # 3. Add a new team member (as Manager)
        new_member_email = f"new_member_{uuid.uuid4().hex[:8]}@example.com"
        add_payload = {
            "name": "New Team Member",
            "email": new_member_email,
            "role": "Cashier"
        }
        add_resp = requests.post(
            f"{BASE_URL}/api/team/members",
            headers=manager_headers,
            json=add_payload,
            timeout=TIMEOUT,
        )
        assert add_resp.status_code == 201, f"Failed to add team member: {add_resp.text}"
        added_member = add_resp.json()
        team_member_id = added_member.get("id")
        assert team_member_id is not None, "Added team member ID missing"

        # 4. Verify role-based permission: Unauthorized update (as Cashier)
        update_payload_unauth = {"role": "Manager"}
        update_resp_unauth = requests.put(
            f"{BASE_URL}/api/team/members/{team_member_id}/role",
            headers=cashier_headers, # Using Cashier headers
            json=update_payload_unauth,
            timeout=TIMEOUT,
        )
        # Expect 403 Forbidden
        assert update_resp_unauth.status_code in (403, 401), \
            f"Cashier was able to update role! Status: {update_resp_unauth.status_code}"

        # 5. Update team member role (as Manager)
        update_payload_auth = {"role": "Supervisor"}
        update_resp_auth = requests.put(
            f"{BASE_URL}/api/team/members/{team_member_id}/role",
            headers=manager_headers,
            json=update_payload_auth,
            timeout=TIMEOUT,
        )
        assert update_resp_auth.status_code == 200, f"Failed to update role: {update_resp_auth.text}"
        updated_member = update_resp_auth.json()
        assert updated_member.get("role") == "Supervisor", "Team member role not updated correctly"

        # 6. Get audit logs (as Manager)
        audit_resp = requests.get(
            f"{BASE_URL}/api/team/members/{team_member_id}/audit-logs",
            headers=manager_headers,
            timeout=TIMEOUT,
        )
        assert audit_resp.status_code == 200, f"Failed to fetch audit logs: {audit_resp.text}"
        audit_logs = audit_resp.json()
        assert isinstance(audit_logs, list), "Audit logs should be a list"
        
        # Check logs for role update
        # Adjust check based on actual log structure (resource_id/entity_id)
        role_change_logged = any(
            (log.get("action") == "role_update" or log.get("transaction_type") == "role_update") and 
            (log.get("entity_id") == team_member_id or log.get("resource_id") == team_member_id)
            for log in audit_logs
        )
        assert role_change_logged, f"Role update not logged. Logs: {audit_logs}"

        # 7. Remove team member (as Manager)
        del_resp = requests.delete(
            f"{BASE_URL}/api/team/members/{team_member_id}",
            headers=manager_headers,
            timeout=TIMEOUT,
        )
        assert del_resp.status_code == 204, f"Failed to delete team member: {del_resp.text}"

        # 8. Verify deletion (GET returns 404)
        get_resp = requests.get(
            f"{BASE_URL}/api/team/members/{team_member_id}",
            headers=manager_headers,
            timeout=TIMEOUT,
        )
        assert get_resp.status_code == 404, f"Deleted member found? {get_resp.status_code}"

    except Exception as e:
        raise e
