import requests
import time

BASE_URL = "http://localhost:3001"
TIMEOUT = 30
HEADERS = {
    "Content-Type": "application/json",
    # Add authentication header if required, e.g. "Authorization": "Bearer <token>"
}

def test_validate_mobile_pos_usability_and_performance():
    # Step 1: Create a product to be sold
    product_payload = {
        "name": "Test Product Mobile POS",
        "sku": "TPMOBILEPOS001",
        "price": 19.99,
        "taxable": True,
        "inventory_quantity": 10,
        "description": "Product for mobile POS usability test"
    }
    product_id = None
    sale_id = None

    try:
        # Create product
        resp = requests.post(f"{BASE_URL}/inventory/products", json=product_payload, headers=HEADERS, timeout=TIMEOUT)
        assert resp.status_code == 201, f"Failed to create product: {resp.text}"
        product_id = resp.json().get("id")
        assert product_id, "Product ID not returned after creation"

        # Step 2: Create a new customer profile (simulate new staff or new customer)
        customer_payload = {
            "name": "New Staff Customer",
            "email": "newstaff@example.com",
            "phone": "555-0100"
        }
        resp = requests.post(f"{BASE_URL}/customers", json=customer_payload, headers=HEADERS, timeout=TIMEOUT)
        assert resp.status_code == 201, f"Failed to create customer: {resp.text}"
        customer_id = resp.json().get("id")
        assert customer_id, "Customer ID not returned after creation"

        # Step 3: Start timing the sale transaction completion
        start_time = time.time()

        # Step 4: Create a sale transaction using mobile-optimized POS interface simulation
        sale_payload = {
            "customer_id": customer_id,
            "items": [
                {
                    "product_id": product_id,
                    "quantity": 1,
                    "price": 19.99
                }
            ],
            "payment_method": "cash",
            "notes": "Test sale via mobile POS"
        }
        resp = requests.post(f"{BASE_URL}/sales", json=sale_payload, headers=HEADERS, timeout=TIMEOUT)
        elapsed = time.time() - start_time

        assert resp.status_code == 201, f"Failed to complete sale transaction: {resp.text}"
        sale_id = resp.json().get("id")
        assert sale_id, "Sale ID not returned after creation"

        # Step 5: Validate the sale completed within 2 minutes (120 seconds)
        assert elapsed <= 120, f"Sale transaction took too long: {elapsed} seconds"

        # Step 6: Additional usability validation - response contains expected mobile-optimized POS fields
        sale_response = resp.json()
        assert "total_amount" in sale_response, "total_amount missing from sale response"
        assert "tax_amount" in sale_response, "tax_amount missing from sale response"
        assert sale_response.get("status") == "completed", f"Unexpected sale status {sale_response.get('status')}"

    finally:
        # Cleanup: delete sale and product created during test if applicable
        if sale_id:
            try:
                requests.delete(f"{BASE_URL}/sales/{sale_id}", headers=HEADERS, timeout=TIMEOUT)
            except Exception:
                pass
        if product_id:
            try:
                requests.delete(f"{BASE_URL}/inventory/products/{product_id}", headers=HEADERS, timeout=TIMEOUT)
            except Exception:
                pass
        if 'customer_id' in locals():
            try:
                # Assuming customer can be deleted or soft-disabled via API for cleanup
                requests.delete(f"{BASE_URL}/customers/{customer_id}", headers=HEADERS, timeout=TIMEOUT)
            except Exception:
                pass

test_validate_mobile_pos_usability_and_performance()