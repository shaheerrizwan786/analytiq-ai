import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator

_GOOGLE_MAPS_PREFIXES = (
    "https://www.google.com/maps/",
    "https://maps.google.com/",
    "https://goo.gl/maps/",
)


class AnalyzeRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Restaurant name")
    location: str = Field(..., min_length=1, max_length=200, description="City / region")
    # Google Places API fields (optional, from Autocomplete)
    google_place_id: str | None = Field(None, max_length=200, description="Google Place ID from Autocomplete")
    google_place_url: str | None = Field(None, max_length=500, description="Google Maps URL")
    address: str | None = Field(None, max_length=500, description="Full address for cross-platform matching")
    coordinates: dict | None = Field(None, description="{'lat': float, 'lng': float}")

    @field_validator("google_place_id")
    @classmethod
    def validate_place_id(cls, v: str | None) -> str | None:
        if v is not None and not re.fullmatch(r"[A-Za-z0-9_\-]+", v):
            raise ValueError("Invalid Google Place ID format")
        return v

    @field_validator("google_place_url")
    @classmethod
    def validate_place_url(cls, v: str | None) -> str | None:
        if v is not None and not any(v.startswith(p) for p in _GOOGLE_MAPS_PREFIXES):
            raise ValueError("google_place_url must be a Google Maps URL")
        return v


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
    review_context: dict[str, str] | None = None
    review_detailed_rating: dict[str, float] | None = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., max_length=4000)


class ChatRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Restaurant name")
    location: str = Field(..., min_length=1, max_length=200, description="City / region")
    message: str = Field(..., min_length=1, max_length=4000, description="The user's latest message")
    history: list[ChatMessage] = Field(default_factory=list, description="Prior turns", max_length=50)
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


# Google Places API schemas
class PlaceAutocompletePrediction(BaseModel):
    place_id: str
    description: str
    structured_formatting: dict | None = None
    types: list[str] = []


class PlaceAutocompleteResponse(BaseModel):
    predictions: list[PlaceAutocompletePrediction]


class PlaceCoordinates(BaseModel):
    lat: float
    lng: float


class PlaceDetailsResponse(BaseModel):
    place_id: str
    name: str
    address: str | None = None
    coordinates: PlaceCoordinates | None = None
    rating: float | None = None
    total_ratings: int | None = None
    google_maps_url: str | None = None
    website: str | None = None
    phone: str | None = None
    price_level: int | None = None
    types: list[str] = []
    opening_hours: list[str] = []
