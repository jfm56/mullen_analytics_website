import pytest
from backend.utils.email_parser import parse_contact_payload


def test_parse_valid_payload():
    payload = {"name": "  Jane ", "email": " jane@example.com ", "message": " Hi "}
    out = parse_contact_payload(payload)
    assert out == {
        "name": "Jane",
        "email": "jane@example.com",
        "message": "Hi",
    }


def test_parse_invalid_types():
    with pytest.raises(ValueError):
        parse_contact_payload("not a dict")


def test_parse_missing_fields():
    with pytest.raises(ValueError):
        parse_contact_payload({"name": "", "email": "x@y.com", "message": ""})
