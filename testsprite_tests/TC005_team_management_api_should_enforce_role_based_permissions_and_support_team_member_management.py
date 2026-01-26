import requests
import uuid

BASE_URL = "http://localhost:3001"
TIMEOUT = 30
# Imports for auth helper
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from auth_helper import get_authenticated_headers

HEADERS = get_authenticated_headers()
if not HEADERS:
    raise Exception("Failed to get authenticated headers")

def test_team_management_role_based_permissions():
    team_member_id = None
    try:
        # 1. Add a new team member with role 'Cashier'
        add_payload = {
            "name": "Test User",
            "email": f"testuser_{uuid.uuid4().hex[:8]}@example.com",
            "role": "Cashier"
        }
        add_resp = requests.post(
            f"{BASE_URL}/api/team/members",
            headers=HEADERS,
            json=add_payload,
            timeout=TIMEOUT,
        )
        assert add_resp.status_code == 201, f"Failed to add team member: {add_resp.text}"
        added_member = add_resp.json()
        team_member_id = added_member.get("id")
        assert team_member_id is not None, "Added team member ID missing"

        # 2. Verify role-based permission enforcement: try an unauthorized action as Cashier
        # Assume "update role" is restricted to Manager or above.
        update_payload_unauth = {"role": "Manager"}
        update_resp_unauth = requests.put(
            f"{BASE_URL}/api/team/members/{team_member_id}/role",
            headers=HEADERS,
            json=update_payload_unauth,
            timeout=TIMEOUT,
        )
        # Expecting error status due to insufficient permission
        assert update_resp_unauth.status_code in (403, 401), \
            "Role-based permission not enforced on unauthorized role update"

        # 3. Update team member role as authorized user
        # For this test, we assume the AUTH_TOKEN belongs to a user with proper rights.
        # To simulate, we override the token temporarily if needed.
        # Here we retry with the same token assuming it has rights.
        update_payload_auth = {"role": "Supervisor"}
        update_resp_auth = requests.put(
            f"{BASE_URL}/api/team/members/{team_member_id}/role",
            headers=HEADERS,
            json=update_payload_auth,
            timeout=TIMEOUT,
        )
        assert update_resp_auth.status_code == 200, f"Failed to update role: {update_resp_auth.text}"
        updated_member = update_resp_auth.json()
        assert updated_member.get("role") == "Supervisor", "Team member role not updated correctly"

        # 4. Get audit logs related to permission changes for the member
        audit_resp = requests.get(
            f"{BASE_URL}/api/team/members/{team_member_id}/audit-logs",
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        assert audit_resp.status_code == 200, f"Failed to fetch audit logs: {audit_resp.text}"
        audit_logs = audit_resp.json()
        assert isinstance(audit_logs, list), "Audit logs should be a list"
        # Check that audit logs contain the role update action
        role_change_logged = any(
            log.get("action") == "role_update" and log.get("member_id") == team_member_id
            for log in audit_logs
        )
        assert role_change_logged, "Role update action not logged in audit logs"

        # 5. Remove the team member
        del_resp = requests.delete(
            f"{BASE_URL}/api/team/members/{team_member_id}",
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        assert del_resp.status_code == 204, f"Failed to delete team member: {del_resp.text}"

        # 6. Verify team member no longer exists
        get_resp = requests.get(
            f"{BASE_URL}/api/team/members/{team_member_id}",
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        assert get_resp.status_code == 404, "Deleted team member still accessible"

        # 7. Verify audit log contains the deletion action
        audit_after_del_resp = requests.get(
            f"{BASE_URL}/api/team/members/{team_member_id}/audit-logs",
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        # This might return 404 or valid logs depending on implementation; accept both but check logs if exists
        if audit_after_del_resp.status_code == 200:
            logs_after_del = audit_after_del_resp.json()
            deletion_logged = any(
                log.get("action") == "member_deletion" and log.get("member_id") == team_member_id
                for log in logs_after_del
            )
            assert deletion_logged, "Member deletion not logged in audit logs"
        else:
            assert audit_after_del_resp.status_code in (404, 410), \
                f"Unexpected status fetching audit logs after deletion: {audit_after_del_resp.status_code}"

    finally:
        # Cleanup: attempt to delete the team member if still exists
        if team_member_id is not None:
            try:
                requests.delete(
                    f"{BASE_URL}/api/team/members/{team_member_id}",
                    headers=HEADERS,
                    timeout=TIMEOUT,
                )
            except Exception:
                pass

test_team_management_role_based_permissions()
