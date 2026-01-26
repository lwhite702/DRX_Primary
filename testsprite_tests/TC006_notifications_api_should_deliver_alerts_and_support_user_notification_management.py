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
    # Fail gracefully if auth fails, but for tests we want to error out
    raise Exception("Failed to get authenticated headers")

timeout = 30

def test_notifications_api_alerts_and_user_management():
    notification_id = None
    try:
        # 1. Create a user notification preference
        user_pref_payload = {
            "userId": str(uuid.uuid4()),
            "preferences": {
                "emailAlerts": True,
                "pushAlerts": True,
                "smsAlerts": False
            }
        }
        resp = requests.post(
            f"{BASE_URL}/api/notifications/preferences",
            json=user_pref_payload,
            headers=HEADERS,
            timeout=timeout
        )
        assert resp.status_code == 201, f"Create prefs failed: {resp.text}"
        created_prefs = resp.json()
        assert created_prefs["userId"] == user_pref_payload["userId"]
        assert created_prefs["preferences"]["emailAlerts"] is True

        user_id = created_prefs["userId"]

        # 2. Deliver an alert notification for the user
        alert_payload = {
            "userId": user_id,
            "type": "ALERT",
            "message": "Your account will undergo scheduled maintenance at midnight.",
            "metadata": {
                "severity": "info"
            }
        }
        resp = requests.post(
            f"{BASE_URL}/api/notifications/alerts",
            json=alert_payload,
            headers=HEADERS,
            timeout=timeout
        )
        assert resp.status_code == 201, f"Alert delivery failed: {resp.text}"
        alert = resp.json()
        notification_id = alert.get("notificationId")
        assert notification_id is not None
        assert alert["userId"] == user_id
        assert alert["message"] == alert_payload["message"]

        # 3. Fetch user notification preferences to verify they are stored correctly
        resp = requests.get(
            f"{BASE_URL}/api/notifications/preferences/{user_id}",
            headers=HEADERS,
            timeout=timeout
        )
        assert resp.status_code == 200, f"Fetch prefs failed: {resp.text}"
        prefs = resp.json()
        assert prefs["userId"] == user_id
        assert prefs["preferences"]["emailAlerts"] is True

        # 4. Retrieve notification event log for auditing
        resp = requests.get(
            f"{BASE_URL}/api/notifications/auditlogs",
            headers=HEADERS,
            timeout=timeout
        )
        assert resp.status_code == 200, f"Fetch audit logs failed: {resp.text}"
        logs = resp.json()
        # Confirm the notification event is logged
        notifications_logged = [log for log in logs if log.get("notificationId") == notification_id]
        assert len(notifications_logged) > 0, "Notification event not found in audit logs"

    finally:
        # Cleanup: delete the created notification if possible
        if notification_id:
            requests.delete(
                f"{BASE_URL}/api/notifications/alerts/{notification_id}",
                headers=HEADERS,
                timeout=timeout
            )
        # Cleanup: delete the user notification preferences
        if 'user_id' in locals():
            requests.delete(
                f"{BASE_URL}/api/notifications/preferences/{user_id}",
                headers=HEADERS,
                timeout=timeout
            )
            
test_notifications_api_alerts_and_user_management()