from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.associations import case_iocs, news_iocs


class IOC(Base):
    __tablename__ = "iocs"

    id = Column(Integer, primary_key=True, index=True)
    ioc_type = Column(String(20), nullable=False, index=True)
    value = Column(String(2048), nullable=False, index=True)
    normalized_value = Column(String(2048), nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # MISP Integration Fields
    uuid = Column(String(36), nullable=True, index=True)
    misp_category = Column(String(50), nullable=True, default="Network activity")
    to_ids = Column(Boolean, nullable=True, default=True)
    tlp = Column(String(20), nullable=True, default="TLP:AMBER")
    confidence = Column(String(20), nullable=True, default="High")

    # Many-to-many relationship with SOC Cases
    cases = relationship("Case", secondary=case_iocs, back_populates="iocs", lazy="selectin")

    # Legacy/compatibility relationship
    news = relationship("News", secondary=news_iocs, back_populates="iocs", lazy="selectin")

    __table_args__ = (
        UniqueConstraint("ioc_type", "normalized_value", name="uq_ioc_type_normalized_value"),
    )
