import requests
import uuid
import os
import sys

# Add current directory to path to allow importing auth_helper
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from auth_helper import get_authenticated_headers, ensure_test_user, SUPABASE_URL, SUPABASE_KEY

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_notifications_api_alerts_and_user_management():
    # 1. Authenticate
    headers = get_authenticated_headers()
    if not headers:
        raise Exception("Failed to get authenticated headers")
    
    # We need a valid User ID for the preferences.
    # The current user (from headers) is best.
    # We can decode the token or fetch /api/auth/me if exists?
    # Or just use ensure_test_user to get the ID of the test user explicitly.
    
    # Let's use ensure_test_user to get the ID.
    # TC005 showed ensure_test_user returns user_id if we modify it? 
    # Or just use the one we know: "test_superadmin@example.com"
    user_id = ensure_test_user("test_superadmin@example.com", "TestPassword123!", "manager")
    assert user_id, "Failed to get user ID"

    notification_id = None
    try:
        # 2. Create/Update user notification preference
        user_pref_payload = {
            "userId": user_id,
            "preferences": {
                "emailAlerts": True,
                "pushAlerts": True,
                "smsAlerts": False
            }
        }
        resp = requests.post(
            f"{BASE_URL}/api/notifications/preferences",
            json=user_pref_payload,
            headers=headers,
            timeout=TIMEOUT
        )
        assert resp.status_code in (200, 201), f"Create prefs failed: {resp.text}"
        created_prefs = resp.json()
        assert created_prefs["userId"] == user_id
        assert created_prefs["preferences"]["emailAlerts"] is True

        # 3. Deliver an alert notification for the user
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
            headers=headers,
            timeout=TIMEOUT
        )
        assert resp.status_code == 201, f"Alert delivery failed: {resp.text}"
        alert = resp.json()
        notification_id = alert.get("notificationId")
        assert notification_id is not None
        assert alert["userId"] == user_id
        assert alert["message"] == alert_payload["message"]

        # 4. Fetch user notification preferences
        resp = requests.get(
            f"{BASE_URL}/api/notifications/preferences/{user_id}",
            headers=headers,
            timeout=TIMEOUT
        )
        assert resp.status_code == 200, f"Fetch prefs failed: {resp.text}"
        prefs = resp.json()
        assert prefs["userId"] == user_id
        assert prefs["preferences"]["emailAlerts"] is True

        # 5. Retrieve notification event log for auditing
        resp = requests.get(
            f"{BASE_URL}/api/notifications/auditlogs",
            headers=headers,
            timeout=TIMEOUT
        )
        assert resp.status_code == 200, f"Fetch audit logs failed: {resp.text}"
        logs = resp.json()
        
        # Confirm the notification event is logged
        # Check logs for action='create_alert' or similar, OR check the `notifications` table if that logic is used.
        # The original test checked notificationId in logs.
        # Implementation should ensure meaningful logs or return `notifications` table as logs?
        # The endpoint name `auditlogs` suggests system audit logs.
        # We will log the creation of alert to system_audit_log.
        
        notifications_logged = [
            log for log in logs 
            if (log.get("details", {}).get("notificationId") == notification_id) or (log.get("resource_id") == notification_id)
        ]
        assert len(notifications_logged) > 0, "Notification event not found in audit logs"

    finally:
        # Cleanup
        if notification_id:
            requests.delete(
                f"{BASE_URL}/api/notifications/alerts/{notification_id}",
                headers=headers,
                timeout=TIMEOUT
            )
        # Prefs cleanup optional or handled by delete user