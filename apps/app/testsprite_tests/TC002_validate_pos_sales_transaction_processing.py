import requests
import time

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

# Example user credentials and roles to test role validation
USERS = {
    "cashier": {"email": "cashier_user@example.com", "password": "cashier_pass", "role": "Cashier"},
    "supervisor": {"email": "supervisor_user@example.com", "password": "supervisor_pass", "role": "Supervisor"},
}

def authenticate(email, password):
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": email, "password": password},
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        token = resp.json().get("access_token")
        assert token, "No access token received on login"
        return token
    except Exception as e:
        raise AssertionError(f"Authentication failed for user {email}: {e}")

def create_product(auth_token):
    # Create a product with price and tax info
    product_data = {
        "name": "Test Product Fractional",
        "price": 10.00,
        "tax_category": "standard",
        "unit": "weight",   # allowing fractional quantity (weight)
    }
    headers = {"Authorization": f"Bearer {auth_token}"}
    resp = requests.post(f"{BASE_URL}/products", json=product_data, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    product = resp.json()
    assert "id" in product
    return product["id"]

def delete_product(product_id, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    resp = requests.delete(f"{BASE_URL}/products/{product_id}", headers=headers, timeout=TIMEOUT)
    if resp.status_code not in (204, 404):
        raise AssertionError(f"Failed to delete product {product_id}")

def create_customer(auth_token):
    customer_data = {
        "name": "Test Customer",
        "email": "test.customer@example.com",
    }
    headers = {"Authorization": f"Bearer {auth_token}"}
    resp = requests.post(f"{BASE_URL}/customers", json=customer_data, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    customer = resp.json()
    assert "id" in customer
    return customer["id"]

def delete_customer(customer_id, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    resp = requests.delete(f"{BASE_URL}/customers/{customer_id}", headers=headers, timeout=TIMEOUT)
    if resp.status_code not in (204, 404):
        raise AssertionError(f"Failed to delete customer {customer_id}")

def place_sale(auth_token, sale_payload):
    headers = {"Authorization": f"Bearer {auth_token}"}
    resp = requests.post(f"{BASE_URL}/pos/sales", json=sale_payload, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    sale = resp.json()
    assert "id" in sale
    return sale["id"], sale

def void_sale(sale_id, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    resp = requests.post(f"{BASE_URL}/pos/sales/{sale_id}/void", headers=headers, timeout=TIMEOUT)
    if resp.status_code != 200:
        raise AssertionError(f"Failed to void sale {sale_id}")

def test_validate_pos_sales_transaction_processing():
    # Authenticate users
    cashier_token = authenticate(USERS["cashier"]["email"], USERS["cashier"]["password"])
    supervisor_token = authenticate(USERS["supervisor"]["email"], USERS["supervisor"]["password"])

    product_id = None
    customer_id = None
    sale_id = None

    try:
        # Create a product that supports fractional quantities and tax category
        product_id = create_product(supervisor_token)
        # Create a customer for the sale
        customer_id = create_customer(supervisor_token)

        # Prepare fractional quantity sale with price override (allowed for Supervisor)
        fractional_quantity = 1.25  # fractional quantity supported
        override_price = 8.50       # override price for testing price override with role validation

        sale_payload = {
            "customer_id": customer_id,
            "items": [
                {
                    "product_id": product_id,
                    "quantity": fractional_quantity,
                    "price_override": override_price
                }
            ],
            "payment_method": "mobile",
            "device_type": "mobile",
            "tax_enabled": True
        }

        # Record start time to validate completion within two minutes
        start_time = time.time()

        # Place sale with supervisor token (can override price)
        sale_id, sale_response = place_sale(supervisor_token, sale_payload)

        end_time = time.time()
        elapsed_seconds = end_time - start_time
        assert elapsed_seconds <= 120, f"Transaction took longer than 2 minutes: {elapsed_seconds}s"

        # Validate response content
        items = sale_response.get("items")
        assert items and len(items) == 1, "Sale response items missing or incorrect"
        item = items[0]
        assert abs(item.get("quantity") - fractional_quantity) < 0.0001, "Quantity in response incorrect"
        assert abs(item.get("price") - override_price) < 0.01, "Price override not applied correctly"

        # Validate tax calculation presence and correctness (basic check)
        tax_amount = sale_response.get("tax_amount")
        total_amount = sale_response.get("total_amount")
        assert tax_amount is not None, "Tax amount missing in response"
        assert total_amount is not None, "Total amount missing in response"
        # Confirm tax_amount + net price equals total_amount (allow small rounding)
        net_price = override_price * fractional_quantity
        assert abs((net_price + tax_amount) - total_amount) < 0.05, "Tax and total calculations mismatch"

        # Attempt placing sale as cashier who cannot do price override
        sale_payload_cashier = {
            "customer_id": customer_id,
            "items": [
                {
                    "product_id": product_id,
                    "quantity": 2,
                    "price_override": 7.00  # attempting price override
                }
            ],
            "payment_method": "mobile",
            "device_type": "mobile",
            "tax_enabled": True
        }
        # Expect failure due to role validation on price override
        try:
            _sale_id, _ = place_sale(cashier_token, sale_payload_cashier)
            raise AssertionError("Cashier should not be allowed to perform price override")
        except requests.HTTPError as e:
            assert e.response.status_code in (403, 401), "Expected forbidden or unauthorized error for price override by cashier"

    finally:
        # Cleanup created resources
        if sale_id:
            try:
                void_sale(sale_id, supervisor_token)
            except Exception:
                pass
        if product_id:
            try:
                delete_product(product_id, supervisor_token)
            except Exception:
                pass
        if customer_id:
            try:
                delete_customer(customer_id, supervisor_token)
            except Exception:
                pass

test_validate_pos_sales_transaction_processing()
