"""Exercise the forward migration against isolated, populated legacy tables."""
from pathlib import Path
import uuid

from sqlalchemy import text

from app.database import engine


def test_portal_columns_upgrade_preserves_values_and_is_repeatable():
    sql = (Path(__file__).resolve().parents[1] / "migrations" /
           "019_portal_model_columns.sql").read_text(encoding="utf-8")
    schema = "migration_test_" + uuid.uuid4().hex
    with engine.connect() as connection:
        transaction = connection.begin()
        try:
            # The generated identifier contains only ASCII letters/digits/underscore.
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            connection.execute(text("CREATE TABLE profiles (id INTEGER PRIMARY KEY)"))
            connection.execute(text("CREATE TABLE messages (id INTEGER PRIMARY KEY)"))
            connection.execute(text("INSERT INTO profiles (id) VALUES (1)"))
            connection.execute(text("INSERT INTO messages (id) VALUES (1)"))
            connection.execute(text(sql))
            row = connection.execute(text(
                "SELECT plan, plan_status, extra_dataset_slots, module_overrides, "
                "trial_ends_at, plan_selected_at, stripe_customer_id, "
                "stripe_subscription_id FROM profiles WHERE id = 1"
            )).one()
            assert tuple(row) == ("free_trial", "trialing", 0, None, None, None, None, None)
            assert connection.execute(text(
                "SELECT direction FROM messages WHERE id = 1"
            )).scalar_one() == "outbound"

            connection.execute(text(
                "UPDATE profiles SET plan = 'enterprise', plan_status = 'active', "
                "extra_dataset_slots = 3, module_overrides = '{\"qa\": false}'"
            ))
            connection.execute(text("UPDATE messages SET direction = 'inbound'"))
            connection.execute(text(sql))
            upgraded = connection.execute(text(
                "SELECT plan, plan_status, extra_dataset_slots, module_overrides "
                "FROM profiles WHERE id = 1"
            )).one()
            assert tuple(upgraded) == ("enterprise", "active", 3, {"qa": False})
            assert connection.execute(text(
                "SELECT direction FROM messages WHERE id = 1"
            )).scalar_one() == "inbound"
        finally:
            # Includes the temporary schema, tables, and all synthetic rows.
            transaction.rollback()
