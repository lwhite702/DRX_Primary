import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

# Sample users with roles and their credentials (assuming username/password)
USERS = {
    "cashier": {"username": "cashier_user", "password": "cashier_pass"},
    "supervisor": {"username": "supervisor_user", "password": "supervisor_pass"},
    "manager": {"username": "manager_user", "password": "manager_pass"},
    "super_admin": {"username": "super_admin_user", "password": "super_admin_pass"},
}

# Actions to test role enforcement (action: endpoint, method, sample payload)
# These are sensitive actions restricted by role
ACTIONS = {
    "price_override": {
        "endpoint": "/sales/override-price",
        "method": "POST",
        "payload": {"sale_id": 1, "new_price": 9.99},
    },
    "inventory_adjustment": {
        "endpoint": "/inventory/adjust",
        "method": "POST",
        "payload": {"product_id": 1, "adjustment": 5, "reason": "test adjustment"},
    },
    "void_transaction": {
        "endpoint": "/sales/void",
        "method": "POST",
        "payload": {"sale_id": 1},
    },
    "permission_change": {
        "endpoint": "/admin/permissions/change",
        "method": "POST",
        "payload": {"user_id": 2, "new_role": "cashier"},
    },
    "view_audit_logs": {
        "endpoint": "/admin/audit-logs",
        "method": "GET",
        "payload": None,
    },
}

# Role permission matrix
# True means the role is allowed to perform the action, False means forbidden
ROLE_PERMISSIONS = {
    "cashier": {
        "price_override": False,
        "inventory_adjustment": False,
        "void_transaction": False,
        "permission_change": False,
        "view_audit_logs": False,
    },
    "supervisor": {
        "price_override": True,
        "inventory_adjustment": True,
        "void_transaction": True,
        "permission_change": False,
        "view_audit_logs": False,
    },
    "manager": {
        "price_override": True,
        "inventory_adjustment": True,
        "void_transaction": True,
        "permission_change": True,
        "view_audit_logs": True,
    },
    "super_admin": {
        # All allowed for super admin
        "price_override": True,
        "inventory_adjustment": True,
        "void_transaction": True,
        "permission_change": True,
        "view_audit_logs": True,
    },
}


def authenticate(username, password):
    url = f"{BASE_URL}/login"
    payload = {"username": username, "password": password}
    resp = requests.post(url, json=payload, timeout=TIMEOUT)
    try:
        resp.raise_for_status()
    except requests.HTTPError as e:
        assert False, f"Authentication request failed with status {resp.status_code}"

    content_type = resp.headers.get('Content-Type', '')
    if 'application/json' not in content_type:
        assert False, f"Authentication response is not JSON: {resp.text}"

    json_resp = resp.json()
    token = json_resp.get("access_token")
    assert token, "Authentication failed: no access_token returned"
    return token


def perform_action(token, action_key):
    action = ACTIONS[action_key]
    url = f"{BASE_URL}{action['endpoint']}"
    headers = {"Authorization": f"Bearer {token}"}
    method = action["method"]
    payload = action["payload"]

    if method == "POST":
        resp = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    elif method == "GET":
        resp = requests.get(url, headers=headers, timeout=TIMEOUT)
    else:
        raise ValueError(f"Unsupported HTTP method {method} in actions")

    return resp


def test_validate_role_based_access_control_enforcement():
    for role, creds in USERS.items():
        token = authenticate(creds["username"], creds["password"])

        for action_key, allowed in ROLE_PERMISSIONS[role].items():
            resp = perform_action(token, action_key)

            if allowed:
                # Successful action should return 2xx
                assert 200 <= resp.status_code < 300, (
                    f"Role '{role}' was allowed '{action_key}' but received "
                    f"status code {resp.status_code}."
                )

                # Optionally verify expected response structure
                if resp.status_code != 204:
                    content_type = resp.headers.get('Content-Type', '')
                    if 'application/json' in content_type:
                        json_resp = resp.json()
                        assert "success" in json_resp, (
                            f"Role '{role}' action '{action_key}' response structure invalid."
                        )
            else:
                # Forbidden action should return 403 or 401
                assert resp.status_code in (401, 403), (
                    f"Role '{role}' was NOT allowed '{action_key}' but received "
                    f"status code {resp.status_code} instead of 401/403."
                )


test_validate_role_based_access_control_enforcement()
