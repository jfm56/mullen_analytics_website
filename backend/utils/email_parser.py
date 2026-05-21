def parse_contact_payload(payload: dict) -> dict:
    """Parse and normalize a contact form payload.

    Args:
        payload: dict with keys name, email, message.

    Returns:
        Normalized dict ensuring required keys and stripped strings.
    """
    if not isinstance(payload, dict):
        raise ValueError("payload must be a dict")

    name = str(payload.get("name", "")).strip()
    email = str(payload.get("email", "")).strip()
    message = str(payload.get("message", "")).strip()

    if not name or not email or not message:
        raise ValueError("name, email, and message are required")

    return {"name": name, "email": email, "message": message}
