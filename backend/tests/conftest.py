from pathlib import Path
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

BACKEND_DIR = Path(__file__).resolve().parents[1]

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import settings
from app.core.security import create_access_token, hash_password
from app.db.base import Base
from app.db.database import get_db
from app.main import app
from app.models import Business, Transaction, User


@pytest.fixture
def client(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
    )

    Base.metadata.create_all(bind=engine)

    # Use a test-only signing key; never depend on the real .env secret.
    monkeypatch.setattr(
        settings,
        "JWT_SECRET_KEY",
        "test-only-secret-for-oyeja-tests",
    )

    seed_db = TestingSessionLocal()
    try:
        test_user = User(
            email="test@example.com",
            hashed_password=hash_password("TestPassword123"),
        )
        seed_db.add(test_user)
        seed_db.commit()
        seed_db.refresh(test_user)
        test_token = create_access_token(subject=str(test_user.id))
    finally:
        seed_db.close()

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(app) as test_client:
            test_client.headers['Authorization'] = f'Bearer {test_token}'
            yield test_client
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
