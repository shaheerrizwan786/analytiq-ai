"""
Google Places API service for restaurant search and details retrieval.
"""
import logging
from typing import List, Dict, Optional
import googlemaps
from apify_client import ApifyClient

from app.services.apify_runner import call_actor_sync
from app.config import get_settings

logger = logging.getLogger(__name__)


class GooglePlacesService:
    """Service for interacting with Google Places API."""

    def __init__(self):
        settings = get_settings()
        if not settings.google_api_key:
            raise ValueError("GOOGLE_API_KEY is not configured")
        self.client = googlemaps.Client(key=settings.google_api_key)
        self.apify_client = ApifyClient(settings.apify_api_key) if settings.apify_api_key else None
        self.settings = settings

    _FOOD_TYPES = {
        "restaurant",
        "food",
        "cafe",
        "bar",
        "bakery",
        "meal_takeaway",
        "meal_delivery",
        "night_club",
        "coffee_shop",
        "pub",
        "ice_cream_shop",
        "sandwich_shop",
    }

    def autocomplete_place_predictions(
        self,
        input_text: str,
        types: str = "establishment",
        components: Optional[Dict[str, List[str]]] = None,
        *,
        food_only: bool = True,
    ) -> List[Dict]:
        """Raw Places Autocomplete call; optionally keep only food/dining establishments."""
        try:
            if components is None:
                components = {"country": ["au"]}

            result = self.client.places_autocomplete(
                input_text=input_text,
                types=types,
                components=components,
            )

            if food_only:
                filtered = [
                    p
                    for p in result
                    if self._FOOD_TYPES.intersection(p.get("types", []))
                ]
                logger.info(
                    "Autocomplete: %s total, %s food places for '%s'",
                    len(result),
                    len(filtered),
                    input_text,
                )
                return filtered

            logger.info(
                "Autocomplete (unfiltered): %s predictions for '%s'", len(result), input_text
            )
            return list(result)

        except Exception as e:
            logger.error("Autocomplete API error: %s", e)
            raise

    def autocomplete_places(
        self,
        input_text: str,
        types: str = "establishment",
        components: Optional[Dict[str, List[str]]] = None,
    ) -> List[Dict]:
        """
        Search for restaurant suggestions using Google Places Autocomplete.

        Args:
            input_text: Search query (e.g., "Pizza Hut Sydney")
            types: Place type filter (establishment = all businesses)
            components: Country restrictions (e.g., {'country': ['au']})

        Returns:
            List of place predictions (food/dining first; broader fallback if none).
        """
        preds = self.autocomplete_place_predictions(
            input_text, types=types, components=components, food_only=True
        )
        if not preds:
            preds = self.autocomplete_place_predictions(
                input_text, types=types, components=components, food_only=False
            )
        return preds

    def resolve_first_place_id_for_restaurant(
        self,
        *,
        restaurant_name: str,
        restaurant_location: str,
    ) -> Optional[str]:
        """
        Use Places Autocomplete and return place_id from the **first** prediction.

        Prefer food-type matches; if that yields nothing, use the first unfiltered suggestion.
        """
        q = f"{restaurant_name.strip()}, {restaurant_location.strip()}".strip(" ,")
        if not q:
            return None

        preds = self.autocomplete_place_predictions(q, food_only=True)
        if not preds:
            preds = self.autocomplete_place_predictions(q, food_only=False)
        if not preds:
            return None

        pid = preds[0].get("place_id")
        if isinstance(pid, str) and pid.strip():
            return pid.strip()
        return None

    def get_place_details(self, place_id: str) -> Dict:
        """
        Get detailed information about a specific place using Apify.

        Args:
            place_id: Google Place ID

        Returns:
            Place details including name, address, coordinates, rating, URL, etc.
        """
        try:
            # Use Apify to get detailed place information
            if self.apify_client:
                run_input = {
                    "searchStringsArray": [],
                    "placeIds": [place_id],
                    "maxCrawledPlacesPerSearch": 1,
                    "language": "en",
                    "maxReviews": 0,  # We don't need reviews here
                }

                items: list = []
                run = call_actor_sync(
                    self.apify_client,
                    self.settings.apify_google_actor_id,
                    settings=self.settings,
                    profile="google_places_crawl",
                    run_input=run_input,
                    wait_secs=30,
                )

                if run and run.get("defaultDatasetId"):
                    dataset_id = run["defaultDatasetId"]
                    items = list(self.apify_client.dataset(dataset_id).iterate_items())

                if items:
                    place = items[0]

                    # Extract coordinates
                    location = place.get('location', {})

                    details = {
                        'place_id': place.get('placeId') or place_id,
                        'name': place.get('title') or place.get('name'),
                        'address': place.get('address'),
                        'coordinates': {
                            'lat': location.get('lat'),
                            'lng': location.get('lng')
                        } if location else None,
                        'rating': place.get('totalScore'),
                        'total_ratings': place.get('reviewsCount'),
                        'google_maps_url': place.get('url'),
                        'website': place.get('website'),
                        'phone': place.get('phone'),
                        'price_level': place.get('priceLevel'),
                        'types': place.get('categoryName', '').split(',') if place.get('categoryName') else [],
                        'opening_hours': []
                    }

                    logger.info(f"Retrieved details via Apify for place_id: {place_id}")
                    return details

            # Fallback to Google Places API if Apify is not available
            logger.warning("Apify not available, falling back to Google Places API")
            fields = [
                'place_id',
                'name',
                'formatted_address',
                'geometry',
                'rating',
                'user_ratings_total',
                'url',
                'website',
                'formatted_phone_number',
                'opening_hours',
                'price_level',
                'types'
            ]

            result = self.client.place(
                place_id=place_id,
                fields=fields
            )

            place = result.get('result', {})

            # Extract coordinates
            geometry = place.get('geometry', {})
            location = geometry.get('location', {})

            # Build structured response
            details = {
                'place_id': place.get('place_id'),
                'name': place.get('name'),
                'address': place.get('formatted_address'),
                'coordinates': {
                    'lat': location.get('lat'),
                    'lng': location.get('lng')
                } if location else None,
                'rating': place.get('rating'),
                'total_ratings': place.get('user_ratings_total'),
                'google_maps_url': place.get('url'),
                'website': place.get('website'),
                'phone': place.get('formatted_phone_number'),
                'price_level': place.get('price_level'),
                'types': place.get('types', []),
                'opening_hours': place.get('opening_hours', {}).get('weekday_text', [])
            }

            logger.info(f"Retrieved details via Google API for place_id: {place_id}")
            return details

        except Exception as e:
            logger.error(f"Place Details error for {place_id}: {e}")
            raise

    def search_nearby(
        self,
        location: tuple,
        radius: int = 1000,
        keyword: Optional[str] = None,
        name: Optional[str] = None
    ) -> List[Dict]:
        """
        Search for nearby restaurants using coordinates.

        Args:
            location: (latitude, longitude) tuple
            radius: Search radius in meters (default: 1000)
            keyword: Search keyword
            name: Restaurant name to match

        Returns:
            List of nearby places
        """
        try:
            result = self.client.places_nearby(
                location=location,
                radius=radius,
                type='restaurant',
                keyword=keyword,
                name=name
            )

            places = result.get('results', [])
            logger.info(f"Nearby search found {len(places)} results")
            return places

        except Exception as e:
            logger.error(f"Nearby search error: {e}")
            raise
