from typing import List, Optional
from pydantic import BaseModel, Field


class BulkIOCItem(BaseModel):
    ioc_type: str
    value: str
    description: Optional[str] = None


class BulkIOCCreateRequest(BaseModel):
    items: List[BulkIOCItem]
    case_id: Optional[int] = None
    case_ids: Optional[List[int]] = None
    news_id: Optional[int] = None


class BulkIOCItemResult(BaseModel):
    ioc_type: str
    value: str
    normalized_value: Optional[str] = None
    status: str  # 'created', 'duplicate', 'invalid'
    id: Optional[int] = None
    error: Optional[str] = None


class BulkIOCCreateResponse(BaseModel):
    total_submitted: int
    created_count: int
    duplicate_count: int
    invalid_count: int
    results: List[BulkIOCItemResult]
