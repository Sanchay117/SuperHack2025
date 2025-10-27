"""
tests/test_triage_agent.py

Provides comprehensive unit tests for the Alert Triage Agent.
It uses pytest and FastAPI's TestClient to ensure all logic is correct.
"""
import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta

# Import the main app and models to be used in tests.
from main import app
from models.models import Alert

# The TestClient allows us to make requests to the FastAPI app in tests.
client = TestClient(app)

# --- Test Data Fixtures ---

@pytest.fixture
def sample_alerts() -> list[Alert]:
    """Provides a list of sample alerts for testing various scenarios."""
    base_time = datetime.utcnow()
    return [
        # --- Cluster 1 (db-01, High CPU) --- should form one cluster
        Alert(host="server-db-01", timestamp=base_time, severity=7, message="High CPU utilization at 95%."),
        Alert(host="server-db-01", timestamp=base_time + timedelta(minutes=1), severity=7, message="CPU utilization is very high, reached 96%."),
        Alert(host="server-db-01", timestamp=base_time + timedelta(minutes=2), severity=7, message="Warning: CPU usage remains high at 94%."),
        
        # --- Cluster 2 (web-01, Disk Space) --- should form another cluster
        Alert(host="server-web-01", timestamp=base_time + timedelta(minutes=5), severity=6, message="Low disk space on /var/log."),
        Alert(host="server-web-01", timestamp=base_time + timedelta(minutes=6), severity=6, message="Disk space is running low on /var/log."),

        # --- Critical Alert (db-01) --- should be identified as critical
        Alert(host="server-db-01", timestamp=base_time + timedelta(minutes=3), severity=9, message="CRITICAL: Database connection failed."),

        # --- Isolated Alert (far in time) --- should be its own cluster
        Alert(host="server-db-01", timestamp=base_time + timedelta(minutes=30), severity=5, message="Service restarted successfully."),
        
        # --- Unrelated Alert (different host) --- should be its own cluster
        Alert(host="server-app-01", timestamp=base_time, severity=4, message="User login failed from IP 1.2.3.4")
    ]

# --- Tests for the /agents/triage Endpoint ---

def test_triage_endpoint_success(sample_alerts):
    """
    Tests the full request/response cycle of the triage endpoint with a valid payload.
    """
    response = client.post("/agents/triage", json={"alerts": [alert.dict() for alert in sample_alerts]})
    
    assert response.status_code == 200
    data = response.json()
    
    # Verify the top-level structure
    assert "clusters" in data
    assert "critical_alerts" in data
    
    # Verify critical alert detection
    assert len(data["critical_alerts"]) == 1
    assert data["critical_alerts"][0]["severity"] == 9
    assert data["critical_alerts"][0]["message"] == "CRITICAL: Database connection failed."

    # Verify clustering logic
    assert len(data["clusters"]) == 4 # (db-01 CPU) + (web-01 Disk) + (db-01 Restart) + (app-01 Login)
    
    hosts = {cluster["host"] for cluster in data["clusters"]}
    assert hosts == {"server-db-01", "server-web-01", "server-app-01"}
    
    # Check the contents of the largest cluster (db-01 CPU)
    db_cpu_cluster = next((c for c in data["clusters"] if c["representative_message"].startswith("High CPU")), None)
    assert db_cpu_cluster is not None
    assert db_cpu_cluster["count"] == 3
    assert db_cpu_cluster["host"] == "server-db-01"

    # Check the disk space cluster
    web_disk_cluster = next((c for c in data["clusters"] if c["representative_message"].startswith("Low disk space")), None)
    assert web_disk_cluster is not None
    assert web_disk_cluster["count"] == 2
    assert web_disk_cluster["host"] == "server-web-01"

def test_triage_endpoint_empty_list():
    """
    Tests that the endpoint handles an empty list of alerts gracefully.
    """
    response = client.post("/agents/triage", json={"alerts": []})
    assert response.status_code == 400
    assert "non-empty list" in response.json()["detail"]

def test_triage_endpoint_no_clusters_just_critical():
    """
    Tests a scenario with only dissimilar alerts, some of which are critical.
    """
    alerts = [
        Alert(host="host-a", timestamp=datetime.utcnow(), severity=9, message="System shutting down."),
        Alert(host="host-b", timestamp=datetime.utcnow(), severity=10, message="Power failure detected."),
    ]
    response = client.post("/agents/triage", json={"alerts": [alert.dict() for alert in alerts]})
    
    assert response.status_code == 200
    data = response.json()
    assert len(data["critical_alerts"]) == 2
    assert len(data["clusters"]) == 2 # Each alert forms its own cluster

def test_triage_endpoint_bad_payload():
    """
    Tests the endpoint's validation with a malformed request body.
    """
    response = client.post("/agents/triage", json={"not_alerts": []})
    assert response.status_code == 422 # Unprocessable Entity
