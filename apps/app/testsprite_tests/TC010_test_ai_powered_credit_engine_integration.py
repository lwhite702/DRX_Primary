import requests
import time

BASE_URL = "http://localhost:3001"
TIMEOUT = 30
HEADERS = {
    "Content-Type": "application/json",
    # Assuming Bearer token or other auth can be set here if required:
    # "Authorization": "Bearer <token>"
}

def test_ai_powered_credit_engine_integration():
    # Step 1: Create a test customer to obtain a customer ID for the credit analysis
    customer_payload = {
        "name": "Test Customer AI Credit",
        "email": f"test_ai_credit_{int(time.time())}@example.com"
    }

    customer_id = None
    credit_analysis_id = None

    try:
        # Create customer
        customer_resp = requests.post(
            f"{BASE_URL}/api/customers",
            json=customer_payload,
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        assert customer_resp.status_code == 201, f"Failed to create customer: {customer_resp.text}"
        customer_data = customer_resp.json()
        customer_id = customer_data.get("id")
        assert customer_id, "Customer ID not returned in create response"

        # Step 2: Request the AI-powered credit analysis for the created customer
        credit_request_payload = {
            "customerId": customer_id,
            "requestContext": {
                "timestamp": int(time.time()),
                "source": "unit_test"
            }
        }

        credit_resp = requests.post(
            f"{BASE_URL}/credit-engine/analyze",
            json=credit_request_payload,
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        assert credit_resp.status_code == 200, f"Credit analysis request failed: {credit_resp.text}"
        credit_result = credit_resp.json()

        # Validate expected keys in credit_result
        assert "creditLimit" in credit_result, "creditLimit missing in credit analysis response"
        assert isinstance(credit_result["creditLimit"], (int, float)), "creditLimit should be a number"
        assert credit_result["creditLimit"] >= 0, "creditLimit should be non-negative"
        assert "analysisDetails" in credit_result, "analysisDetails missing in credit analysis response"
        assert isinstance(credit_result["analysisDetails"], dict), "analysisDetails should be an object"

        # Optionally validate contents of analysisDetails for expected fields
        details = credit_result["analysisDetails"]
        assert "riskScore" in details, "riskScore missing in analysisDetails"
        assert 0 <= details["riskScore"] <= 100, "riskScore should be between 0 and 100"
        assert "recommendation" in details, "recommendation missing in analysisDetails"
        assert isinstance(details["recommendation"], str), "recommendation should be a string"

    finally:
        # Cleanup: Soft-disable or delete the test customer if supported
        if customer_id:
            # Try soft-disable customer
            disable_payload = {"disabled": True}
            try:
                disable_resp = requests.patch(
                    f"{BASE_URL}/api/customers/{customer_id}",
                    json=disable_payload,
                    headers=HEADERS,
                    timeout=TIMEOUT,
                )
                assert disable_resp.status_code in (200, 204), f"Failed to soft-disable customer: {disable_resp.text}"
            except Exception:
                # If patch fails, try delete as fallback
                try:
                    del_resp = requests.delete(
                        f"{BASE_URL}/api/customers/{customer_id}",
                        headers=HEADERS,
                        timeout=TIMEOUT,
                    )
                    assert del_resp.status_code in (200, 204), f"Failed to delete customer: {del_resp.text}"
                except Exception:
                    pass

test_ai_powered_credit_engine_integration()