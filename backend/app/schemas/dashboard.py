from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class DashboardRecentCase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_id: str
    title: str
    category: str
    severity: str
    status: str
    incident_date: Optional[datetime]
    created_at: datetime
    ioc_count: int


class DashboardRecentIOC(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ioc_type: str
    value: str
    normalized_value: str
    description: Optional[str] = None
    created_at: datetime
    case_count: int


class DashboardStats(BaseModel):
    total_cases: int
    total_iocs: int
    recent_cases: List[DashboardRecentCase] = []
    recent_iocs: List[DashboardRecentIOC] = []
    cases_by_category: Dict[str, int] = {}
    cases_by_severity: Dict[str, int] = {}
    cases_by_status: Dict[str, int] = {}
    iocs_by_type: Dict[str, int] = {}

    # Compatibility aliases
    total_news: Optional[int] = 0
    critical_news: Optional[int] = 0
    high_news: Optional[int] = 0
    recent_news: Optional[list] = []
    news_by_category: Optional[Dict[str, int]] = {}
    news_by_severity: Optional[Dict[str, int]] = {}
