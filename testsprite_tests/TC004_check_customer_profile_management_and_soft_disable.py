import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30
HEADERS = {
    "Content-Type": "application/json"
}

def test_check_customer_profile_management_and_soft_disable():
    customer_data = {
        "name": "Test Customer",
        "email": "test.customer@example.com",
        "phone": "123-456-7890",
        "notes": "Initial test customer profile"
    }
    created_customer_id = None
    try:
        # Create a new customer profile
        response = requests.post(
            f"{BASE_URL}/customers",
            json=customer_data,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert response.status_code == 201, f"Expected 201 on customer creation, got {response.status_code}"
        created_customer = response.json()
        created_customer_id = created_customer.get("id")
        assert created_customer_id is not None, "Created customer ID should not be None"
        # Verify that customer data is correct
        assert created_customer.get("name") == customer_data["name"]
        assert created_customer.get("email") == customer_data["email"]
        # Add purchase history data (simulate a purchase)
        purchase_payload = {
            "customerId": created_customer_id,
            "items": [
                {"productId": "prod-1", "quantity": 2, "price": 10.5},
                {"productId": "prod-2", "quantity": 1, "price": 25.0}
            ],
            "total": 46.0
        }
        purchase_resp = requests.post(
            f"{BASE_URL}/sales",
            json=purchase_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert purchase_resp.status_code == 201, f"Expected 201 on sales creation, got {purchase_resp.status_code}"
        # Retrieve customer profile and check purchase history aggregation
        get_customer_resp = requests.get(
            f"{BASE_URL}/customers/{created_customer_id}",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert get_customer_resp.status_code == 200, f"Expected 200 on get customer, got {get_customer_resp.status_code}"
        customer_profile = get_customer_resp.json()
        assert "purchaseHistory" in customer_profile, "Customer profile missing purchaseHistory"
        purchase_history = customer_profile["purchaseHistory"]
        assert isinstance(purchase_history, list) and any(
            sale.get("total") == purchase_payload["total"] for sale in purchase_history
        ), "Purchase history does not contain the recent sale"
        # Soft-disable the customer (assuming PATCH and 'disabled' attribute)
        disable_payload = {
            "disabled": True
        }
        disable_resp = requests.patch(
            f"{BASE_URL}/customers/{created_customer_id}",
            json=disable_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert disable_resp.status_code == 200, f"Expected 200 on customer soft-disable, got {disable_resp.status_code}"
        updated_customer = disable_resp.json()
        # Ensure customer is soft-disabled but not deleted
        assert updated_customer.get("disabled") is True, "Customer should be marked as disabled"
        # Confirm customer still exists on a GET request
        confirm_resp = requests.get(
            f"{BASE_URL}/customers/{created_customer_id}",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert confirm_resp.status_code == 200, "Customer should still exist after soft-disable"
        confirm_data = confirm_resp.json()
        assert confirm_data.get("disabled") is True, "Confirmed customer disabled flag should be True"
        # Check data integrity: key attributes unchanged except disabled flag
        assert confirm_data.get("name") == customer_data["name"], "Customer name should not change on disable"
        assert confirm_data.get("email") == customer_data["email"], "Customer email should not change on disable"
    finally:
        # Cleanup: hard delete the created customer if possible to keep test environment clean
        if created_customer_id:
            requests.delete(
                f"{BASE_URL}/customers/{created_customer_id}",
                headers=HEADERS,
                timeout=TIMEOUT
            )

test_check_customer_profile_management_and_soft_disable()