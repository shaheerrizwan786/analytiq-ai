export const mockData = {
  restaurantName: 'Nobu Melbourne',
  location: 'Melbourne, VIC',
  totalReviews: 284,
  sentiment: {
    positive: 0.6,
    neutral: 0.2,
    negative: 0.2,
  },
  topIssue: {
    title: 'Slow service during peak hours',
    reviewCount: 87,
    recommendedAction: 'Implement pre-shift prep checklists and assign a dedicated floor manager during Friday–Saturday dinner service.',
    expectedImpacts: [
      'Reduce average wait time by ~12 minutes',
      'Estimated 0.3 star rating improvement',
      'Lower staff stress during rush periods',
    ],
  },
  issues: [
    { id: '1', text: 'Slow service during peak hours', category: 'Operations', impactLabel: 'High impact', impactLevel: 'high' as const },
    { id: '2', text: 'Prices feel high for portion sizes', category: 'Pricing', impactLabel: 'Medium impact', impactLevel: 'medium' as const },
    { id: '3', text: 'Long wait times without reservations', category: 'Operations', impactLabel: 'High impact', impactLevel: 'high' as const },
    { id: '4', text: 'Inconsistent food quality across visits', category: 'Food Quality', impactLabel: 'High impact', impactLevel: 'high' as const },
    { id: '5', text: 'Limited vegetarian menu options', category: 'Menu', impactLabel: 'Low impact', impactLevel: 'low' as const },
  ],
  recommendations: [
    {
      id: '1',
      action: 'Introduce a peak-hour floor manager role',
      why: '87 reviews cite slow service on weekends — a dedicated coordinator reduces bottlenecks.',
      impact: 'Estimated 0.3 star increase in service rating',
      tags: ['High Impact', 'Operational'],
    },
    {
      id: '2',
      action: 'Add a mid-tier price point menu section',
      why: 'Price-to-portion complaints appear in 61 reviews. A value set-menu option can retain cost-conscious customers.',
      impact: 'Reduce churn from budget-sensitive diners',
      tags: ['Quick Win', 'Revenue'],
    },
    {
      id: '3',
      action: 'Launch an online reservation system',
      why: 'Walk-in wait complaints are the 3rd most common issue. A simple booking page reduces friction.',
      impact: 'Better table utilisation and customer satisfaction',
      tags: ['Quick Win', 'Operations'],
    },
  ],
  reviews: [
    { id: '1', platform: 'google' as const, text: 'Food was incredible but the wait for a table on Saturday was nearly 40 minutes. Worth it, but frustrating.', sentiment: 'neutral' as const },
    { id: '2', platform: 'tripadvisor' as const, text: 'Best omakase experience in Melbourne. Staff were attentive and the atmosphere was perfect.', sentiment: 'positive' as const },
    { id: '3', platform: 'yelp' as const, text: 'Overpriced for the portion sizes. The black cod was great but everything else felt like a $40 dish for $90.', sentiment: 'negative' as const },
    { id: '4', platform: 'google' as const, text: 'Went on a Tuesday night and it was seamless. No wait, lovely service, and the wagyu was outstanding.', sentiment: 'positive' as const },
    { id: '5', platform: 'tripadvisor' as const, text: 'Service was patchy — our entrees came out 25 minutes after we ordered. Manager did apologise though.', sentiment: 'negative' as const },
  ],
  confidence: {
    level: 'High' as const,
    percentage: 82,
    note: 'Based on 284 reviews across Google, TripAdvisor, and Yelp. Analysis reflects data from the past 90 days.',
  },
};

export type MockData = typeof mockData;
