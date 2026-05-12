"""
Google Places API routes for restaurant search and details.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from app.api.dependencies import limiter, verify_api_key
from app.services.google_places_service import GooglePlacesService
from app.schemas import PlaceAutocompleteResponse, PlaceDetailsResponse, PlaceAutocompletePrediction

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/places", tags=["places"])


@router.get("/autocomplete", response_model=PlaceAutocompleteResponse)
@limiter.limit("30/minute")
def autocomplete_places(
    request: Request,
    input: str = Query(..., min_length=1, max_length=200, description="Search query (e.g., 'Pizza Hut Sydney')"),
    types: str = Query("establishment", description="Place type filter (establishment includes all food businesses)"),
    _: None = Depends(verify_api_key),
):
    """
    Search for restaurant suggestions using Google Places Autocomplete.

    Returns a list of place predictions with place_id and description.
    """
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
        raise HTTPException(status_code=500, detail="Google API key not configured")
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
