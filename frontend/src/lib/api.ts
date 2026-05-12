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
}

export async function analyzeRestaurant(
  name: string,
  location: string,
  placeDetails?: PlaceDetails
): Promise<AnalyzeResponse> {
  const body: any = { name, location };

  // Add place details if available
  if (placeDetails?.place_id) {
    body.google_place_id = placeDetails.place_id;
  }

  const res = await fetch(`${API_BASE}/api/v1/restaurants/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.NEXT_PUBLIC_INTERNAL_API_KEY ?? '',
    },
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

export interface ProgressUpdate {
  stage: 'google' | 'tripadvisor' | 'yelp' | 'insights' | 'complete' | 'error';
  status: 'started' | 'completed' | 'failed' | 'skipped' | 'success';
  message?: string;
  result?: AnalyzeResponse;
}

export async function analyzeRestaurantStream(
  name: string,
  location: string,
  placeDetails?: PlaceDetails,
  onProgress: (update: ProgressUpdate) => void
): Promise<AnalyzeResponse> {
  const body: any = { name, location };

  if (placeDetails?.place_id) {
    body.google_place_id = placeDetails.place_id;
  }

  const res = await fetch(`${API_BASE}/api/v1/restaurants/analyze/stream`, {
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

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('Response body is not readable');
  }

  let finalResult: AnalyzeResponse | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const update = JSON.parse(data) as ProgressUpdate;
            onProgress(update);

            if (update.stage === 'complete' && update.result) {
              finalResult = update.result;
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!finalResult) {
    throw new Error('Analysis completed but no result received');
  }

  return finalResult;
}
