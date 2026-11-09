from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.database import Base


class FeedIOC(Base):
    __tablename__ = "feed_iocs"

    id = Column(Integer, primary_key=True, index=True)
    ioc_type = Column(String(20), nullable=False, index=True)
    value = Column(String(2048), nullable=False, index=True)
    normalized_value = Column(String(2048), nullable=False, index=True)

    # Attribution & Feed Metadata
    source_id = Column(String(50), nullable=False, index=True)
    source_name = Column(String(100), nullable=False)
    threat_context = Column(Text, nullable=True)
    confidence = Column(String(20), default="High", nullable=False, index=True)

    # Lifecycle & Time-To-Live (TTL)
    first_seen = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_seen = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Promotion to Core SOC Knowledge Base (Tier 2)
    is_promoted = Column(Boolean, default=False, nullable=False, index=True)
    promoted_to_ioc_id = Column(Integer, ForeignKey("iocs.id", ondelete="SET NULL"), nullable=True)

    promoted_ioc = relationship("IOC", foreign_keys=[promoted_to_ioc_id], lazy="selectin")

    __table_args__ = (
        UniqueConstraint("ioc_type", "normalized_value", name="uq_feed_ioc_type_normalized"),
    )
