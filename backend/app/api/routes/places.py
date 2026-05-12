"""
Google Places API routes for restaurant search and details.
"""
import logging
from fastapi import APIRouter, HTTPException, Query
from app.services.google_places_service import GooglePlacesService
from app.schemas import PlaceAutocompleteResponse, PlaceDetailsResponse, PlaceAutocompletePrediction

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/places", tags=["places"])


@router.get("/autocomplete", response_model=PlaceAutocompleteResponse)
def autocomplete_places(
    input: str = Query(..., min_length=1, description="Search query (e.g., 'Pizza Hut Sydney')"),
    types: str = Query("establishment", description="Place type filter (establishment includes all food businesses)")
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
        logger.error(f"Configuration error: {e}")
        raise HTTPException(status_code=500, detail="Google API key not configured")
    except Exception as e:
        logger.error(f"Autocomplete error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch autocomplete suggestions: {str(e)}")


@router.get("/details", response_model=PlaceDetailsResponse)
def place_details(
    place_id: str = Query(..., min_length=1, description="Google Place ID")
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
        logger.error(f"Configuration error: {e}")
        raise HTTPException(status_code=500, detail="Google API key not configured")
    except Exception as e:
        logger.error(f"Place details error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch place details: {str(e)}")
