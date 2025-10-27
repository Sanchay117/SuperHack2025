"""
agents/triage_agent.py

This file contains the core logic for the Alert Triage Agent, including:
- A FastAPI endpoint `/agents/triage`.
- Alert clustering based on host, time proximity, and message similarity.
- Critical alert identification based on severity.
"""
from fastapi import APIRouter, HTTPException, Body
from typing import List, Dict
from datetime import datetime, timedelta
import itertools

# Sentence-transformers is a powerful library for creating text embeddings.
# We use a lightweight, high-performance model suitable for a hackathon prototype.
from sentence_transformers import SentenceTransformer, util

# Import our Pydantic models.
from models.models import Alert, AlertCluster, TriageRequest, TriageResponse

# --- Constants ---
# Time window to group alerts on the same host. Alerts within this window are candidates for clustering.
TIME_WINDOW_MINUTES = 10
# Cosine similarity threshold for deduplicating alert messages.
# FIX 2: Lowered from 0.85 to 0.80 to catch similar alerts like the "Disk" ones.
SIMILARITY_THRESHOLD = 0.80
# Severity score that marks an alert as critical.
CRITICAL_SEVERITY_THRESHOLD = 8

# --- Agent Setup ---
router = APIRouter()

# Load the sentence-transformer model once on startup.
# This model is small and efficient, perfect for real-time processing.
try:
    embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
except Exception as e:
    # Handle cases where the model download might fail (e.g., no internet)
    print(f"Error loading SentenceTransformer model: {e}")
    embedding_model = None

# --- Core Logic ---

def process_alert_triage(alerts: List[Alert]) -> TriageResponse:
    """
    Main function to process raw alerts into clusters and critical items.

    Args:
        alerts: A list of raw Alert objects.

    Returns:
        A TriageResponse object containing clusters and critical alerts.
    """
    if not alerts:
        return TriageResponse(clusters=[], critical_alerts=[])
    
    # FIX 1: Separate alerts into critical and non-critical lists.
    # This prevents critical alerts from being processed by the clustering logic.
    critical_alerts = []
    non_critical_alerts = []
    
    for alert in alerts:
        if alert.severity >= CRITICAL_SEVERITY_THRESHOLD:
            critical_alerts.append(alert)
        else:
            non_critical_alerts.append(alert)

    # 2. Group non-critical alerts by host for processing
    alerts_by_host: Dict[str, List[Alert]] = {}
    # Use the filtered 'non_critical_alerts' list here
    for alert in non_critical_alerts:
        if alert.host not in alerts_by_host:
            alerts_by_host[alert.host] = []
        alerts_by_host[alert.host].append(alert)

    # 3. Process each host's alerts to create clusters
    final_clusters: List[AlertCluster] = []
    for host, host_alerts in alerts_by_host.items():
        # Sort alerts by time to enable temporal grouping
        sorted_alerts = sorted(host_alerts, key=lambda a: a.timestamp)
        
        # Temporally group alerts
        temporal_groups = []
        if not sorted_alerts:
            continue
            
        current_group = [sorted_alerts[0]]
        for i in range(1, len(sorted_alerts)):
            time_diff = sorted_alerts[i].timestamp - current_group[-1].timestamp
            if time_diff <= timedelta(minutes=TIME_WINDOW_MINUTES):
                current_group.append(sorted_alerts[i])
            else:
                temporal_groups.append(current_group)
                current_group = [sorted_alerts[i]]
        temporal_groups.append(current_group)

        # 4. For each temporal group, perform similarity clustering
        for group in temporal_groups:
            if not group:
                continue
            
            # Encode alert messages into vector embeddings
            messages = [alert.message for alert in group]
            embeddings = embedding_model.encode(messages, convert_to_tensor=True)
            
            # Use sentence-transformers' community detection for efficient clustering
            # This is faster and more robust than manual pair-wise comparison.
            message_clusters = util.community_detection(
                embeddings, min_community_size=1, threshold=SIMILARITY_THRESHOLD
            )
            
            # 5. Create AlertCluster objects from the detected message clusters
            for i, cluster_indices in enumerate(message_clusters):
                cluster_alerts = [group[idx] for idx in cluster_indices]
                
                # Sort to find the first and last alerts accurately
                cluster_alerts.sort(key=lambda a: a.timestamp)

                final_clusters.append(
                    AlertCluster(
                        host=host,
                        start_time=cluster_alerts[0].timestamp,
                        end_time=cluster_alerts[-1].timestamp,
                        alerts=cluster_alerts,
                        representative_message=cluster_alerts[0].message,
                        count=len(cluster_alerts),
                    )
                )

    return TriageResponse(clusters=final_clusters, critical_alerts=critical_alerts)


# --- API Endpoint ---

@router.post("/agents/triage", response_model=TriageResponse, tags=["AI Agents"])
async def triage_alerts_endpoint(
    request: TriageRequest = Body(...)
):
    """
    Receives a list of raw alerts and returns a structured response containing
    clustered alerts and identified critical alerts.

    **Clustering Logic:**
    1.  **Filter Critical:** Alerts with severity >= 8 are separated.
    2.  **Group by Host:** Remaining alerts are separated by their source `host`.
    3.  **Group by Time:** Within each host, alerts are grouped if they occur within a 10-minute window.
    4.  **Deduplicate by Message:** Within each temporal group, alerts are clustered if their messages
        are semantically similar (cosine similarity > 0.80).

    **Critical Alert Rule:**
    - An alert is marked as critical if its `severity` is 8 or higher.
    """
    if embedding_model is None:
        raise HTTPException(
            status_code=503, 
            detail="Triage agent is unavailable: embedding model could not be loaded."
        )

    if not request.alerts:
        raise HTTPException(
            status_code=400,
            detail="Request must contain a non-empty list of alerts."
        )

    try:
        response_data = process_alert_triage(request.alerts)
        return response_data
    except Exception as e:
        # Generic error handler for unexpected issues during processing
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred during alert triage: {str(e)}"
        )