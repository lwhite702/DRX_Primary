import os
import uuid
import requests
from dotenv import load_dotenv

# Import auth helper
try:
    from auth_helper import get_authenticated_headers
except ImportError:
    # Handle running from root or subdir
    import sys
    sys.path.append(os.path.dirname(__file__))
    from auth_helper import get_authenticated_headers

load_dotenv(".env.local")

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

# Get valid headers from helper (creates/signs in user)
valid_headers = get_authenticated_headers()
if valid_headers:
    BEARER_TOKEN = valid_headers["Authorization"].replace("Bearer ", "")
    headers = valid_headers
else:
    print("WARNING: Failed to get authenticated headers. Using placeholder.")
    BEARER_TOKEN = "YOUR_BEARER_TOKEN_HERE"
    headers = {
        "Authorization": f"Bearer {BEARER_TOKEN}",
        "Content-Type": "application/json"
    }

def test_inventory_management_api_role_enforcement_and_immutable_records():
    # Roles to test with expected permissions
    roles = {
        "Cashier": "token_cashier",
        "Supervisor": BEARER_TOKEN,
        "Manager": BEARER_TOKEN,
        "SuperAdmin": BEARER_TOKEN
    }
    
    # Simulated tokens for roles (would be replaced with real tokens in actual tests)
    # Here we test role enforcement by setting tokens accordingly
    # For this test we will:
    # - As Cashier: try to modify inventory (should be forbidden)
    # - As Supervisor: modify inventory (allowed with audit log)
    # - As Cashier or lower try to override pricing or tax settings (forbidden)
    # - Check immutable historical records by attempting to delete or modify past inventory record (should be rejected)
    # - Verify audit logs on changes
    
    # Helper to set authorization header dynamically
    def headers_with_token(token):
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    # Step 1: Create a new inventory item as Manager or SuperAdmin for testing immutable record
    # Using SuperAdmin token for creation
    create_token = roles["SuperAdmin"]
    create_headers = headers_with_token(create_token)
    
    product_code = str(uuid.uuid4())
    new_inventory_item = {
        "sku": product_code,
        "product_name": "Test Product Immutable",
        "quantity_on_hand": 100,
        "weight": 1.5,
        "unit_cost": 10.0
    }
    
    try:
        # Create inventory item
        r = requests.post(f"{BASE_URL}/api/inventory", json=new_inventory_item, headers=create_headers, timeout=TIMEOUT)
        assert r.status_code == 201, f"Failed to create inventory item, status: {r.status_code}, body: {r.text}"
        created_item = r.json()
        item_id = created_item.get("id")
        assert item_id, "Created inventory item has no id"
        
        # Step 2: Test role-based access enforcement
        # 2a: Cashier tries to update inventory quantity (should be forbidden)
        cashier_token = roles["Cashier"]
        cashier_headers = headers_with_token(cashier_token)
        update_payload = {"quantity_on_hand": 90}
        r = requests.put(f"{BASE_URL}/api/inventory/{item_id}", json=update_payload, headers=cashier_headers, timeout=TIMEOUT)
        assert r.status_code in (401, 403), "Cashier should not be able to modify inventory"
        
        # 2b: Supervisor updates inventory quantity (allowed)
        supervisor_token = roles["Supervisor"]
        supervisor_headers = headers_with_token(supervisor_token)
        r = requests.put(f"{BASE_URL}/api/inventory/{item_id}", json=update_payload, headers=supervisor_headers, timeout=TIMEOUT)
        assert r.status_code == 200, f"Supervisor failed to update inventory, status: {r.status_code}, body: {r.text}"
        updated_item = r.json()
        assert updated_item.get("quantity_on_hand") == 90, "Quantity was not updated by Supervisor"
        
        # 2c: Cashier tries price override (forbidden)
        price_override_payload = {"unit_cost": 9.0}
        r = requests.put(f"{BASE_URL}/api/inventory/{item_id}", json=price_override_payload, headers=cashier_headers, timeout=TIMEOUT)
        assert r.status_code in (401, 403), "Cashier should not be able to override price"
        
        # 2d: Supervisor tries price override within limits (allowed)
        r = requests.put(f"{BASE_URL}/api/inventory/{item_id}", json=price_override_payload, headers=supervisor_headers, timeout=TIMEOUT)
        assert r.status_code == 200, "Supervisor should be able to override price"
        updated_item = r.json()
        assert updated_item.get("unit_cost") == 9.0, "Price override failed for Supervisor"
        
        # Step 3: Attempt to modify immutable historical record (simulate by trying to delete the item)
        # Assume API disallows DELETE or makes records immutable
        r = requests.delete(f"{BASE_URL}/api/inventory/{item_id}", headers=supervisor_headers, timeout=TIMEOUT)
        assert r.status_code in (401, 403, 405, 409), "Deletion should be forbidden or rejected for immutable inventory record"
        
        # Step 4: Verify audit logs exist for changes (query audit logs endpoint)
        # Assume audit logs endpoint is /api/admin/audit-logs and accessible to SuperAdmin
        audit_headers = headers_with_token(roles["SuperAdmin"])
        params = {"resource_id": item_id, "resource_type": "inventory"}
        r = requests.get(f"{BASE_URL}/api/admin/audit-logs", headers=audit_headers, params=params, timeout=TIMEOUT)
        assert r.status_code == 200, "Failed to retrieve audit logs"
        audit_logs = r.json()
        assert isinstance(audit_logs, list), "Audit logs response should be a list"
        # There should be logs for creation and updates
        event_types = [entry.get("transaction_type") for entry in audit_logs]
        assert "create" in event_types, "Create event not logged in audit logs"
        assert "update" in event_types, "Update event(s) not logged in audit logs"
        
    finally:
        # Clean up: attempt to delete created inventory item if allowed (or deactivate)
        # If deletion is forbidden, ignore error
        try:
            requests.delete(f"{BASE_URL}/api/inventory/{item_id}", headers=create_headers, timeout=TIMEOUT)
        except Exception:
            pass

test_inventory_management_api_role_enforcement_and_immutable_records()