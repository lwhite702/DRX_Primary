import requests
import time

BASE_URL = "http://localhost:3001"
TIMEOUT = 30
HEADERS = {"Content-Type": "application/json"}

# Helper function to authenticate as different roles to perform sensitive actions
def authenticate(username: str, password: str):
    try:
        resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": username, "password": password},
            timeout=TIMEOUT,
            headers=HEADERS,
        )
        resp.raise_for_status()
        token = resp.json().get("accessToken")
        assert token, "Authentication failed: No access token returned"
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    except Exception as e:
        raise RuntimeError(f"Authentication failed for {username}: {e}")

def test_audit_log_generation_for_sensitive_actions():
    price_override_headers = None
    inventory_adjust_headers = None
    void_refund_headers = None
    perm_change_headers = None

    # Authenticate users with necessary roles
    try:
        price_override_headers = authenticate("supervisor_user", "supervisor_password")
        inventory_adjust_headers = authenticate("supervisor_user", "supervisor_password")
        void_refund_headers = authenticate("supervisor_user", "supervisor_password")
        perm_change_headers = authenticate("super_admin_user", "superadmin_password")
    except RuntimeError as e:
        assert False, str(e)

    created_transaction_id = None
    created_inventory_id = None
    created_user_id = None

    try:
        # 1) Price override: create a sale with override price
        sale_payload = {
            "items": [
                {
                    "productId": "prod-001",
                    "quantity": 2,
                    "unitPrice": 10.00,
                    "overridePrice": 8.50
                }
            ],
            "paymentMethod": "cash"
        }
        resp = requests.post(
            f"{BASE_URL}/api/sales",
            json=sale_payload,
            headers=price_override_headers,
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        sale_data = resp.json()
        created_transaction_id = sale_data.get("transactionId")
        assert created_transaction_id, "Sale creation did not return transactionId"

        time.sleep(1)  # allow audit log to finalize

        # Verify audit log entry for price override
        resp = requests.get(
            f"{BASE_URL}/api/audit_logs",
            params={"entityType": "sale", "entityId": created_transaction_id, "actionType": "price_override"},
            headers=price_override_headers,
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        logs = resp.json()
        assert any(log.get("immutable") and log.get("action") == "price_override" for log in logs), \
            "No immutable audit log found for price override on sale"

        # 2) Inventory adjustment
        # First, create inventory item to adjust
        inventory_payload = {
            "productId": "prod-001",
            "quantity": 100,
            "location": "main_warehouse"
        }
        resp = requests.post(
            f"{BASE_URL}/api/inventory",
            json=inventory_payload,
            headers=inventory_adjust_headers,
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        created_inventory_id = resp.json().get("inventoryId")
        assert created_inventory_id, "Inventory creation failed"

        # Adjust inventory quantity
        adjust_payload = {
            "adjustment": -10,
            "reason": "correction"
        }
        resp = requests.put(
            f"{BASE_URL}/api/inventory/{created_inventory_id}/adjust",
            json=adjust_payload,
            headers=inventory_adjust_headers,
            timeout=TIMEOUT,
        )
        resp.raise_for_status()

        time.sleep(1)

        # Verify audit log for inventory adjustment
        resp = requests.get(
            f"{BASE_URL}/api/audit_logs",
            params={"entityType": "inventory", "entityId": created_inventory_id, "actionType": "inventory_adjustment"},
            headers=inventory_adjust_headers,
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        logs = resp.json()
        assert any(log.get("immutable") and log.get("action") == "inventory_adjustment" for log in logs), \
            "No immutable audit log found for inventory adjustment"

        # 3) Void/refund a sale (using the created sale)
        void_payload = {
            "reason": "customer_return"
        }
        resp = requests.post(
            f"{BASE_URL}/api/sales/{created_transaction_id}/void",
            json=void_payload,
            headers=void_refund_headers,
            timeout=TIMEOUT,
        )
        resp.raise_for_status()

        time.sleep(1)

        # Verify audit log for void/refund
        resp = requests.get(
            f"{BASE_URL}/api/audit_logs",
            params={"entityType": "sale", "entityId": created_transaction_id, "actionType": "void"},
            headers=void_refund_headers,
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        logs = resp.json()
        assert any(log.get("immutable") and log.get("action") == "void" for log in logs), \
            "No immutable audit log found for void/refund action"

        # 4) Permission change: create a new user and change permissions
        user_payload = {
            "username": "test_user_" + str(int(time.time())),
            "password": "TestPass123!",
            "roles": ["Cashier"]
        }
        resp = requests.post(
            f"{BASE_URL}/api/users",
            json=user_payload,
            headers=perm_change_headers,
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        created_user_id = resp.json().get("userId")
        assert created_user_id, "User creation failed"

        # Change permission (role) of the created user
        perm_payload = {
            "roles": ["Manager"]
        }
        resp = requests.put(
            f"{BASE_URL}/api/users/{created_user_id}/permissions",
            json=perm_payload,
            headers=perm_change_headers,
            timeout=TIMEOUT,
        )
        resp.raise_for_status()

        time.sleep(1)

        # Verify audit log for permission change
        resp = requests.get(
            f"{BASE_URL}/api/audit_logs",
            params={"entityType": "user", "entityId": created_user_id, "actionType": "permission_change"},
            headers=perm_change_headers,
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        logs = resp.json()
        assert any(log.get("immutable") and log.get("action") == "permission_change" for log in logs), \
            "No immutable audit log found for permission change"

        # Additional validation: audit logs cannot be altered or deleted
        # Attempt to delete an audit log (expect failure)
        if logs:
            audit_log_id = logs[0].get("auditLogId")
            assert audit_log_id, "Audit log missing auditLogId"
            del_resp = requests.delete(
                f"{BASE_URL}/api/audit_logs/{audit_log_id}",
                headers=perm_change_headers,
                timeout=TIMEOUT,
            )
            assert del_resp.status_code in (403, 405), "Audit log deletion should not be allowed"

            # Attempt to update an audit log (expect failure)
            patch_resp = requests.patch(
                f"{BASE_URL}/api/audit_logs/{audit_log_id}",
                json={"action": "tampered"},
                headers=perm_change_headers,
                timeout=TIMEOUT,
            )
            assert patch_resp.status_code in (403, 405), "Audit log modification should not be allowed"

    finally:
        # Cleanup: delete created data if possible
        # Delete created sale transactions generally not allowed, skip
        if created_inventory_id:
            try:
                requests.delete(f"{BASE_URL}/api/inventory/{created_inventory_id}", headers=inventory_adjust_headers, timeout=TIMEOUT)
            except Exception:
                pass
        if created_user_id:
            try:
                requests.delete(f"{BASE_URL}/api/users/{created_user_id}", headers=perm_change_headers, timeout=TIMEOUT)
            except Exception:
                pass

test_audit_log_generation_for_sensitive_actions()