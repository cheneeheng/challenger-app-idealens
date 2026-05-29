import os

import pytest_asyncio
from cryptography.fernet import Fernet
from httpx import ASGITransport, AsyncClient

# Configure environment before any app module imports settings.
os.environ.setdefault(
    "DATABASE_URL",
    os.environ.get(
        "TEST_DATABASE_URL",
        "postgresql+asyncpg://idealens:idealens@localhost:5432/idealens_test",
    ),
)
os.environ.setdefault("JWT_SECRET", "test-secret-key")
os.environ.setdefault("API_KEY_ENCRYPTION_KEY", Fernet.generate_key().decode())
os.environ.setdefault("ENVIRONMENT", "development")

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine  # noqa: E402
from sqlalchemy.pool import NullPool  # noqa: E402

from app.core.config import get_settings  # noqa: E402
from app.db.models import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import app  # noqa: E402


@pytest_asyncio.fixture(autouse=True)
async def _clear_settings_cache():
    get_settings.cache_clear()
    yield


@pytest_asyncio.fixture
async def db_session():
    """Per-test session joined to an external transaction.

    A SAVEPOINT (via ``join_transaction_mode="create_savepoint"``) lets the
    application code commit normally while the outer transaction is rolled
    back on teardown, isolating each test.
    """
    engine = create_async_engine(get_settings().DATABASE_URL, poolclass=NullPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    connection = await engine.connect()
    trans = await connection.begin()
    session = AsyncSession(
        bind=connection,
        expire_on_commit=False,
        autoflush=False,
        join_transaction_mode="create_savepoint",
    )

    yield session

    await session.close()
    await trans.rollback()
    await connection.close()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session):
    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def auth_client(client):
    """A client with a registered user and an attached Bearer token."""
    resp = await client.post(
        "/auth/register",
        json={"email": "owner@example.com", "password": "password123"},
    )
    token = resp.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return client
