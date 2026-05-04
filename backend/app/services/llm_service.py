"""LLM-powered insights using OpenAI gpt-4o-mini.

generate_insights() returns a populated InsightsPayload or None on any failure.
The caller should fall back to stub_insights_from_reviews() when None is returned.
"""

import json
import logging
import textwrap

from openai import OpenAI, OpenAIError

from app.schemas import InsightsPayload, SentimentBreakdown, SourceCounts

logger = logging.getLogger(__name__)

# Hard cap to control token spend (~$0.0002 per call on gpt-4o-mini at this size)
_MAX_REVIEWS = 60
_MODEL = "gpt-4o-mini"


def generate_insights(
    reviews: list,
    api_key: str,
    sentiment: SentimentBreakdown,
    sources: SourceCounts,
) -> InsightsPayload | None:
    """Call OpenAI to generate structured insights from real reviews.

    Args:
        reviews:   list of review-like objects with .text, .rating, .source attributes
        api_key:   OpenAI API key
        sentiment: pre-computed sentiment breakdown (passed through to the result)
        sources:   pre-computed source counts (passed through to the result)

    Returns:
        InsightsPayload on success, None on any failure (API error, parse error, etc.)
    """
    if not reviews:
        return None

    # Build compact review list, capped to control token spend
    capped = reviews[:_MAX_REVIEWS]
    review_lines = []
    for i, r in enumerate(capped, start=1):
        rating_str = f"★{r.rating:.1f}" if getattr(r, "rating", None) is not None else "no rating"
        source = getattr(r, "source", "unknown")
        text = (getattr(r, "text", "") or "").strip()[:300]
        review_lines.append(f"{i}. [{source} {rating_str}] {text}")

    reviews_block = "\n".join(review_lines)
    total = len(capped)

    system_prompt = textwrap.dedent("""\
        You are an expert restaurant business analyst. Your job is to read customer reviews
        and identify the most important issues and actionable recommendations for the restaurant owner.
        Keep language plain and practical — the owner is not technical.
        Output ONLY valid JSON. No markdown, no extra text, no explanation.
    """)

    user_prompt = textwrap.dedent(f"""\
        Below are {total} customer reviews for a restaurant.
        Analyse them and return a JSON object with exactly these two fields:

        "top_issues": array of 3-5 strings. Each string must follow this format:
          "<issue title> — mentioned in ~<N> reviews — <why it matters to the business>"
          Example: "Slow service — mentioned in ~12 reviews — causes customers to leave frustrated and unlikely to return"

        "recommendations": array of 3-5 strings. Each string must follow this format:
          "<specific action> (<low/medium/high cost>) — <expected impact>"
          Example: "Add a second staff member during dinner peak hours (medium cost) — reduces wait times and improves overall satisfaction"

        Base everything only on the reviews below. Do not invent issues not mentioned.

        REVIEWS:
        {reviews_block}
    """)

    try:
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model=_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=800,
        )
        raw = response.choices[0].message.content or ""
    except OpenAIError as exc:
        logger.warning("OpenAI API call failed: %s", exc)
        return None
    except Exception as exc:
        logger.warning("Unexpected error calling OpenAI: %s", exc)
        return None

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.warning("Failed to parse OpenAI JSON response: %s\nRaw: %s", exc, raw[:500])
        return None

    top_issues = [str(item) for item in data.get("top_issues", []) if item]
    recommendations = [str(item) for item in data.get("recommendations", []) if item]

    if not top_issues and not recommendations:
        logger.warning("OpenAI returned empty issues and recommendations — falling back to stub")
        return None

    return InsightsPayload(
        sentiment=sentiment,
        top_issues=top_issues,
        recommendations=recommendations,
        sources=sources,
    )
