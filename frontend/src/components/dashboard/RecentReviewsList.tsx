type Platform = 'google' | 'tripadvisor' | 'yelp';
type Sentiment = 'positive' | 'neutral' | 'negative';

interface Review {
  id: string;
  platform: Platform;
  text: string;
  sentiment: Sentiment;
  rating?: number | null;
  date_iso?: string | null;
}

interface RecentReviewsListProps {
  reviews: Review[];
}

const platformColors: Record<Platform, string> = {
  google: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
  tripadvisor: 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400',
  yelp: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400',
};

const sentimentColors: Record<Sentiment, string> = {
  positive: 'bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400',
  neutral: 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-600 dark:text-yellow-400',
  negative: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400',
};

function ReviewItem({ review }: { review: Review }) {
  const formattedDate = review.date_iso
    ? (() => { try { return new Date(review.date_iso!).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return review.date_iso; } })()
    : null;

  return (
    <div className="py-3 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-xs font-medium rounded-md px-2 py-0.5 capitalize ${platformColors[review.platform]}`}>
          {review.platform}
        </span>
        <span className={`text-xs font-medium rounded-md px-2 py-0.5 capitalize ${sentimentColors[review.sentiment]}`}>
          {review.sentiment}
        </span>
        {review.rating != null && (
          <span className="text-xs text-gray-400 dark:text-gray-500">★ {review.rating.toFixed(1)}</span>
        )}
        {formattedDate && (
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{formattedDate}</span>
        )}
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-2">{review.text}</p>
    </div>
  );
}

export default function RecentReviewsList({ reviews }: RecentReviewsListProps) {
  return (
    <div className="bg-white dark:bg-[#13131F] rounded-2xl border border-gray-100 dark:border-[#1E1E2E] shadow-sm p-5">
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Recent reviews</p>
      <div>
        {reviews.map((review) => (
          <ReviewItem key={review.id} review={review} />
        ))}
      </div>
    </div>
  );
}
