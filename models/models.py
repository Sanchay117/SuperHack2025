"""
models/models.py

Defines the Pydantic data models for API requests and responses.
These models ensure type safety and data validation across the application.
"""
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime
import uuid

class Alert(BaseModel):
    """
    Represents a single raw alert received by the system.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    # FIX: Use 'json_schema_extra' instead of 'example' for Pydantic v2
    host: str = Field(
        ..., 
        description="The hostname or IP of the affected system.", 
        json_schema_extra={'example': 'server-db-01'}
    )
    timestamp: datetime = Field(..., description="The UTC timestamp of when the alert was generated.")
    severity: int = Field(..., ge=1, le=10, description="Severity score from 1 (info) to 10 (critical).")
    # FIX: Use 'json_schema_extra' instead of 'example'
    message: str = Field(
        ..., 
        description="The raw alert message.", 
        json_schema_extra={'example': 'High CPU utilization detected at 95%.'}
    )

class AlertCluster(BaseModel):
    """
    Represents a group of related alerts that have been clustered together.
    """
    cluster_id: str = Field(default_factory=lambda: f"cluster-{uuid.uuid4()}")
    host: str = Field(..., description="The common host for all alerts in this cluster.")
    start_time: datetime = Field(..., description="Timestamp of the first alert in the cluster.")
    end_time: datetime = Field(..., description="Timestamp of the last alert in the cluster.")
    alerts: List[Alert] = Field(..., description="The list of individual alerts belonging to this cluster.")
    representative_message: str = Field(..., description="A message that summarizes the alerts in the cluster (typically the first message).")
    count: int = Field(..., description="The total number of alerts in the cluster.")

class TriageRequest(BaseModel):
    """
    The request body for the /agents/triage endpoint.
    """
    alerts: List[Alert]

class TriageResponse(BaseModel):
    """
    The response model for the /agents/triage endpoint, containing
    the clustered alerts and any identified critical alerts.
    """
    clusters: List[AlertCluster] = Field(..., description="A list of alert clusters created from the raw alerts.")
    critical_alerts: List[Alert] = Field(..., description="A list of standalone alerts marked as critical.")