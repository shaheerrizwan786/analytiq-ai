"""
Apify Google Search Scraper-based URL resolver for restaurant platforms.
"""
import logging
from apify_client import ApifyClient

from app.config import get_settings

logger = logging.getLogger(__name__)


def resolve_tripadvisor_url_from_apify_search(
    restaurant_name: str, restaurant_location: str
) -> str | None:
    """
    Use Apify Google Search Scraper to find Tripadvisor URL for a restaurant.

    Args:
        restaurant_name: Name of the restaurant
        restaurant_location: Location/address of the restaurant

    Returns:
        Tripadvisor URL if found, None otherwise
    """
    settings = get_settings()

    if not settings.apify_api_key:
        logger.warning("Apify API key not configured")
        return None

    query = f'site:tripadvisor.com "{restaurant_name}" "{restaurant_location}" restaurant'

    try:
        client = ApifyClient(settings.apify_api_key)

        run_input = {
            "queries": query,
            "maxPagesPerQuery": 1,
            "disableGoogleSearchResults": False,
            "focusOnPaidAds": False,
            "forceExactMatch": False,
            "includeIcons": False,
            "includeUnfilteredResults": False,
            "mobileResults": False,
            "saveHtml": False,
            "saveHtmlToKeyValueStore": False,
            "chatGptSearch": {"enableChatGpt": False},
            "copilotSearch": {"enableCopilot": False},
            "perplexitySearch": {
                "enablePerplexity": False,
                "returnImages": False,
                "returnRelatedQuestions": False
            },
            "maximumLeadsEnrichmentRecords": 0,
            "verifyLeadsEnrichmentEmails": False
        }

        logger.info(f"Running Apify Google Search for Tripadvisor: {query}")
        run = client.actor("apify/google-search-scraper").call(run_input=run_input)

        # Get results from dataset
        items = list(client.dataset(run["defaultDatasetId"]).iterate_items())

        if not items:
            logger.info(f"No Tripadvisor results found for: {restaurant_name}")
            return None

        # Extract organic results
        for item in items:
            organic_results = item.get("organicResults", [])
            for result in organic_results:
                url = result.get("url", "")
                if "tripadvisor.com" in url.lower() and ("Restaurant_Review" in url or "/Restaurant_Review-" in url):
                    logger.info(f"Found Tripadvisor URL: {url}")
                    return url

            # If no specific review page found, return the first tripadvisor.com result
            for result in organic_results:
                url = result.get("url", "")
                if "tripadvisor.com" in url.lower():
                    logger.info(f"Using first Tripadvisor result: {url}")
                    return url

        return None

    except Exception as e:
        logger.error(f"Error searching Tripadvisor URL via Apify: {e}")
        return None


def resolve_yelp_url_from_apify_search(
    restaurant_name: str, restaurant_location: str
) -> str | None:
    """
    Use Apify Google Search Scraper to find Yelp URL for a restaurant.

    Args:
        restaurant_name: Name of the restaurant
        restaurant_location: Location/address of the restaurant

    Returns:
        Yelp URL if found, None otherwise
    """
    settings = get_settings()

    if not settings.apify_api_key:
        logger.warning("Apify API key not configured")
        return None

    query = f'site:yelp.com/biz "{restaurant_name}" "{restaurant_location}"'

    try:
        client = ApifyClient(settings.apify_api_key)

        run_input = {
            "queries": query,
            "maxPagesPerQuery": 1,
            "disableGoogleSearchResults": False,
            "focusOnPaidAds": False,
            "forceExactMatch": False,
            "includeIcons": False,
            "includeUnfilteredResults": False,
            "mobileResults": False,
            "saveHtml": False,
            "saveHtmlToKeyValueStore": False,
            "chatGptSearch": {"enableChatGpt": False},
            "copilotSearch": {"enableCopilot": False},
            "perplexitySearch": {
                "enablePerplexity": False,
                "returnImages": False,
                "returnRelatedQuestions": False
            },
            "maximumLeadsEnrichmentRecords": 0,
            "verifyLeadsEnrichmentEmails": False
        }

        logger.info(f"Running Apify Google Search for Yelp: {query}")
        run = client.actor("apify/google-search-scraper").call(run_input=run_input)

        # Get results from dataset
        items = list(client.dataset(run["defaultDatasetId"]).iterate_items())

        if not items:
            logger.info(f"No Yelp results found for: {restaurant_name}")
            return None

        # Extract organic results
        for item in items:
            organic_results = item.get("organicResults", [])
            for result in organic_results:
                url = result.get("url", "")
                if "yelp.com/biz/" in url.lower() and not url.lower().endswith("/biz"):
                    logger.info(f"Found Yelp URL: {url}")
                    return url

            # If no specific biz page found, return the first yelp.com result
            for result in organic_results:
                url = result.get("url", "")
                if "yelp.com" in url.lower():
                    logger.info(f"Using first Yelp result: {url}")
                    return url

        return None

    except Exception as e:
        logger.error(f"Error searching Yelp URL via Apify: {e}")
        return None
