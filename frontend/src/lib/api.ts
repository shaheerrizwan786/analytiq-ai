const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export interface ReviewItem {
  id: string;
  source: string;
  text: string;
  rating: number | null;
  date_iso: string | null;
}

export interface AnalyzeResponse {
  job_id: string;
  status: string;
  restaurant_name: string;
  restaurant_location: string;
  insights: {
    sentiment: { positive: number; neutral: number; negative: number };
    top_issues: string[];
    recommendations: string[];
    strengths: string[];
    sources: { google: number; yelp: number; tripadvisor: number };
  };
  reviews: ReviewItem[];
  new_reviews_count: number;
}

export interface PlaceDetails {
  place_id?: string;
  url?: string;
  formatted_address?: string;
  latitude?: number;
  longitude?: number;
}

export async function analyzeRestaurant(
  name: string,
  location: string,
  placeDetails?: PlaceDetails
): Promise<AnalyzeResponse> {
  const body: any = { name, location };

  // Add place details if available
  if (placeDetails) {
    if (placeDetails.place_id) body.google_place_id = placeDetails.place_id;
    if (placeDetails.url) body.google_place_url = placeDetails.url;
    if (placeDetails.formatted_address) body.address = placeDetails.formatted_address;
    if (placeDetails.latitude) body.latitude = placeDetails.latitude;
    if (placeDetails.longitude) body.longitude = placeDetails.longitude;
  }

  const res = await fetch(`${API_BASE}/api/v1/restaurants/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = text || `Request failed (${res.status})`;
    try {
      const json = JSON.parse(text);
      if (json?.detail) message = json.detail;
    } catch { /* not JSON, use raw text */ }
    throw new Error(message);
  }
  return res.json();
}
