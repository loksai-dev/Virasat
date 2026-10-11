"""Privacy and PII Redaction Service for Virasat.

Enforces:
- Masked IDs (PAN XXXXX1234X, Aadhaar XXXX-XXXX-1234, bank/demat/card/account XXXX1234).
- PII redaction (Sensitive Data Protection / DLP pattern matching) before text
  reaches Gemini models and before logging.
- AuditLog payload redaction.
- Controlled by settings.REDACT_PII flag.
"""

import re
from typing import Any

from app.config import get_settings

# Regex patterns for Indian financial and personal identifiers
PAN_PATTERN = re.compile(r"\b([A-Z]{5})(\d{4})([A-Z])\b", re.IGNORECASE)
AADHAAR_PATTERN = re.compile(r"\b(\d{4})[\s-](\d{4})[\s-](\d{4})\b")
PHONE_PATTERN = re.compile(r"\b(?:\+?91[\s-]?)?([6-9]\d{2})\d{3}(\d{4})\b")
EMAIL_PATTERN = re.compile(r"\b([a-zA-Z0-9_.+-])[a-zA-Z0-9_.+-]*@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)\b")
ACCOUNT_PATTERN = re.compile(r"\b(\d{5,14})(\d{4})\b")

SENSITIVE_FIELD_KEYS = {
    "password", "secret", "token", "raw_token", "aadhaar", "aadhaar_raw",
    "pan_raw", "phone", "email", "account_number", "card_number",
    "pin", "cvv", "otp",
}


def mask_pan(pan: str) -> str:
    """Mask PAN to XXXXX1234X format."""
    clean = pan.strip().upper()
    if len(clean) == 10:
        return f"XXXXX{clean[5:9]}X"
    return "XXXXX****X"


def mask_aadhaar(aadhaar: str) -> str:
    """Mask 12-digit Aadhaar to XXXX-XXXX-1234 format."""
    clean = re.sub(r"\D", "", aadhaar)
    if len(clean) == 12:
        return f"XXXX-XXXX-{clean[-4:]}"
    return "XXXX-XXXX-XXXX"


def mask_account_or_ref(ref: str) -> str:
    """Mask account or folio to last 4 digits (e.g. …1234)."""
    clean = re.sub(r"\D", "", str(ref))
    if len(clean) >= 4:
        return f"…{clean[-4:]}"
    return "…XXXX"


def redact_text_pii(text: str) -> str:
    """Redact identifiable PII from string before sending to LLM or logs."""
    if not text or not isinstance(text, str):
        return text

    settings = get_settings()
    if not getattr(settings, "REDACT_PII", True):
        return text

    # Redact Aadhaar
    redacted = AADHAAR_PATTERN.sub(r"XXXX-XXXX-\3", text)
    # Redact PAN
    redacted = PAN_PATTERN.sub(r"XXXXX\2X", redacted)
    # Redact Phone
    redacted = PHONE_PATTERN.sub(r"XXXXXX\2", redacted)
    # Redact Email
    redacted = EMAIL_PATTERN.sub(r"\1***@\2", redacted)

    return redacted


def redact_payload_pii(data: Any) -> Any:
    """Recursively redact PII from nested dictionaries and lists."""
    if isinstance(data, dict):
        result = {}
        for k, v in data.items():
            lower_k = k.lower()
            if any(s in lower_k for s in SENSITIVE_FIELD_KEYS):
                if isinstance(v, str):
                    if "pan" in lower_k:
                        result[k] = mask_pan(v)
                    elif "aadhaar" in lower_k:
                        result[k] = mask_aadhaar(v)
                    elif "account" in lower_k or "card" in lower_k:
                        result[k] = mask_account_or_ref(v)
                    else:
                        result[k] = "[REDACTED]"
                else:
                    result[k] = "[REDACTED]"
            else:
                result[k] = redact_payload_pii(v)
        return result
    elif isinstance(data, list):
        return [redact_payload_pii(item) for item in data]
    elif isinstance(data, str):
        return redact_text_pii(data)
    return data
