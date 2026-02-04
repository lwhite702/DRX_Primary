import requests
import uuid
import time

BASE_URL = "http://localhost:3001"
HEADERS = {
    "Content-Type": "application/json",
    # Assuming a Bearer token is needed; replace 'your_auth_token' accordingly.
    "Authorization": "Bearer your_auth_token"
}
TIMEOUT = 30


def test_inventory_management_and_traceability():
    """
    Verify inventory tracking including quantity, weight, and cost per unit.
    Ensure immutable historical intake and adjustment records are maintained
    and audit logs are generated for inventory changes.
    """
    inventory_item = None
    try:
        # Step 1: Create an inventory item
        create_payload = {
            "sku": "TESTSKU-" + str(uuid.uuid4()),
            "name": "Test Item",
            "quantity": 100,
            "weight": 50.5,
            "cost_per_unit": 15.75
        }
        resp_create = requests.post(
            f"{BASE_URL}/inventory/items",
            json=create_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert resp_create.status_code == 201, f"Create inventory failed: {resp_create.text}"
        inventory_item = resp_create.json()
        item_id = inventory_item.get("id")
        assert item_id, "Created inventory item missing 'id'"

        # Step 2: Verify inventory item details
        resp_get = requests.get(f"{BASE_URL}/inventory/items/{item_id}", headers=HEADERS, timeout=TIMEOUT)
        assert resp_get.status_code == 200, f"Get inventory item failed: {resp_get.text}"
        data = resp_get.json()
        assert data["quantity"] == create_payload["quantity"], "Quantity mismatch"
        assert abs(data["weight"] - create_payload["weight"]) < 0.0001, "Weight mismatch"
        assert abs(data["cost_per_unit"] - create_payload["cost_per_unit"]) < 0.0001, "Cost per unit mismatch"

        # Step 3: Make an inventory adjustment (e.g. add 20 units)
        adjustment_payload = {
            "adjustment_type": "increase",
            "quantity": 20,
            "weight": 10.1,
            "cost_per_unit": 15.75,
            "reason": "Stock replenishment"
        }
        resp_adjust = requests.post(
            f"{BASE_URL}/inventory/items/{item_id}/adjustments",
            json=adjustment_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert resp_adjust.status_code == 200 or resp_adjust.status_code == 201, f"Inventory adjustment failed: {resp_adjust.text}"
        adjustment_record = resp_adjust.json()
        adjustment_id = adjustment_record.get("id")
        assert adjustment_id, "Adjustment record missing 'id'"

        # Step 4: Verify the updated inventory reflects the adjustment
        resp_get_updated = requests.get(f"{BASE_URL}/inventory/items/{item_id}", headers=HEADERS, timeout=TIMEOUT)
        assert resp_get_updated.status_code == 200, f"Get updated inventory item failed: {resp_get_updated.text}"
        updated_data = resp_get_updated.json()
        expected_quantity = create_payload["quantity"] + adjustment_payload["quantity"]
        expected_weight = create_payload["weight"] + adjustment_payload["weight"]
        assert updated_data["quantity"] == expected_quantity, "Adjusted quantity mismatch"
        assert abs(updated_data["weight"] - expected_weight) < 0.0001, "Adjusted weight mismatch"
        # Cost per unit should remain consistent unless changed explicitly
        assert abs(updated_data["cost_per_unit"] - create_payload["cost_per_unit"]) < 0.0001, "Cost per unit changed unexpectedly"

        # Step 5: Retrieve historical intake and adjustment records (immutable)
        resp_history = requests.get(f"{BASE_URL}/inventory/items/{item_id}/history", headers=HEADERS, timeout=TIMEOUT)
        assert resp_history.status_code == 200, f"Get inventory history failed: {resp_history.text}"
        history = resp_history.json()
        assert isinstance(history, list), "Inventory history should be a list"
        intake_records = [h for h in history if h.get("type") == "intake"]
        adjustment_records = [h for h in history if h.get("type") == "adjustment"]
        # Should have at least one intake and one adjustment record
        assert len(intake_records) >= 1, "No intake record found in inventory history"
        assert any(h.get("id") == adjustment_id for h in adjustment_records), "Adjustment record not found in history"

        # Step 6: Check audit logs for inventory changes
        resp_audit = requests.get(f"{BASE_URL}/audit/logs?resource_type=inventory_item&resource_id={item_id}",
                                  headers=HEADERS, timeout=TIMEOUT)
        assert resp_audit.status_code == 200, f"Get audit logs failed: {resp_audit.text}"
        audit_logs = resp_audit.json()
        assert isinstance(audit_logs, list), "Audit logs should be a list"
        # Check audit logs contain entries for creation and adjustment
        creation_log_found = any(
            log.get("action") == "create" and log.get("resource_id") == item_id for log in audit_logs
        )
        adjustment_log_found = any(
            log.get("action") == "adjustment" and log.get("resource_id") == item_id for log in audit_logs
        )
        assert creation_log_found, "Creation audit log not found"
        assert adjustment_log_found, "Adjustment audit log not found"

    finally:
        # Cleanup - delete the created inventory item if it exists
        if inventory_item and "id" in inventory_item:
            requests.delete(f"{BASE_URL}/inventory/items/{inventory_item['id']}", headers=HEADERS, timeout=TIMEOUT)


test_inventory_management_and_traceability()