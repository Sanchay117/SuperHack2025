"""
main.py

This is the main entry point for the FastAPI application.
It creates the FastAPI app instance and includes the routers from the agent modules.
Person 4 (Coordinator) will later add other agents' routers to this file.
"""
from fastapi import FastAPI
from agents import triage_agent

# Create the main FastAPI application instance
app = FastAPI(
    title="SuperHack 2025 - AI Agent Co-Pilot",
    description="An AI-powered system to automate IT management tasks like alert triage and patch management.",
    version="1.0.0"
)

# Include the router from the Triage Agent.
# This makes the `/agents/triage` endpoint available.
app.include_router(triage_agent.router)

@app.get("/", tags=["Health Check"])
async def read_root():
    """
    A simple health check endpoint to confirm the API is running.
    """
    return {"status": "ok", "message": "AI Agent Service is running."}
