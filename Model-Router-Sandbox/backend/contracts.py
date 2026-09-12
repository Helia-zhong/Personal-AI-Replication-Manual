from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


Identifier = Annotated[str, Field(pattern=r"^[A-Za-z0-9_.-]{1,100}$")]
Score = Annotated[float, Field(ge=0, le=1, allow_inf_nan=False)]
NonNegative = Annotated[float, Field(ge=0, le=1_000_000_000, allow_inf_nan=False)]


class ModelProfile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: Identifier
    name: str = Field(min_length=1, max_length=200)
    provider: Literal["cloud", "local"]
    privacy_mode: Literal["standard", "enterprise", "private"]
    context_window: Annotated[int, Field(strict=True, ge=1, le=10_000_000)]
    latency_ms_p95: NonNegative
    input_cost_per_1k: NonNegative
    output_cost_per_1k: NonNegative
    safety_score: Score
    quality: dict[str, Score] = Field(min_length=1, max_length=20)


class RoutingTask(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: Identifier
    name: str = Field(min_length=1, max_length=200)
    task_type: Literal["classification", "extraction", "summarization", "reasoning", "content_qa"]
    risk_level: Literal["low", "medium", "high"]
    context_tokens: Annotated[int, Field(strict=True, ge=1, le=10_000_000)]
    expected_output_tokens: Annotated[int, Field(strict=True, ge=0, le=10_000_000)]
    latency_budget_ms: NonNegative
    max_budget_usd: NonNegative
    privacy: Literal["standard", "enterprise", "restricted"]
    min_quality: Score


class WeightProfile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    quality: Score
    safety: Score
    latency: Score
    cost: Score
    context: Score

    @model_validator(mode="after")
    def has_signal(self):
        if sum(self.model_dump().values()) <= 0:
            raise ValueError("at least one routing weight must be greater than zero")
        return self


class ExperimentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    task_id: Identifier
    weights: WeightProfile | None = None
    budget_multiplier: Annotated[float, Field(gt=0, le=10, allow_inf_nan=False)] = 1
    quality_adjustment: Annotated[float, Field(ge=-1, le=1, allow_inf_nan=False)] = 0


class ExperimentRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    experiment_id: Identifier
    created_at: str
    request: ExperimentRequest
    result: dict
