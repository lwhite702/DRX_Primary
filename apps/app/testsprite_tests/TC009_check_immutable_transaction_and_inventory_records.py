import requests
import time

BASE_URL = "http://localhost:3001"
TIMEOUT = 30
HEADERS = {
    "Content-Type": "application/json",
    # Assuming authentication token is required, replace 'your_token_here' with a valid token
    "Authorization": "Bearer your_token_here"
}

def check_immutable_transaction_and_inventory_records():
    """
    Verify that all transaction and inventory records are immutable or append-only,
    preventing silent data mutations and ensuring historical data remains trustworthy.
    """
    created_transaction_id = None
    created_inventory_id = None

    # Helper function to create a new transaction
    def create_transaction():
        payload = {
            "type": "sale",
            "items": [
                {"product_id": "test-product-1", "quantity": 1, "price_per_unit": 10.0}
            ],
            "total_amount": 10.0,
            "timestamp": int(time.time())
        }
        response = requests.post(f"{BASE_URL}/transactions", json=payload, headers=HEADERS, timeout=TIMEOUT)
        response.raise_for_status()
        data = response.json()
        assert "id" in data, "Transaction creation response missing 'id'"
        return data["id"]

    # Helper function to get transaction by ID
    def get_transaction(txn_id):
        response = requests.get(f"{BASE_URL}/transactions/{txn_id}", headers=HEADERS, timeout=TIMEOUT)
        response.raise_for_status()
        return response.json()

    # Helper function to create a new inventory record
    def create_inventory_record():
        payload = {
            "product_id": "test-product-1",
            "adjustment_type": "initial_stock",
            "quantity": 100,
            "cost_per_unit": 5.0,
            "timestamp": int(time.time())
        }
        response = requests.post(f"{BASE_URL}/inventory/records", json=payload, headers=HEADERS, timeout=TIMEOUT)
        response.raise_for_status()
        data = response.json()
        assert "id" in data, "Inventory record creation response missing 'id'"
        return data["id"]

    # Helper function to get inventory record by ID
    def get_inventory_record(record_id):
        response = requests.get(f"{BASE_URL}/inventory/records/{record_id}", headers=HEADERS, timeout=TIMEOUT)
        response.raise_for_status()
        return response.json()

    # Helper function to attempt to modify transaction or inventory and expect failure or append-only behavior
    def attempt_modification(entity_type, entity_id):
        update_payload = {
            "unauthorized_update": True,
            "timestamp": int(time.time())
        }
        url = f"{BASE_URL}/{entity_type}/{entity_id}"
        try:
            put_response = requests.put(url, json=update_payload, headers=HEADERS, timeout=TIMEOUT)
            # If API supports append-only and forbids updates, it should fail or ignore changes silently
            # We assert that modification is rejected or not silently accepted
            assert put_response.status_code in (400, 403, 405), \
                f"Modification to {entity_type} {entity_id} unexpectedly succeeded with status {put_response.status_code}"
        except requests.exceptions.HTTPError as e:
            # Expected that modification fails with HTTP error
            assert e.response.status_code in (400, 403, 405)
        except Exception as e:
            raise AssertionError(f"Unexpected error during modification attempt: {e}")

    # Helper function to check audit logs for append-only / immutable entries of transaction or inventory
    def check_audit_logs(entity_type, entity_id):
        params = {"entity_type": entity_type, "entity_id": entity_id}
        response = requests.get(f"{BASE_URL}/audit-logs", params=params, headers=HEADERS, timeout=TIMEOUT)
        response.raise_for_status()
        logs = response.json()
        # There must be at least one immutable audit log entry for creation
        assert isinstance(logs, list) and len(logs) > 0, f"No audit logs found for {entity_type} id {entity_id}"
        # All audit logs must indicate append-only actions; no delete or mutation actions
        for log in logs:
            assert log.get("action") in ("create", "adjust", "append"), f"Unexpected audit log action: {log.get('action')}"
            # Assert there is a timestamp and immutable user/role info present
            assert "timestamp" in log, "Audit log missing timestamp"
            assert "performed_by" in log, "Audit log missing performer info"

    # Begin test
    try:
        # Create transaction and inventory record for test usage
        created_transaction_id = create_transaction()
        created_inventory_id = create_inventory_record()

        # Fetch created records
        txn_before = get_transaction(created_transaction_id)
        inv_before = get_inventory_record(created_inventory_id)

        # Attempt unauthorized modification on transaction
        attempt_modification("transactions", created_transaction_id)
        # Attempt unauthorized modification on inventory record
        attempt_modification("inventory/records", created_inventory_id)

        # Fetch records again after modification attempts
        txn_after = get_transaction(created_transaction_id)
        inv_after = get_inventory_record(created_inventory_id)

        # Assert no silent mutations occurred: data before and after must be identical
        assert txn_before == txn_after, "Transaction record mutated silently"
        assert inv_before == inv_after, "Inventory record mutated silently"

        # Check audit logs for immutable, append-only append entries
        check_audit_logs("transaction", created_transaction_id)
        check_audit_logs("inventory_record", created_inventory_id)

    finally:
        # Cleanup: attempt deleting the test transaction (if API supports) to avoid pollution
        # If the API enforces append-only, deletion might not be allowed, so ignoring errors here
        if created_transaction_id:
            try:
                requests.delete(f"{BASE_URL}/transactions/{created_transaction_id}", headers=HEADERS, timeout=TIMEOUT)
            except Exception:
                pass
        if created_inventory_id:
            try:
                requests.delete(f"{BASE_URL}/inventory/records/{created_inventory_id}", headers=HEADERS, timeout=TIMEOUT)
            except Exception:
                pass

check_immutable_transaction_and_inventory_records()