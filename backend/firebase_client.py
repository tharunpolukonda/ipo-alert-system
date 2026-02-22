"""
Firebase Admin SDK client initialization.
Reads FIREBASE_SERVICE_ACCOUNT_JSON from environment variable (JSON string).
"""
import os
import json
import firebase_admin
from firebase_admin import credentials, firestore

_db = None


def get_db():
    """Return the Firestore client, initializing Firebase once."""
    global _db
    if _db is not None:
        return _db

    if not firebase_admin._apps:
        sa_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
        if not sa_json:
            raise RuntimeError(
                "FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set. "
                "Please add your Firebase service account JSON as this env var."
            )
        sa_dict = json.loads(sa_json)
        cred = credentials.Certificate(sa_dict)
        firebase_admin.initialize_app(cred)

    _db = firestore.client()
    return _db
