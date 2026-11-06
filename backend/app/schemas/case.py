from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict
from app.services.validator import VALID_CATEGORIES, VALID_SEVERITIES, VALID_STATUSES


class IOCBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ioc_type: str
    value: str
    normalized_value: str
    description: Optional[str] = None


class InlineIOCCreate(BaseModel):
    ioc_type: str
    value: str
    description: Optional[str] = None


class CaseBase(BaseModel):
    case_id: str = Field(..., min_length=1, max_length=50, description="Unique SOC Case Identifier (e.g. CASE-2024-001)")
    title: str = Field(..., min_length=1, max_length=255, description="Case Title / Incident Headline")
    summary: Optional[str] = Field(None, description="Executive Summary / Brief description")
    category: str = Field(..., description="Incident category")
    severity: str = Field(..., description="Severity classification")
    status: str = Field("Resolved", description="Case investigation status: Open, In Progress, Resolved, Closed")

    # DFIR & Investigation Knowledge Base Fields
    investigation_findings: Optional[str] = Field(None, description="Detailed findings and evidence discovered during investigation")
    observed_behavior: Optional[str] = Field(None, description="Attacker behavior, techniques, and observed execution mechanics (TTPs)")
    investigation_method: Optional[str] = Field(None, description="Tools and forensics methods used (e.g. Volatility, Wireshark, Sysmon)")
    root_cause: Optional[str] = Field(None, description="Initial access vector or underlying vulnerability root cause")
    remediation: Optional[str] = Field(None, description="Containment actions, patching, and preventive remediation steps")
    conclusion: Optional[str] = Field(None, description="Post-incident retrospective and final conclusion")

    tags: Optional[str] = Field("", description="Comma-separated tags")
    incident_date: Optional[datetime] = Field(default_factory=datetime.now, description="When the incident occurred")

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

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in VALID_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(VALID_STATUSES)}")
        return v


class CaseCreate(CaseBase):
    ioc_ids: Optional[List[int]] = Field(default_factory=list, description="IDs of existing IOCs to link")
    new_iocs: Optional[List[InlineIOCCreate]] = Field(default_factory=list, description="New IOCs to create & link")


class CaseUpdate(BaseModel):
    case_id: Optional[str] = Field(None, min_length=1, max_length=50)
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    summary: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None

    investigation_findings: Optional[str] = None
    observed_behavior: Optional[str] = None
    investigation_method: Optional[str] = None
    root_cause: Optional[str] = None
    remediation: Optional[str] = None
    conclusion: Optional[str] = None

    tags: Optional[str] = None
    incident_date: Optional[datetime] = None
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

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(VALID_STATUSES)}")
        return v


class CaseResponse(CaseBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
    iocs: List[IOCBrief] = []


class CaseListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_id: str
    title: str
    summary: Optional[str] = None
    category: str
    severity: str
    status: str
    tags: Optional[str] = None
    incident_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    ioc_count: int = 0

