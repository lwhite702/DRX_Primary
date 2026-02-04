import requests

BASE_URL = "http://localhost:3001"
AI_INSIGHTS_ENDPOINT = f"{BASE_URL}/api/ai/insights"
# Imports for auth helper
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from auth_helper import get_authenticated_headers

HEADERS = get_authenticated_headers()
if not HEADERS:
    raise Exception("Failed to get authenticated headers")
TIMEOUT = 30

def test_ai_insights_api_should_generate_accurate_business_analytics_and_insights():
    """Test the AI insights API to ensure it generates accurate and reproducible business insights and analytics based on current and historical data."""
    # Example payload simulating a request for business insights with some dummy data references
    request_payload = {
        "queryPeriod": {
            "startDate": "2024-01-01",
            "endDate": "2024-12-31"
        },
        "metrics": ["revenue", "profit", "customerRetention", "inventoryTurnover"],
        "historicalComparison": True,
        "businessUnits": ["Sales", "Inventory", "CustomerService"]
    }

    try:
        response = requests.post(
            AI_INSIGHTS_ENDPOINT,
            headers=HEADERS,
            json=request_payload,
            timeout=TIMEOUT
        )
    except requests.RequestException as e:
        assert False, f"Request to AI insights API failed: {e}"

    # Assert HTTP status code indicates success
    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Validate structure of the response
    # Expecting keys such as 'insights', 'analytics', 'generatedAt', 'queryPeriod'
    assert "insights" in data, "'insights' key missing from response"
    assert isinstance(data["insights"], list), "'insights' should be a list"

    assert "analytics" in data, "'analytics' key missing from response"
    assert isinstance(data["analytics"], dict), "'analytics' should be a dictionary"

    assert "generatedAt" in data, "'generatedAt' key missing from response"

    assert "queryPeriod" in data, "'queryPeriod' key missing from response"
    qp = data["queryPeriod"]
    assert "startDate" in qp and "endDate" in qp, "'startDate' or 'endDate' missing in 'queryPeriod'"

    # Basic sanity checks on insights content 
    for insight in data["insights"]:
        assert isinstance(insight, dict), "Each insight should be a dictionary"
        assert "title" in insight and isinstance(insight["title"], str), "Insight missing 'title' or not a string"
        assert "description" in insight and isinstance(insight["description"], str), "Insight missing 'description' or not a string"
        # Optionally check for evidence or confidence score if present
        if "confidenceScore" in insight:
            score = insight["confidenceScore"]
            assert isinstance(score, (int, float)) and 0 <= score <= 1, "Invalid 'confidenceScore' in insight"

    # Validate analytics fields for expected metrics keys
    expected_metrics = set(request_payload["metrics"])
    actual_metrics = set(data["analytics"].keys())
    missing_metrics = expected_metrics - actual_metrics
    assert not missing_metrics, f"Expected metrics missing in analytics: {missing_metrics}"

    # Check reproducibility: Call API second time with same payload and compare results
    try:
        response_2 = requests.post(
            AI_INSIGHTS_ENDPOINT,
            headers=HEADERS,
            json=request_payload,
            timeout=TIMEOUT
        )
    except requests.RequestException as e:
        assert False, f"Second request to AI insights API failed: {e}"

    assert response_2.status_code == 200, f"Second request status code not 200, got {response_2.status_code}"

    try:
        data_2 = response_2.json()
    except ValueError:
        assert False, "Second response is not valid JSON"

    # Basic check: The insights and analytics should match for reproducibility
    assert data["insights"] == data_2["insights"], "Insights differ between repeated requests"
    assert data["analytics"] == data_2["analytics"], "Analytics differ between repeated requests"

test_ai_insights_api_should_generate_accurate_business_analytics_and_insights()