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
  google_place_id?: string | null;
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
  stage: 'google' | 'tripadvisor' | 'yelp' | 'insights' | 'complete' | 'error' | 'sync' | 'queued';
  status: 'started' | 'completed' | 'failed' | 'skipped' | 'success';
  message?: string;
  result?: AnalyzeResponse;
}

export async function analyzeRestaurantStream(
  name: string,
  location: string,
  placeDetails: PlaceDetails | undefined,
  onProgress: (update: ProgressUpdate) => void
): Promise<AnalyzeResponse> {
  const body: any = { name, location };

  if (placeDetails?.place_id) {
    body.google_place_id = placeDetails.place_id;
  }

  const res = await fetch(`${API_BASE}/api/v1/restaurants/analyze/stream`, {
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

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('Response body is not readable');
  }

  let finalResult: AnalyzeResponse | null = null;
  let lineBuffer = '';

  const processSseLine = (line: string) => {
    if (!line.startsWith('data: ')) return;
    const data = line.slice(6);
    let update: ProgressUpdate;
    try {
      update = JSON.parse(data) as ProgressUpdate;
    } catch (e) {
      console.error('Failed to parse SSE data:', e);
      return;
    }
    onProgress(update);
    if (update.stage === 'complete' && update.result) {
      finalResult = update.result;
    } else if (update.stage === 'error') {
      throw new Error(update.message || 'Analysis failed');
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      lineBuffer += decoder.decode(value, { stream: true });
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() ?? '';

      for (const line of lines) {
        processSseLine(line);
      }
    }
    if (lineBuffer) {
      processSseLine(lineBuffer);
    }
  } finally {
    reader.releaseLock();
  }

  if (!finalResult) {
    throw new Error('Analysis completed but no result received');
  }

  return finalResult;
}
