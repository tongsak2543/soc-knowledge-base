from sqlalchemy import Column, Integer, String, Text, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.associations import case_iocs


class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(50), unique=True, nullable=False, index=True)  # e.g. CASE-2024-001 or CTI-2026-001
    title = Column(String(255), nullable=False, index=True)
    summary = Column(Text, nullable=True)
    category = Column(String(50), nullable=False, index=True)
    severity = Column(String(50), nullable=False, index=True)
    status = Column(String(50), nullable=False, default="Resolved", index=True)

    # Core SOC/DFIR Knowledge Base Fields
    investigation_findings = Column(Text, nullable=True)
    observed_behavior = Column(Text, nullable=True)
    investigation_method = Column(Text, nullable=True)
    root_cause = Column(Text, nullable=True)
    remediation = Column(Text, nullable=True)
    conclusion = Column(Text, nullable=True)

    tags = Column(Text, nullable=True, default="")
    incident_date = Column(DateTime(timezone=True), nullable=True, default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # MISP Integration Fields
    uuid = Column(String(36), nullable=True, index=True)
    tlp = Column(String(20), nullable=True, default="TLP:AMBER")
    threat_level = Column(String(20), nullable=True, default="High")
    analysis_stage = Column(String(50), nullable=True, default="Analysis Complete")

    # Many-to-many relationship with IOCs
    iocs = relationship("IOC", secondary=case_iocs, back_populates="cases", lazy="selectin")
