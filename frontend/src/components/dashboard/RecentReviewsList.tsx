type Platform = 'google' | 'tripadvisor' | 'yelp';
type Sentiment = 'positive' | 'neutral' | 'negative';

interface Review {
  id: string;
  platform: Platform;
  text: string;
  sentiment: Sentiment;
}

interface RecentReviewsListProps {
  reviews: Review[];
}

const platformColors: Record<Platform, string> = {
  google: 'bg-blue-50 text-blue-600',
  tripadvisor: 'bg-green-50 text-green-700',
  yelp: 'bg-red-50 text-red-600',
};

const sentimentColors: Record<Sentiment, string> = {
  positive: 'bg-green-50 text-green-600',
  neutral: 'bg-yellow-50 text-yellow-600',
  negative: 'bg-red-50 text-red-600',
};

function ReviewItem({ review }: { review: Review }) {
  return (
    <div className="py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-xs font-medium rounded-md px-2 py-0.5 capitalize ${platformColors[review.platform]}`}>
          {review.platform}
        </span>
        <span className={`text-xs font-medium rounded-md px-2 py-0.5 capitalize ${sentimentColors[review.sentiment]}`}>
          {review.sentiment}
        </span>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">{review.text}</p>
    </div>
  );
}

export default function RecentReviewsList({ reviews }: RecentReviewsListProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Recent reviews</p>
      <div>
        {reviews.map((review) => (
          <ReviewItem key={review.id} review={review} />
        ))}
      </div>
    </div>
  );
}
