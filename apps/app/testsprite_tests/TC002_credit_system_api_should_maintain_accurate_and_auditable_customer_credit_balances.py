import requests
import uuid

import os
import sys

# Add current directory to path to allow importing auth_helper
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from auth_helper import get_authenticated_headers

BASE_URL = "http://localhost:3001"

HEADERS = get_authenticated_headers()
if not HEADERS:
    print("Failed to get authenticated headers, skipping test")
    sys.exit(1)

def test_credit_system_api_maintains_accurate_and_auditable_customer_credit_balances():
    created_customer_credit_id = None
    created_transaction_id = None
    
    try:
        # 1. Create a new customer credit line (POST /api/credit/customers)
        customer_credit_payload = {
            "customerCreditName": f"Test Customer {uuid.uuid4()}",
            "initialCreditLine": 1000.00
        }
        create_credit_response = requests.post(
            f"{BASE_URL}/api/credit/customers",
            headers=HEADERS,
            json=customer_credit_payload,
            timeout=30
        )
        assert create_credit_response.status_code == 201, f"Failed to create customer credit line: {create_credit_response.text}"
        credit_data = create_credit_response.json()
        created_customer_credit_id = credit_data.get("id")
        assert created_customer_credit_id, "Created customer credit ID missing"
        assert credit_data.get("creditLine") == customer_credit_payload["initialCreditLine"]
        # The balance on creation might be zero or None
        assert credit_data.get("balance") == 0.0 or credit_data.get("balance") is None

        # 2. Add a credit transaction to increase balance (POST /api/credit/transactions)
        transaction_payload = {
            "customerCreditId": created_customer_credit_id,
            "type": "credit",  # Assuming type can be 'credit' or 'debit'
            "amount": 500.00,
            "description": "Initial credit addition for test"
        }
        create_trans_response = requests.post(
            f"{BASE_URL}/api/credit/transactions",
            headers=HEADERS,
            json=transaction_payload,
            timeout=30
        )
        assert create_trans_response.status_code == 201, f"Failed to create credit transaction: {create_trans_response.text}"
        transaction_data = create_trans_response.json()
        created_transaction_id = transaction_data.get("id")
        assert created_transaction_id, "Created transaction ID missing"
        assert transaction_data.get("amount") == transaction_payload["amount"]
        assert transaction_data.get("type") == transaction_payload["type"]

        # 3. Verify that customer credit balance updated correctly (GET /api/credit/customers/{id})
        get_credit_response = requests.get(
            f"{BASE_URL}/api/credit/customers/{created_customer_credit_id}",
            headers=HEADERS,
            timeout=30
        )
        assert get_credit_response.status_code == 200, f"Failed to get customer credit details: {get_credit_response.text}"
        credit_details = get_credit_response.json()
        expected_balance = transaction_payload["amount"]
        assert abs(credit_details.get("balance", 0) - expected_balance) < 1e-6, \
            f"Credit balance mismatch: expected {expected_balance}, got {credit_details.get('balance')}"

        # 4. Retrieve transactions and audit logs for customer credit (GET /api/credit/transactions?customerCreditId=)
        get_trans_response = requests.get(
            f"{BASE_URL}/api/credit/transactions",
            headers=HEADERS,
            params={"customerCreditId": created_customer_credit_id},
            timeout=30
        )
        assert get_trans_response.status_code == 200, f"Failed to get transactions: {get_trans_response.text}"
        transactions_list = get_trans_response.json()
        assert any(t.get("id") == created_transaction_id for t in transactions_list), "Transaction record missing"
        # Verify immutability: attempt to modify transaction should fail (PUT /api/credit/transactions/{id})
        update_payload = {
            "amount": 9999.99
        }
        update_trans_response = requests.put(
            f"{BASE_URL}/api/credit/transactions/{created_transaction_id}",
            headers=HEADERS,
            json=update_payload,
            timeout=30
        )
        # Expect failure, HTTP 4xx or 405 Method Not Allowed
        assert update_trans_response.status_code in (400, 401, 403, 405), \
            "Transaction record is mutable, which violates immutability"

        # 5. Check audit logs for financial changes (GET /api/credit/audit-logs?customerCreditId=)
        get_audit_logs_response = requests.get(
            f"{BASE_URL}/api/credit/audit-logs",
            headers=HEADERS,
            params={"customerCreditId": created_customer_credit_id},
            timeout=30
        )
        assert get_audit_logs_response.status_code == 200, f"Failed to get audit logs: {get_audit_logs_response.text}"
        audit_logs = get_audit_logs_response.json()
        relevant_logs = [log for log in audit_logs if log.get("transaction_id") == created_transaction_id]
        assert len(relevant_logs) > 0, "Audit logs missing for financial transaction"
        for log in relevant_logs:
            assert "timestamp" in log and "action" in log and "performed_by" in log, \
                "Audit log entry missing required fields"

    finally:
        # Cleanup - Delete created transaction and customer credit line if API supports deletion for test purposes
        if created_transaction_id:
            try:
                requests.delete(
                    f"{BASE_URL}/api/credit/transactions/{created_transaction_id}",
                    headers=HEADERS,
                    timeout=30
                )
            except Exception:
                pass
        if created_customer_credit_id:
            try:
                requests.delete(
                    f"{BASE_URL}/api/credit/customers/{created_customer_credit_id}",
                    headers=HEADERS,
                    timeout=30
                )
            except Exception:
                pass

test_credit_system_api_maintains_accurate_and_auditable_customer_credit_balances()
