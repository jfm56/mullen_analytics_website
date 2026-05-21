"""
Pytest configuration and shared fixtures.

Environment variables must be set before any app import so pydantic-settings
picks them up when Settings() is first instantiated.

When the active Python interpreter lacks psycopg2 / SQLAlchemy (e.g. system
Python without the venv activated), DB-dependent fixtures skip automatically
so that the pure-unit tests (test_storage.py, test_email_parser*.py) still
run.  To run the full suite use the venv interpreter:

    .\\venv\\Scripts\\pytest          (Windows)
    ./venv/bin/pytest                (Linux/macOS / CI)
"""
import os
import pytest

# ------------------------------------------------------------------
# Override settings BEFORE importing anything from app/
# ------------------------------------------------------------------
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/mullen_analytics",
)
os.environ.setdefault("DATA_STORAGE_ROOT", r"D:\MullenAnalytics\TestStorage")
os.environ.setdefault("SESSION_COOKIE_SECURE", "false")
os.environ.setdefault("SECRET_KEY", "ci-test-secret-key-not-for-production")

# ------------------------------------------------------------------
# Attempt to load DB / app dependencies — degrade gracefully if absent
# ------------------------------------------------------------------
_SKIP_REASON = (
    "DB dependencies unavailable on this Python. "
    "Run: .\\venv\\Scripts\\pytest"
)

try:
    from sqlalchemy import create_engine          # noqa: E402
    from sqlalchemy.orm import sessionmaker       # noqa: E402
    from fastapi.testclient import TestClient     # noqa: E402
    from app.database import Base, get_db         # noqa: E402
    from app.main import app as _app              # noqa: E402
    _HAS_DB = True
except Exception:                                 # pylint: disable=broad-exception-caught
    _HAS_DB = False

# ------------------------------------------------------------------
# Session-level table setup (only when DB deps are present)
# ------------------------------------------------------------------
if _HAS_DB:
    _TEST_DB_URL = os.environ["DATABASE_URL"]
    _engine = create_engine(_TEST_DB_URL, pool_pre_ping=True)
    _Session = sessionmaker(autocommit=False, autoflush=False, bind=_engine)

    @pytest.fixture(scope="session", autouse=True)
    def create_test_tables():
        Base.metadata.create_all(bind=_engine)
        yield
        Base.metadata.drop_all(bind=_engine)

    @pytest.fixture()
    def db(create_test_tables):  # noqa: F811 – intentional shadow
        connection = _engine.connect()
        transaction = connection.begin()
        session = _Session(bind=connection)
        try:
            yield session
        finally:
            session.close()
            transaction.rollback()
            connection.close()

    @pytest.fixture()
    def client(db):
        def _override():
            try:
                yield db
            finally:
                pass
        _app.dependency_overrides[get_db] = _override
        with TestClient(_app, raise_server_exceptions=True) as c:
            yield c
        _app.dependency_overrides.clear()

    @pytest.fixture()
    def auth_client(db, client):
        from app.models.user import User, Profile   # noqa: PLC0415
        from app.services.auth import hash_password  # noqa: PLC0415

        user = User(
            email="ci-admin@example.com",
            password_hash=hash_password("CIpassword1!"),
            email_confirmed=True,
        )
        db.add(user)
        db.flush()
        db.add(Profile(id=user.id, email=user.email, role="admin", full_name="CI Admin"))
        db.commit()

        res = client.post("/api/auth/login", json={"email": user.email, "password": "CIpassword1!"})
        assert res.status_code == 200, res.text
        return client, {"id": str(user.id), "email": user.email}

else:
    # Stub fixtures that skip with a clear message
    @pytest.fixture()
    def db():
        pytest.skip(_SKIP_REASON)

    @pytest.fixture()
    def client():
        pytest.skip(_SKIP_REASON)

    @pytest.fixture()
    def auth_client():
        pytest.skip(_SKIP_REASON)
