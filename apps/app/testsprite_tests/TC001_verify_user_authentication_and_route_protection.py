import requests
from requests.exceptions import RequestException

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_verify_user_authentication_and_route_protection():
    login_url = f"{BASE_URL}/api/login"
    protected_url = f"{BASE_URL}/api/protected-resource"
    headers = {"Content-Type": "application/json"}

    # Test credentials for different roles
    users = {
        "cashier": {"username": "cashier_user", "password": "cashier_pass"},
        "supervisor": {"username": "supervisor_user", "password": "supervisor_pass"},
        "manager": {"username": "manager_user", "password": "manager_pass"},
        "superadmin": {"username": "superadmin_user", "password": "superadmin_pass"},
        "invalid": {"username": "invalid_user", "password": "wrong_pass"}
    }

    def login(user_credentials):
        try:
            resp = requests.post(login_url, json=user_credentials, headers=headers, timeout=TIMEOUT)
            resp.raise_for_status()
            json_data = resp.json()
            assert "token" in json_data, "Login response missing token"
            return json_data["token"]
        except RequestException as e:
            raise AssertionError(f"Login request failed: {e}")

    def access_protected(token):
        try:
            auth_headers = {"Authorization": f"Bearer {token}"}
            resp = requests.get(protected_url, headers=auth_headers, timeout=TIMEOUT)
            return resp
        except RequestException as e:
            raise AssertionError(f"Protected resource request failed: {e}")

    # 1. Attempt login with invalid credentials and expect failure
    try:
        resp = requests.post(login_url, json=users["invalid"], headers=headers, timeout=TIMEOUT)
        assert resp.status_code in (401, 403), "Invalid login should be unauthorized or forbidden"
    except RequestException as e:
        raise AssertionError(f"Invalid login request failed unexpectedly: {e}")

    # 2. Login each valid role and verify token received and access control
    tokens = {}
    for role in ["cashier", "supervisor", "manager", "superadmin"]:
        token = login(users[role])
        assert isinstance(token, str) and len(token) > 10, f"Invalid token for role {role}"
        tokens[role] = token

    # 3. Verify that access to protected route without token is denied
    try:
        resp_no_auth = requests.get(protected_url, timeout=TIMEOUT)
        assert resp_no_auth.status_code == 401 or resp_no_auth.status_code == 403, \
            "Access without auth token should be denied"
    except RequestException as e:
        raise AssertionError(f"Request to protected resource without token failed: {e}")

    # 4. Verify that each role can or cannot access the protected route according to their permissions
    # Assuming:
    # - Cashier : access allowed
    # - Supervisor : access allowed
    # - Manager : access allowed
    # - Super Admin : access allowed
    # If any role is restricted for certain endpoints in real API, adjust assertions accordingly.

    for role, token in tokens.items():
        resp = access_protected(token)
        assert resp.status_code == 200, f"Role {role} failed to access protected route"
        # Optionally validate response structure or role-specific data
        data = resp.json()
        assert "user" in data and data["user"]["role"] == role.capitalize(), \
            f"Returned user role mismatch for {role}"

    # 5. Verify that token session management works by reusing token
    # Using cashier token again to access protected route
    resp_repeat = access_protected(tokens["cashier"])
    assert resp_repeat.status_code == 200, "Reusing token failed for session persistence"

test_verify_user_authentication_and_route_protection()