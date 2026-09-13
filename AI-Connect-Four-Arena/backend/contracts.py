from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class MatchRecord(BaseModel):
    match_id: str = Field(min_length=1)
    result: Literal["human", "ai", "draw"]
    moves: int = Field(ge=0, le=100)
    depth: int = Field(ge=1, le=8)
    challenge_id: str = ""
    ended_at: str = Field(min_length=1)
    board_key: str = Field(min_length=42, max_length=42)

