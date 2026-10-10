
from fastapi import Depends
from google import genai
from google.cloud import spanner

from app.auth import get_current_uid
from app.config import Settings, get_settings
from app.logging_setup import get_current_request_id

# Singletons for reused clients
_spanner_client: spanner.Client | None = None
_genai_client: genai.Client | None = None


def get_spanner_client(settings: Settings | None = None) -> spanner.Client:
    """Return shared Google Cloud Spanner client."""
    global _spanner_client
    if settings is None:
        settings = get_settings()
    if _spanner_client is None:
        _spanner_client = spanner.Client(project=settings.GCP_PROJECT)
    return _spanner_client


def get_spanner_database(
    settings: Settings | None = None,
    client: spanner.Client | None = None,
):
    """Return Spanner database handle."""
    if settings is None:
        settings = get_settings()
    if client is None:
        client = get_spanner_client(settings)
    instance = client.instance(settings.SPANNER_INSTANCE)
    return instance.database(settings.SPANNER_DATABASE)


def get_genai_client(settings: Settings | None = None) -> genai.Client:
    """Return Google GenAI client configured for Vertex AI mode."""
    global _genai_client
    if settings is None:
        settings = get_settings()
    if _genai_client is None:
        _genai_client = genai.Client(
            vertexai=True,
            project=settings.GCP_PROJECT,
            location=settings.VERTEX_LOCATION,
        )
    return _genai_client


# Re-export auth dependency for convenience
CurrentUser = Depends(get_current_uid)
RequestId = Depends(get_current_request_id)
