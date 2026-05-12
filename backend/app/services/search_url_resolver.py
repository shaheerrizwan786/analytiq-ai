from __future__ import annotations

import re
from difflib import SequenceMatcher
from urllib.parse import parse_qs, unquote, urlparse

import httpx


class SearchUrlResolverError(RuntimeError):
    pass


def _norm_text(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _extract_links_from_html(html: str) -> list[str]:
    # 1) Broad href extraction.
    links = re.findall(r'href=["\']([^"\']+)["\']', html, flags=re.IGNORECASE)

    # 2) DuckDuckGo result anchors often carry class result__a.
    links += re.findall(
        r'<a[^>]*class=["\'][^"\']*result__a[^"\']*["\'][^>]*href=["\']([^"\']+)["\']',
        html,
        flags=re.IGNORECASE,
    )

    out: list[str] = []
    for link in links:
        if not link:
            continue

        # DuckDuckGo redirect links look like /l/?kh=-1&uddg=<encoded_url>
        if "uddg=" in link:
            try:
                q = parse_qs(urlparse(link).query)
                uddg = q.get("uddg", [None])[0]
                if uddg:
                    out.append(unquote(uddg))
                    continue
            except Exception:
                pass

        if link.startswith("http://") or link.startswith("https://"):
            out.append(link)

    # Remove self links and obvious non-result links.
    cleaned: list[str] = []
    seen: set[str] = set()
    for u in out:
        lu = u.lower()
        if "duckduckgo.com" in lu:
            continue
        if u in seen:
            continue
        seen.add(u)
        cleaned.append(u)

    return cleaned


def _search_candidate_urls(query: str, *, timeout_secs: float = 12.0) -> list[str]:
    # Use html.duckduckgo.com directly and allow redirects as fallback.
    url = "https://html.duckduckgo.com/html/"
    try:
        r = httpx.get(
            url,
            params={"q": query},
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            },
            timeout=timeout_secs,
            follow_redirects=True,
        )
        r.raise_for_status()
    except Exception as e:  # noqa: BLE001
        raise SearchUrlResolverError(f"search request failed: {e}") from e

    return _extract_links_from_html(r.text)


def _sanitise_query_input(s: str) -> str:
    """Strip characters that could manipulate a search query string."""
    return re.sub(r"[^A-Za-z0-9 ,'\-\.]", "", s)


def resolve_tripadvisor_url_from_search(restaurant_name: str, restaurant_location: str) -> str | None:
    name = _sanitise_query_input(restaurant_name)
    location = _sanitise_query_input(restaurant_location)
    query = f'site:tripadvisor.com "{name}" "{location}" Restaurant_Review'
    candidates = _search_candidate_urls(query)
    for u in candidates:
        lu = u.lower()
        if "tripadvisor.com" in lu and "restaurant_review" in lu:
            return u
    for u in candidates:
        lu = u.lower()
        if "tripadvisor.com" in lu:
            return u
    return None


def _ratio(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


def _slug_from_yelp_url(url: str) -> str:
    try:
        path = urlparse(url).path
    except Exception:
        return ""
    # /biz/<slug>
    m = re.search(r"/biz/([^/?#]+)", path)
    if not m:
        return ""
    slug = m.group(1).lower().replace("-", " ")
    slug = re.sub(r"\s+\d+$", "", slug).strip()
    return slug


def resolve_yelp_url_from_search(restaurant_name: str, restaurant_location: str) -> str | None:
    # Cancel fallback query: only one strict query.
    name = _sanitise_query_input(restaurant_name)
    location = _sanitise_query_input(restaurant_location)
    query = f'site:yelp.com/biz inurl:/biz/ "{name}" "{location}"'
    candidates = _search_candidate_urls(query)

    target = _norm_text(f"{restaurant_name} {restaurant_location}")

    best_url: str | None = None
    best_score = 0.0
    for u in candidates:
        lu = u.lower()
        if "yelp.com/biz/" not in lu:
            continue
        slug = _norm_text(_slug_from_yelp_url(u))
        if not slug:
            continue
        score = _ratio(target, slug)
        if score > best_score:
            best_score = score
            best_url = u

    # Only accept sufficiently close character similarity.
    if best_url and best_score >= 0.35:
        return best_url
    return None
