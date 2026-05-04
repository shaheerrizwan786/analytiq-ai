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
    strengths: list[str] = []
    sources: SourceCounts


class ReviewItem(BaseModel):
    id: str
    source: str
    text: str
    rating: float | None = None
    date_iso: str | None = None


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    name: str = Field(..., min_length=1, description="Restaurant name")
    location: str = Field(..., min_length=1, description="City / region")
    message: str = Field(..., min_length=1, description="The user's latest message")
    history: list[ChatMessage] = Field(default_factory=list, description="Prior turns")
    # Optional pre-computed insights to enrich the context (passed by frontend from last analyze result)
    top_issues: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str
    fallback: bool = False  # True if LLM unavailable and a canned response was returned


class AnalyzeResponse(BaseModel):
    job_id: str
    status: str
    restaurant_name: str
    restaurant_location: str
    insights: InsightsPayload
    reviews: list[ReviewItem] = []
    detail: str = Field(
        default="Stub response; wire Apify + LLM + DB in pipeline.",
        description="Human-readable pipeline note (safe to show in UI).",
    )
    apify_dataset_url: str | None = Field(
        default=None,
        description="Apify Console dataset URL(s) for this run (debugging; no secrets).",
    )
    extracted_range_from: str | None = Field(
        default=None,
        description="Incremental lower bound used for this extraction window (ISO UTC).",
    )
    extracted_range_to: str | None = Field(
        default=None,
        description="Latest review timestamp persisted after this extraction (ISO UTC).",
    )
    new_reviews_count: int = Field(
        default=0,
        description="Count of newly persisted reviews in this run.",
    )
