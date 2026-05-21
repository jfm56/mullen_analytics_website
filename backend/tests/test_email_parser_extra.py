import pytest
from backend.utils.email_parser import parse_contact_payload


def test_trims_whitespace_and_preserves_content():
    payload = {"name": "  John Doe  ", "email": "  john@example.com ", "message": "  Hello world  "}
    out = parse_contact_payload(payload)
    assert out == {"name": "John Doe", "email": "john@example.com", "message": "Hello world"}


def test_non_string_values_are_coerced_to_strings():
    payload = {"name": 123, "email": "user@example.com", "message": ["hi", "there"]}
    out = parse_contact_payload(payload)
    assert out == {"name": "123", "email": "user@example.com", "message": "['hi', 'there']"}


def test_missing_any_required_field_raises():
    with pytest.raises(ValueError):
        parse_contact_payload({"name": "", "email": "e@x.com", "message": "ok"})
    with pytest.raises(ValueError):
        parse_contact_payload({"name": "Ann", "email": " ", "message": "ok"})
    with pytest.raises(ValueError):
        parse_contact_payload({"name": "Ann", "email": "e@x.com", "message": "  "})


def test_rejects_non_dict_input():
    for bad in (None, 42, "str", ["list"], ("tuple",), object()):
        with pytest.raises(ValueError):
            parse_contact_payload(bad)


def test_extra_keys_are_ignored():
    payload = {"name": "Jane", "email": "j@x.com", "message": "Hi", "extra": "ignore"}
    out = parse_contact_payload(payload)
    assert out == {"name": "Jane", "email": "j@x.com", "message": "Hi"}
