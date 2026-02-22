"""
Supabase client initialization.
Uses SUPABASE_URL and SUPABASE_SERVICE_KEY env vars.
Service key bypasses Row Level Security — safe for server-side use only.
"""
import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load variables from backend/.env into os.environ
load_dotenv()

_client: Client | None = None


def get_db() -> Client:
    """Return the Supabase client, initializing once."""
    global _client
    if _client is not None:
        return _client

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")

    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables must be set. "
            "Find them in your Supabase project: Settings → API."
        )

    _client = create_client(url, key)
    return _client
