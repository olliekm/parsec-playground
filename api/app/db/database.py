from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./parsec_playground.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=engine
)

Base = declarative_base()

def init_db():
    """Initialize the database connection."""
    from app.db.models import Run, Template, TemplateVersion
    Base.metadata.create_all(bind=engine)

def get_db():
    """Provide a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()