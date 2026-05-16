"""
Google Places API routes for restaurant search and details.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from app.api.dependencies import limiter, verify_api_key
from app.services.google_places_service import GooglePlacesService
from app.schemas import PlaceAutocompleteResponse, PlaceDetailsResponse, PlaceAutocompletePrediction
from app.services.apify_google_search_resolver import (
    resolve_tripadvisor_url_from_apify_search,
    resolve_yelp_url_from_apify_search,
)
from app.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/places", tags=["places"])

_DEMO_RESTAURANTS = [
    {"place_id": "demo_nobu", "name": "Nobu Melbourne", "address": "Crown Complex, Southbank VIC 3006"},
    {"place_id": "demo_tipo", "name": "Tipo 00", "address": "361 Little Bourke St, Melbourne VIC 3000"},
    {"place_id": "demo_tonka", "name": "Tonka", "address": "2 Docklands Dr, Docklands VIC 3008"},
    {"place_id": "demo_gimlet", "name": "Gimlet at Cavendish House", "address": "33 Russell St, Melbourne VIC 3000"},
    {"place_id": "demo_noodle_kingdom", "name": "Noodle Kingdom Clayton", "address": "Clayton VIC 3168"},
    {"place_id": "demo_ebi", "name": "Ebi Sushi Glen Waverley", "address": "Glen Waverley VIC 3150"},
    {"place_id": "demo_stag", "name": "The Stag Clayton", "address": "Clayton VIC 3168"},
    {"place_id": "demo_chaddy", "name": "Chadstone Food Court", "address": "1341 Dandenong Rd, Malvern East VIC 3145"},
]


def _demo_autocomplete(query: str) -> list[PlaceAutocompletePrediction]:
    q = query.lower()
    matches = [
        r for r in _DEMO_RESTAURANTS
        if q in r["name"].lower() or q in r["address"].lower()
    ] or _DEMO_RESTAURANTS[:5]
    return [
        PlaceAutocompletePrediction(
            place_id=r["place_id"],
            description=f"{r['name']}, {r['address']}",
            structured_formatting={"main_text": r["name"], "secondary_text": r["address"]},
            types=["restaurant", "food", "establishment"],
        )
        for r in matches[:5]
    ]


@router.get("/autocomplete", response_model=PlaceAutocompleteResponse)
@limiter.limit("30/minute")
def autocomplete_places(
    request: Request,
    input: str = Query(..., min_length=1, max_length=200, description="Search query (e.g., 'Pizza Hut Sydney')"),
    types: str = Query("establishment", description="Place type filter"),
    _: None = Depends(verify_api_key),
):
    """
    Search for restaurant suggestions using Google Places Autocomplete.

    Returns a list of place predictions with place_id and description.
    """
    settings = get_settings()
    if not settings.google_api_key:
        return PlaceAutocompleteResponse(predictions=_demo_autocomplete(input))

    try:
        service = GooglePlacesService()
        predictions = service.autocomplete_places(input_text=input, types=types)

        # Transform to schema format
        formatted_predictions = [
            PlaceAutocompletePrediction(
                place_id=p.get('place_id', ''),
                description=p.get('description', ''),
                structured_formatting=p.get('structured_formatting'),
                types=p.get('types', [])
            )
            for p in predictions
        ]

        return PlaceAutocompleteResponse(predictions=formatted_predictions)

    except ValueError as e:
        logger.error("Configuration error in autocomplete", extra={"error": type(e).__name__})
        return PlaceAutocompleteResponse(predictions=_demo_autocomplete(input))
    except Exception as e:
        logger.error("Autocomplete request failed", extra={"error": type(e).__name__})
        raise HTTPException(status_code=500, detail="Failed to fetch autocomplete suggestions")


@router.get("/details", response_model=PlaceDetailsResponse)
@limiter.limit("30/minute")
def place_details(
    request: Request,
    place_id: str = Query(..., min_length=1, max_length=200, description="Google Place ID"),
    _: None = Depends(verify_api_key),
):
    """
    Get detailed information about a specific place.

    Returns place details including name, address, coordinates, rating, URL, etc.
    """
    settings = get_settings()
    if not settings.google_api_key:
        demo = next((r for r in _DEMO_RESTAURANTS if r["place_id"] == place_id), None)
        if demo:
            return PlaceDetailsResponse(
                place_id=demo["place_id"],
                name=demo["name"],
                address=demo["address"],
                coordinates={"lat": -37.8136, "lng": 144.9631},
                rating=4.2,
                google_maps_url=f"https://www.google.com/maps/search/?api=1&query={demo['name'].replace(' ', '+')}",
            )
        raise HTTPException(status_code=404, detail="Place not found")

    try:
        service = GooglePlacesService()
        details = service.get_place_details(place_id=place_id)

        # Transform to schema format
        return PlaceDetailsResponse(**details)

    except ValueError as e:
        logger.error("Configuration error in place details", extra={"error": type(e).__name__})
        raise HTTPException(status_code=500, detail="Google API key not configured")
    except Exception as e:
        logger.error("Place details request failed", extra={"error": type(e).__name__})
        raise HTTPException(status_code=500, detail="Failed to fetch place details")


@router.get("/resolve-urls")
@limiter.limit("30/minute")
def resolve_platform_urls(
    request: Request,
    place_id: str = Query(..., min_length=1, max_length=200, description="Google Place ID from autocomplete"),
    _: None = Depends(verify_api_key),
):
    """
    Resolve Tripadvisor and Yelp URLs for a restaurant using Google Place ID.
    """
    settings = get_settings()
    result = {
        "tripadvisor_url": None,
        "yelp_url": None,
        "errors": []
    }

    try:
        service = GooglePlacesService()
        place_details = service.get_place_details(place_id=place_id)

        name = place_details.get('name', '')
        address = place_details.get('address', '')

        if not name:
            result["errors"].append("Could not retrieve restaurant name from Google Places")
            return result

        location = address.split(',')[-2].strip() if ',' in address else address

        logger.info("Resolving URLs for: %s at %s", name, location)

        try:
            tripadvisor_url = resolve_tripadvisor_url_from_apify_search(name, location)
            if tripadvisor_url:
                result["tripadvisor_url"] = tripadvisor_url
        except Exception as e:
            logger.error("TripAdvisor search failed", extra={"error": type(e).__name__})
            result["errors"].append(f"tripadvisor: resolution failed")

        try:
            yelp_url = resolve_yelp_url_from_apify_search(name, location)
            if yelp_url:
                result["yelp_url"] = yelp_url
        except Exception as e:
            logger.error("Yelp search failed", extra={"error": type(e).__name__})
            result["errors"].append(f"yelp: resolution failed")

    except Exception as e:
        logger.error("Error resolving platform URLs", extra={"error": type(e).__name__})
        result["errors"].append("general: resolution failed")

    return result
