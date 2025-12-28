from sqlalchemy import Column, Integer, String, ForeignKey, JSON, Text, Float, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base

class Template(Base):

    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    runs = relationship("Run", back_populates="template")
    versions = relationship("TemplateVersion", back_populates="template")

class TemplateVersion(Base):

    __tablename__ = "template_versions"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("templates.id"), nullable=False)
    version = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    variables = Column(JSON)
    schema = Column(JSON)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    template = relationship("Template", back_populates="versions")

class Run(Base):
    
    __tablename__ = "runs"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("templates.id"), nullable=True)
    provider = Column(String, nullable=False)
    model = Column(String, nullable=False)
    prompt = Column(Text, nullable=False)
    schema = Column(JSON)
    raw_output = Column(Text)
    parsed_output = Column(JSON)
    validation_errors = Column(JSON)
    latency_ms = Column(Float)
    tokens_used = Column(Integer)
    retry_count = Column(Integer, default=0)
    validation_status = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    template = relationship("Template", back_populates="runs")

