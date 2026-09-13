from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class AuditRunRequest(BaseModel):
    dataset_id: str | None = Field(default=None, min_length=1)


class ReviewRequest(BaseModel):
    dataset_id: str = Field(min_length=1)
    sample_id: str = Field(min_length=1)
    status: Literal["keep", "repair", "drop"]
    note: str = Field(default="", max_length=500)
    reviewer: str = Field(default="local-reviewer", min_length=1, max_length=80)


class ReleaseRunRequest(BaseModel):
    dataset_id: str = Field(min_length=1)
    quality_threshold: float = Field(default=0.65, ge=0, le=1)
    source_threshold: float = Field(default=0.90, ge=0, le=1)
    duplicate_threshold: float = Field(default=0.10, ge=0, le=1)
    leakage_threshold: int = Field(default=0, ge=0, le=1000)
