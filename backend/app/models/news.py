from sqlalchemy import Column, Integer, String, Text, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.associations import news_iocs


class News(Base):
    __tablename__ = "news"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    summary = Column(Text, nullable=True)
    content = Column(Text, nullable=False)
    source_name = Column(String(255), nullable=True)
    source_url = Column(String(1024), nullable=True)
    published_date = Column(DateTime(timezone=True), nullable=True, default=func.now())
    category = Column(String(50), nullable=False, index=True)
    severity = Column(String(50), nullable=False, index=True)
    tags = Column(Text, nullable=True, default="")  # Comma-separated or JSON string
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Many-to-many relationship with IOCs
    iocs = relationship("IOC", secondary=news_iocs, back_populates="news", lazy="selectin")

