from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    name: str = Field(..., min_length=1, description="Restaurant name")
    location: str = Field(..., min_length=1, description="City / region")


class SentimentBreakdown(BaseModel):
    positive: float
    neutral: float
    negative: float


class SourceCounts(BaseModel):
    google: int = 0
    yelp: int = 0
    tripadvisor: int = 0


class InsightsPayload(BaseModel):
    sentiment: SentimentBreakdown
    top_issues: list[str]
    recommendations: list[str]
    sources: SourceCounts


class AnalyzeResponse(BaseModel):
    job_id: str
    status: str
    restaurant_name: str
    restaurant_location: str
    insights: InsightsPayload
    detail: str = Field(
        default="Stub response; wire Apify + LLM + DB in pipeline.",
        description="Human-readable pipeline note (safe to show in UI).",
    )
    apify_dataset_url: str | None = Field(
        default=None,
        description="Apify Console dataset URL for this run (debugging; no secrets).",
    )
