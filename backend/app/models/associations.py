from sqlalchemy import Table, Column, Integer, ForeignKey, DateTime, func
from app.database import Base

case_iocs = Table(
    "case_iocs",
    Base.metadata,
    Column("case_id", Integer, ForeignKey("cases.id", ondelete="CASCADE"), primary_key=True),
    Column("ioc_id", Integer, ForeignKey("iocs.id", ondelete="CASCADE"), primary_key=True),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
)

# Kept for compatibility
news_iocs = Table(
    "news_iocs",
    Base.metadata,
    Column("news_id", Integer, ForeignKey("news.id", ondelete="CASCADE", use_alter=True), primary_key=True),
    Column("ioc_id", Integer, ForeignKey("iocs.id", ondelete="CASCADE", use_alter=True), primary_key=True),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
)
