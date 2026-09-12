from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Identifier = Annotated[str, Field(pattern=r"^[a-zA-Z0-9_.-]{1,100}$")]
Count = Annotated[int, Field(strict=True, ge=0, le=1_000_000_000)]
Number = Annotated[float, Field(ge=0, le=1_000_000_000, allow_inf_nan=False)]


class Step(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: Identifier
    name: str = Field(min_length=1, max_length=200)
    agent: str = Field(min_length=1, max_length=200)
    tool: str = Field(min_length=1, max_length=200)
    type: Literal["reasoning", "tool"]
    status: Literal["success", "failed"]
    duration_ms: Number
    start_ms: Number | None = None
    tokens_in: Count | None = None
    tokens_out: Count | None = None
    cost_usd: Number | None = None
    retries: Count = 0
    notes: str = Field(default="", max_length=4000)


class Run(BaseModel):
    model_config = ConfigDict(extra="forbid")

    run_id: Identifier
    workflow: str = Field(min_length=1, max_length=200)
    status: Literal["completed", "completed_with_warnings", "failed"]
    objective: str = Field(min_length=1, max_length=1000)
    started_at: datetime
    source: Literal["sample", "measured", "imported"] = "imported"
    steps: list[Step] = Field(min_length=1, max_length=200)

    @model_validator(mode="after")
    def validate_trace(self):
        if self.started_at.tzinfo is None:
            raise ValueError("started_at must include a timezone")
        if len({step.id for step in self.steps}) != len(self.steps):
            raise ValueError("step IDs must be unique within a run")
        offsets = [step.start_ms is not None for step in self.steps]
        if any(offsets) and not all(offsets):
            raise ValueError("provide start_ms for every step or omit it for every step")
        if self.status == "completed" and any(step.status == "failed" for step in self.steps):
            raise ValueError("a completed run cannot contain failed steps")
        return self


class RunBatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    runs: list[Run] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def unique_runs(self):
        if len({run.run_id for run in self.runs}) != len(self.runs):
            raise ValueError("run IDs must be unique within a batch")
        return self
