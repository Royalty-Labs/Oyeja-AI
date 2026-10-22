
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BusinessCreate(BaseModel):
    """Fields required to register a business."""

    name: str = Field(min_length=2, max_length=150)
    business_type: str = Field(min_length=2, max_length=100)
    location: str = Field(min_length=2, max_length=150)
    currency: str = Field(default="NGN", min_length=3, max_length=3)


class BusinessResponse(BaseModel):
    """Fields returned when a business is retrieved."""

    id: int
    name: str
    business_type: str
    location: str
    currency: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
