from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict
from app.services.validator import VALID_IOC_TYPES


class CaseBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_id: str
    title: str
    category: str
    severity: str
    status: str
    incident_date: Optional[datetime] = None


class NewsBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    category: str
    severity: str
    published_date: Optional[datetime] = None


class IOCBase(BaseModel):
    ioc_type: str = Field(..., description="IOC Type: IPv4, IPv6, Domain, URL, MD5, SHA1, SHA256")
    value: str = Field(..., min_length=1, max_length=2048, description="Raw or defanged IOC value")
    description: Optional[str] = Field(None, description="Context, analyst notes, or threat attribution")

    @field_validator("ioc_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in VALID_IOC_TYPES:
            raise ValueError(f"IOC type must be one of: {', '.join(VALID_IOC_TYPES)}")
        return v


class IOCCreate(IOCBase):
    case_ids: Optional[List[int]] = Field(default_factory=list, description="Associated Case IDs")
    news_ids: Optional[List[int]] = Field(default_factory=list, description="Legacy associated news IDs")


class IOCUpdate(BaseModel):
    ioc_type: Optional[str] = None
    value: Optional[str] = Field(None, min_length=1, max_length=2048)
    description: Optional[str] = None
    case_ids: Optional[List[int]] = None
    news_ids: Optional[List[int]] = None

    @field_validator("ioc_type")
    @classmethod
    def validate_type(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_IOC_TYPES:
            raise ValueError(f"IOC type must be one of: {', '.join(VALID_IOC_TYPES)}")
        return v


class IOCResponse(IOCBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    normalized_value: str
    created_at: datetime
    updated_at: datetime
    cases: List[CaseBrief] = []
    news: List[NewsBrief] = []


class IOCListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ioc_type: str
    value: str
    normalized_value: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    case_count: int = 0
    news_count: int = 0
