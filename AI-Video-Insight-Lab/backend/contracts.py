from __future__ import annotations

from pydantic import BaseModel, Field


class HighlightWindow(BaseModel):
    start: int = Field(ge=0)
    end: int = Field(gt=0)
    reason: str = Field(default="highlight", min_length=1, max_length=120)


class HighlightEditRequest(BaseModel):
    clip_id: str = Field(min_length=1)
    highlights: list[HighlightWindow] = Field(max_length=100)
    editor: str = Field(default="local-editor", min_length=1, max_length=80)

