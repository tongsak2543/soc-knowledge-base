from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict
from app.services.validator import VALID_CATEGORIES, VALID_SEVERITIES


class IOCBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ioc_type: str
    value: str
    normalized_value: str
    description: Optional[str] = None


class NewsBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Threat news headline")
    summary: Optional[str] = Field(None, description="Short summary/executive overview")
    content: str = Field(..., min_length=1, description="Full detailed news article content")
    source_name: Optional[str] = Field(None, max_length=255, description="Reporting organization or source")
    source_url: Optional[str] = Field(None, max_length=1024, description="Link to source article")
    published_date: Optional[datetime] = Field(default_factory=datetime.now, description="Original publication timestamp")
    category: str = Field(..., description="Threat category")
    severity: str = Field(..., description="Severity classification")
    tags: Optional[str] = Field("", description="Comma-separated tags")

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        if v not in VALID_CATEGORIES:
            raise ValueError(f"Category must be one of: {', '.join(VALID_CATEGORIES)}")
        return v

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: str) -> str:
        if v not in VALID_SEVERITIES:
            raise ValueError(f"Severity must be one of: {', '.join(VALID_SEVERITIES)}")
        return v


class InlineIOCCreate(BaseModel):
    ioc_type: str
    value: str
    description: Optional[str] = None


class NewsCreate(NewsBase):
    ioc_ids: Optional[List[int]] = Field(default_factory=list, description="IDs of existing IOCs to link")
    new_iocs: Optional[List[InlineIOCCreate]] = Field(default_factory=list, description="New IOCs to create & link")


class NewsUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    summary: Optional[str] = None
    content: Optional[str] = Field(None, min_length=1)
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    published_date: Optional[datetime] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    tags: Optional[str] = None
    ioc_ids: Optional[List[int]] = None

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_CATEGORIES:
            raise ValueError(f"Category must be one of: {', '.join(VALID_CATEGORIES)}")
        return v

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_SEVERITIES:
            raise ValueError(f"Severity must be one of: {', '.join(VALID_SEVERITIES)}")
        return v


class NewsResponse(NewsBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
    iocs: List[IOCBrief] = []


class NewsListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    summary: Optional[str] = None
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    published_date: Optional[datetime] = None
    category: str
    severity: str
    tags: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    ioc_count: int = 0

