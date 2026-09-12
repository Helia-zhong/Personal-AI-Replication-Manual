from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


Identifier = Annotated[str, Field(pattern=r"^[A-Za-z0-9_.-]{1,100}$")]


class Source(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: Identifier
    title: str = Field(min_length=1, max_length=200)
    text: str = Field(min_length=1, max_length=10000)


class Sample(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: Identifier
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=8, max_length=200000)
    source: Literal["sample", "imported"] = "imported"
    sources: list[Source] = Field(max_length=200)

    @model_validator(mode="after")
    def unique_source_ids(self):
        if len({source.id for source in self.sources}) != len(self.sources):
            raise ValueError("source IDs must be unique within a sample")
        return self


class SampleBatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    samples: list[Sample] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def unique_sample_ids(self):
        if len({sample.id for sample in self.samples}) != len(self.samples):
            raise ValueError("sample IDs must be unique within a batch")
        return self
