
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker 

from app.core.config import settings


if not settings.DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is missing. Check the root .env file."
    )


database_url = make_url(settings.DATABASE_URL)

# Use the Psycopg 3 driver installed for this project.
if database_url.drivername in ("postgresql", "postgres"):
    database_url = database_url.set(drivername="postgresql+psycopg")

engine = create_engine(
    database_url,
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()

def test_database_connection() -> bool:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    return True
