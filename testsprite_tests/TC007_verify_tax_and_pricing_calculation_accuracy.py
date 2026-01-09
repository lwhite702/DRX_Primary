import requests
import math

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def verify_tax_and_pricing_calculation_accuracy():
    headers = {
        "Content-Type": "application/json"
    }

    # Fixed tax rate as per PRD for 'general' category assumed 15%
    tax_rate = 0.15

    # Example product details for pricing calculation
    product_price = 99.99
    quantity = 3.5   # fractional quantity allowed
    price_override = None  # no override in this test

    # Build payload to calculate pricing and tax using category
    item = {
        "product_id": "test-product-001",
        "unit_price": product_price,
        "quantity": quantity
    }
    if price_override is not None:
        item["price_override"] = price_override

    pricing_payload = {
        "items": [item],
        "rounding_rules": {
            "tax": {
                "method": "half_up",
                "precision": 2
            },
            "total": {
                "method": "half_up",
                "precision": 2
            }
        }
    }

    # Call pricing and tax calculation endpoint
    calc_resp = requests.post(
        f"{BASE_URL}/api/pricing/calculate",
        json=pricing_payload,
        headers=headers,
        timeout=TIMEOUT
    )
    assert calc_resp.status_code == 200, f"Pricing calculation failed: {calc_resp.text}"
    assert calc_resp.text, "Empty response received from pricing calculation endpoint"
    calc_data = calc_resp.json()

    # Extract calculated values for validation
    items = calc_data.get("items")
    assert items is not None and len(items) == 1, "Returned items missing or invalid"

    item = items[0]
    calculated_tax = item.get("tax_amount")
    calculated_total = item.get("total_amount")
    calculated_subtotal = item.get("subtotal_amount")

    assert calculated_tax is not None, "Tax amount missing in response"
    assert calculated_total is not None, "Total amount missing in response"
    assert calculated_subtotal is not None, "Subtotal amount missing in response"

    # Independently calculate expected tax and amounts using same rounding logic to verify
    def round_half_up(value, precision):
        multiplier = 10 ** precision
        return math.floor(value * multiplier + 0.5) / multiplier

    expected_subtotal = product_price * quantity
    expected_tax = round_half_up(expected_subtotal * tax_rate, 2)
    expected_total = round_half_up(expected_subtotal + expected_tax, 2)

    # Assert calculation matches expected exactly
    assert math.isclose(calculated_subtotal, expected_subtotal, abs_tol=0.001), \
        f"Subtotal mismatch: expected {expected_subtotal}, got {calculated_subtotal}"
    assert math.isclose(calculated_tax, expected_tax, abs_tol=0.001), \
        f"Tax mismatch: expected {expected_tax}, got {calculated_tax}"
    assert math.isclose(calculated_total, expected_total, abs_tol=0.001), \
        f"Total mismatch: expected {expected_total}, got {calculated_total}"

    # Test reproducibility - call the endpoint multiple times with same payload and compare
    for _ in range(3):
        repeat_resp = requests.post(
            f"{BASE_URL}/api/pricing/calculate",
            json=pricing_payload,
            headers=headers,
            timeout=TIMEOUT
        )
        assert repeat_resp.status_code == 200, "Repeated calculation failed"
        assert repeat_resp.text, "Empty response received during repeated calculation"
        repeat_data = repeat_resp.json()
        repeat_item = repeat_data["items"][0]
        assert math.isclose(repeat_item["tax_amount"], calculated_tax, abs_tol=0.0001), "Tax amount not reproducible"
        assert math.isclose(repeat_item["total_amount"], calculated_total, abs_tol=0.0001), "Total amount not reproducible"
        assert math.isclose(repeat_item["subtotal_amount"], calculated_subtotal, abs_tol=0.0001), "Subtotal amount not reproducible"

verify_tax_and_pricing_calculation_accuracy()
