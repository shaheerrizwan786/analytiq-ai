"""
Google Places API routes for restaurant search and details.
"""
import logging
from fastapi import APIRouter, HTTPException, Query
from app.services.google_places_service import GooglePlacesService
from app.schemas import PlaceAutocompleteResponse, PlaceDetailsResponse, PlaceAutocompletePrediction
from app.services.apify_google_search_resolver import (
    resolve_tripadvisor_url_from_apify_search,
    resolve_yelp_url_from_apify_search,
)
from app.config import get_settings

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


@router.get("/resolve-urls")
def resolve_platform_urls(
    place_id: str = Query(..., min_length=1, description="Google Place ID from autocomplete")
):
    """
    Resolve Tripadvisor and Yelp URLs for a restaurant using Google Place ID.

    Returns the specific URLs for the restaurant on both platforms.
    """
    settings = get_settings()
    result = {
        "tripadvisor_url": None,
        "yelp_url": None,
        "errors": []
    }

    try:
        # Get place details from Google Places API
        service = GooglePlacesService()
        place_details = service.get_place_details(place_id=place_id)

        name = place_details.get('name', '')
        address = place_details.get('address', '')

        if not name:
            result["errors"].append("Could not retrieve restaurant name from Google Places")
            return result

        # Extract city/location from address
        location = address.split(',')[-2].strip() if ',' in address else address

        logger.info(f"Resolving URLs for: {name} at {location}")

        # Resolve TripAdvisor URL using Apify Google Search
        try:
            tripadvisor_url = resolve_tripadvisor_url_from_apify_search(name, location)
            if tripadvisor_url:
                result["tripadvisor_url"] = tripadvisor_url
                logger.info(f"Found TripAdvisor URL: {tripadvisor_url}")
            else:
                result["errors"].append("tripadvisor: no matching place found")
        except Exception as e:
            logger.error(f"TripAdvisor search failed: {e}")
            result["errors"].append(f"tripadvisor: {str(e)}")

        # Resolve Yelp URL using Apify Google Search
        try:
            yelp_url = resolve_yelp_url_from_apify_search(name, location)
            if yelp_url:
                result["yelp_url"] = yelp_url
                logger.info(f"Found Yelp URL: {yelp_url}")
            else:
                result["errors"].append("yelp: no matching business found")
        except Exception as e:
            logger.error(f"Yelp search failed: {e}")
            result["errors"].append(f"yelp: {str(e)}")

    except Exception as e:
        logger.error(f"Error resolving platform URLs: {e}")
        result["errors"].append(f"general: {str(e)}")

    return result
