import type { DashboardData } from '@/components/dashboard/DashboardView';

// ---------------------------------------------------------------------------
// 50 realistic reviews for "The Meridian Kitchen" — fictional venue, Clayton VIC
// Tone: ~65% positive, 20% neutral, 15% negative
// Recurring strengths: food quality, coffee, atmosphere, friendly staff
// Areas to improve: peak-hour wait times, noise, limited parking, occasional
//   wait on busy days
// ---------------------------------------------------------------------------

type ReviewRow = DashboardData['reviews'][number];

const RAW: Omit<ReviewRow, 'id'>[] = [
  // ── Week 1: Apr 1–7 ─────────────────────────────────────────────────────
  {
    platform: 'google',
    text: 'Absolutely love this place. The mushroom risotto is the best I have had in Clayton — rich, creamy and perfectly seasoned. Staff remembered my name on my second visit.',
    rating: 5,
    date_iso: '2026-04-01',
    sentiment: 'positive',
  },
  {
    platform: 'tripadvisor',
    text: 'Great lunch spot near the uni. The toasted sourdough with avocado and poached eggs is flawless. Coffee is seriously good — better than most city cafes.',
    rating: 5,
    date_iso: '2026-04-01',
    sentiment: 'positive',
  },
  {
    platform: 'google',
    text: 'Friendly staff, warm atmosphere, lovely food. Came in on a Wednesday morning and was seated immediately. The flat white was exceptional.',
    rating: 5,
    date_iso: '2026-04-02',
    sentiment: 'positive',
  },
  {
    platform: 'tripadvisor',
    text: 'We had the wagyu burger and the grilled salmon. Both were excellent — fresh, well-presented, and the sides were generous. Will definitely return.',
    rating: 5,
    date_iso: '2026-04-02',
    sentiment: 'positive',
  },
  {
    platform: 'yelp',
    text: 'Food quality is consistently high. I have been three times now and every dish has been well-executed. The dessert menu is underrated.',
    rating: 4,
    date_iso: '2026-04-03',
    sentiment: 'positive',
  },
  {
    platform: 'google',
    text: 'Came on a Friday lunch and waited 25 minutes for a table. Food was good when it arrived but the wait really dampened the experience.',
    rating: 3,
    date_iso: '2026-04-03',
    sentiment: 'neutral',
  },
  {
    platform: 'google',
    text: 'Lovely brunch spot. Eggs benedict were perfectly cooked and the hollandaise was rich without being heavy. The room is bright and airy.',
    rating: 5,
    date_iso: '2026-04-04',
    sentiment: 'positive',
  },
  {
    platform: 'tripadvisor',
    text: 'Decent food but nothing extraordinary. The pasta was a bit underseasoned. Atmosphere is nice though and the team was attentive.',
    rating: 3,
    date_iso: '2026-04-05',
    sentiment: 'neutral',
  },
  {
    platform: 'yelp',
    text: 'The cold brew is incredible. I come here almost every morning before lectures. Honestly the best cafe within 5 km.',
    rating: 5,
    date_iso: '2026-04-05',
    sentiment: 'positive',
  },
  {
    platform: 'google',
    text: 'Parking is an absolute nightmare on weekends. We circled for 20 minutes. The food was great but the stress of getting there killed the mood.',
    rating: 2,
    date_iso: '2026-04-06',
    sentiment: 'negative',
  },
  // ── Week 2: Apr 8–14 ────────────────────────────────────────────────────
  {
    platform: 'google',
    text: 'The Meridian Kitchen never disappoints. Ordered the pumpkin soup and a chicken schnitzel — both were impeccable. Staff are genuinely warm and welcoming.',
    rating: 5,
    date_iso: '2026-04-08',
    sentiment: 'positive',
  },
  {
    platform: 'tripadvisor',
    text: 'One of the friendliest teams I have encountered in any restaurant. The waitstaff were knowledgeable about the menu and gave great recommendations.',
    rating: 5,
    date_iso: '2026-04-08',
    sentiment: 'positive',
  },
  {
    platform: 'yelp',
    text: 'Solid food. Nothing ground-breaking but consistently good. The coffee more than makes up for it — espresso martini at brunch? Yes please.',
    rating: 4,
    date_iso: '2026-04-09',
    sentiment: 'positive',
  },
  {
    platform: 'google',
    text: 'The noise level on Saturday evenings is really quite loud. Hard to have a conversation without raising your voice. Food was lovely though.',
    rating: 3,
    date_iso: '2026-04-10',
    sentiment: 'neutral',
  },
  {
    platform: 'tripadvisor',
    text: 'Beautifully plated dishes and a warm, inviting interior. The baked ricotta with honey and walnuts is a standout. Prices are fair for the quality.',
    rating: 5,
    date_iso: '2026-04-10',
    sentiment: 'positive',
  },
  {
    platform: 'google',
    text: 'Waited over 35 minutes on a Saturday afternoon for our order. Tables around us that arrived after us got their food first. Frustrating experience.',
    rating: 2,
    date_iso: '2026-04-11',
    sentiment: 'negative',
  },
  {
    platform: 'yelp',
    text: 'The grilled chicken salad was fresh and satisfying. Staff checked in multiple times without being intrusive. Really nice atmosphere for a working lunch.',
    rating: 4,
    date_iso: '2026-04-11',
    sentiment: 'positive',
  },
  {
    platform: 'google',
    text: 'Great atmosphere, excellent coffee, lovely food. The only minor gripe is it can get a bit cramped when full. Overall a fantastic local spot.',
    rating: 4,
    date_iso: '2026-04-12',
    sentiment: 'positive',
  },
  {
    platform: 'tripadvisor',
    text: 'Had the slow-cooked lamb shoulder — absolutely stunning. Fell off the bone, incredible sauce. Paired with a glass of Shiraz it was a perfect Saturday dinner.',
    rating: 5,
    date_iso: '2026-04-13',
    sentiment: 'positive',
  },
  {
    platform: 'yelp',
    text: 'Lovely little place. The house-made granola bowl was delicious and the portions are generous. Would be a 5-star if not for the parking situation.',
    rating: 4,
    date_iso: '2026-04-14',
    sentiment: 'positive',
  },
  // ── Week 3: Apr 15–21 ───────────────────────────────────────────────────
  {
    platform: 'google',
    text: 'Brilliant food, brilliant coffee, brilliant team. This is my go-to for any occasion — casual Friday lunch or a special family dinner. Truly outstanding.',
    rating: 5,
    date_iso: '2026-04-15',
    sentiment: 'positive',
  },
  {
    platform: 'tripadvisor',
    text: 'The barista clearly knows their craft. Every coffee I have had here has been excellent. The latte art is a nice touch too.',
    rating: 5,
    date_iso: '2026-04-15',
    sentiment: 'positive',
  },
  {
    platform: 'google',
    text: 'Midweek visit was perfect — quiet, quick service, and the pasta of the day was exceptional. Exactly what I needed after a long day.',
    rating: 5,
    date_iso: '2026-04-16',
    sentiment: 'positive',
  },
  {
    platform: 'yelp',
    text: 'The menu changes seasonally which keeps things interesting. The spring asparagus dish this month is outstanding. Consistent quality across the board.',
    rating: 5,
    date_iso: '2026-04-16',
    sentiment: 'positive',
  },
  {
    platform: 'tripadvisor',
    text: 'Service was slow on Sunday brunch — took 40 minutes for our mains. I understand it was busy but some communication from staff would have helped.',
    rating: 2,
    date_iso: '2026-04-17',
    sentiment: 'negative',
  },
  {
    platform: 'google',
    text: 'Nice place overall. Menu is creative and the ingredients clearly fresh. Could do with a couple more vegetarian options though.',
    rating: 4,
    date_iso: '2026-04-17',
    sentiment: 'positive',
  },
  {
    platform: 'yelp',
    text: 'The smashed avo toast is elevated beyond the usual. They add dukkah and heirloom tomatoes which makes it genuinely special. A regular order for me.',
    rating: 5,
    date_iso: '2026-04-18',
    sentiment: 'positive',
  },
  {
    platform: 'google',
    text: 'Came for dinner on a Friday. Took a while to be acknowledged at the door and the room was very loud. Once seated though, service was attentive and food was good.',
    rating: 3,
    date_iso: '2026-04-18',
    sentiment: 'neutral',
  },
  {
    platform: 'tripadvisor',
    text: 'Every visit has been a pleasure. The team go out of their way to accommodate dietary needs — my partner is coeliac and they handled it with care and confidence.',
    rating: 5,
    date_iso: '2026-04-19',
    sentiment: 'positive',
  },
  {
    platform: 'google',
    text: 'The sourdough bread is house-made and absolutely delicious. Everything that comes out of the kitchen feels thoughtfully made. Lovely spot.',
    rating: 5,
    date_iso: '2026-04-20',
    sentiment: 'positive',
  },
  {
    platform: 'yelp',
    text: 'Consistently excellent. I have probably eaten here 20+ times and the food quality never dips. The regulars are treated like family.',
    rating: 5,
    date_iso: '2026-04-20',
    sentiment: 'positive',
  },
  {
    platform: 'tripadvisor',
    text: 'Bit loud for a date night. We could barely hear each other. The food was delicious but the acoustics in the dining room need attention.',
    rating: 3,
    date_iso: '2026-04-21',
    sentiment: 'neutral',
  },
  // ── Week 4: Apr 22–28 ───────────────────────────────────────────────────
  {
    platform: 'google',
    text: 'The steak tartare appetiser was exceptional — bold, well-seasoned, and beautifully presented. Mains followed in the same vein. Highly recommend for a special occasion.',
    rating: 5,
    date_iso: '2026-04-22',
    sentiment: 'positive',
  },
  {
    platform: 'yelp',
    text: 'Wonderful atmosphere. The space is warm and well-designed — exposed brick, low lighting, great music at a sensible volume on a weeknight.',
    rating: 5,
    date_iso: '2026-04-22',
    sentiment: 'positive',
  },
  {
    platform: 'tripadvisor',
    text: 'Waited nearly 45 minutes on a Saturday for our food with no update from staff. Eventually had to ask. Not the experience expected given the restaurant\'s reputation.',
    rating: 2,
    date_iso: '2026-04-23',
    sentiment: 'negative',
  },
  {
    platform: 'google',
    text: 'Food is reliably good. The seasonal specials board is worth checking — the duck confit special last week was restaurant-quality at a fair price.',
    rating: 4,
    date_iso: '2026-04-23',
    sentiment: 'positive',
  },
  {
    platform: 'google',
    text: 'Great spot for a relaxed coffee and a read. The team never make you feel rushed even when it is busy. Consistently one of my favourite places in Clayton.',
    rating: 5,
    date_iso: '2026-04-24',
    sentiment: 'positive',
  },
  {
    platform: 'yelp',
    text: 'Lovely breakfast. The corn fritters with smoked salmon were a standout. Friendly service and a nice, unhurried pace on a Tuesday morning.',
    rating: 5,
    date_iso: '2026-04-24',
    sentiment: 'positive',
  },
  {
    platform: 'tripadvisor',
    text: 'The pasta is housemade and you can taste the difference. The cacio e pepe is sublime. Staff are knowledgeable and passionate about the menu.',
    rating: 5,
    date_iso: '2026-04-25',
    sentiment: 'positive',
  },
  {
    platform: 'google',
    text: 'Good food, good coffee, nice vibe. Service can be inconsistent — brilliant one day, slow the next. Overall still worth coming back to.',
    rating: 3,
    date_iso: '2026-04-26',
    sentiment: 'neutral',
  },
  {
    platform: 'yelp',
    text: "The roasted beetroot salad with goat's cheese is a permanent fixture on my order. The kitchen clearly sources quality local produce.",
    rating: 5,
    date_iso: '2026-04-26',
    sentiment: 'positive',
  },
  {
    platform: 'tripadvisor',
    text: 'Not enough parking nearby and no way to book ahead on weekends. Stood outside for 20 minutes on a cold evening before getting a table.',
    rating: 2,
    date_iso: '2026-04-27',
    sentiment: 'negative',
  },
  // ── Final days: Apr 28 – May 2 ──────────────────────────────────────────
  {
    platform: 'google',
    text: 'The short rib main course is something else. Fork-tender, rich jus, beautifully accompanied. This is the dish that keeps me coming back.',
    rating: 5,
    date_iso: '2026-04-28',
    sentiment: 'positive',
  },
  {
    platform: 'google',
    text: 'Quick and friendly service on a Monday morning. The oat milk cappuccino was perfectly made. Exactly the start to the week I needed.',
    rating: 5,
    date_iso: '2026-04-29',
    sentiment: 'positive',
  },
  {
    platform: 'tripadvisor',
    text: 'The Meridian Kitchen is one of those rare places where everything comes together — quality food, warm staff, beautiful space. A genuine gem.',
    rating: 5,
    date_iso: '2026-04-29',
    sentiment: 'positive',
  },
  {
    platform: 'yelp',
    text: 'Saturday brunch was busy and understaffed. Waited 30 min for coffees. When they came they were excellent but that wait is too long.',
    rating: 2,
    date_iso: '2026-04-30',
    sentiment: 'negative',
  },
  {
    platform: 'google',
    text: 'Brought clients here for a working lunch. Quiet mid-week atmosphere, fast and professional service, and the food made a great impression. Will use this as my default client lunch venue.',
    rating: 5,
    date_iso: '2026-04-30',
    sentiment: 'positive',
  },
  {
    platform: 'tripadvisor',
    text: 'The chef clearly has a passion for quality. Seasonal menu, local produce, and flavours that feel considered rather than routine. Very impressive.',
    rating: 5,
    date_iso: '2026-05-01',
    sentiment: 'positive',
  },
  {
    platform: 'yelp',
    text: 'Lovely atmosphere and consistent quality. My only note is that the weekend noise level can be a bit much. Midweek visits are perfect.',
    rating: 4,
    date_iso: '2026-05-01',
    sentiment: 'positive',
  },
  {
    platform: 'google',
    text: 'Outstanding from start to finish. The team are professional, warm, and clearly proud of what they serve. The Meridian Kitchen is everything a local restaurant should be.',
    rating: 5,
    date_iso: '2026-05-02',
    sentiment: 'positive',
  },
];

const demoReviews: ReviewRow[] = RAW.map((r, i) => ({ id: String(i + 1), ...r }));

// Derived sentiment fractions
const pos = demoReviews.filter((r) => r.sentiment === 'positive').length;
const neu = demoReviews.filter((r) => r.sentiment === 'neutral').length;
const neg = demoReviews.filter((r) => r.sentiment === 'negative').length;
const total = demoReviews.length;

export const demoDashboardData: DashboardData = {
  restaurantName: 'The Meridian Kitchen',
  location: 'Clayton, VIC',
  totalReviews: total,
  sentiment: {
    positive: parseFloat((pos / total).toFixed(2)),
    neutral: parseFloat((neu / total).toFixed(2)),
    negative: parseFloat((neg / total).toFixed(2)),
  },
  strengths: [
    {
      id: 's1',
      text: 'Exceptional food quality and presentation',
      category: 'Food Quality',
      impactLabel: 'Core strength',
    },
    {
      id: 's2',
      text: 'Outstanding coffee — consistently praised across all platforms',
      category: 'Beverage',
      impactLabel: 'Differentiator',
    },
    {
      id: 's3',
      text: 'Warm, knowledgeable and genuinely friendly staff',
      category: 'Service',
      impactLabel: 'Retention driver',
    },
    {
      id: 's4',
      text: 'Inviting atmosphere with thoughtful interior design',
      category: 'Ambience',
      impactLabel: 'Repeat visits',
    },
    {
      id: 's5',
      text: 'Seasonal, locally sourced menu that keeps regulars engaged',
      category: 'Menu',
      impactLabel: 'Loyalty driver',
    },
  ],
  topIssue: {
    title: 'Peak-hour wait times affecting weekend satisfaction',
    reviewCount: 8,
    recommendedAction:
      'Add a second floor manager during Saturday/Sunday lunch service and introduce a simple waitlist SMS system so guests can wait comfortably nearby rather than standing at the door.',
    expectedImpacts: [
      'Reduce negative weekend reviews by an estimated 40%',
      'Improve average Saturday rating from 3.1 → 4.0',
      'Reduce front-of-house stress for staff during peak periods',
    ],
  },
  issues: [
    {
      id: '1',
      text: 'Slow service and long food waits during peak weekend periods',
      category: 'Operations',
      impactLabel: 'High impact',
      impactLevel: 'high',
    },
    {
      id: '2',
      text: 'High noise levels on Friday and Saturday evenings',
      category: 'Ambience',
      impactLabel: 'Medium impact',
      impactLevel: 'medium',
    },
    {
      id: '3',
      text: 'Limited nearby parking — especially on weekends',
      category: 'Accessibility',
      impactLabel: 'Medium impact',
      impactLevel: 'medium',
    },
    {
      id: '4',
      text: 'Inconsistent service speed between weekday and weekend visits',
      category: 'Operations',
      impactLabel: 'Medium impact',
      impactLevel: 'medium',
    },
  ],
  recommendations: [
    {
      id: '1',
      action: 'Introduce a weekend waitlist system with SMS notifications',
      why: '8 reviews cite standing outside waiting for a table — a simple digital queue removes this friction point entirely.',
      impact: 'Estimated 0.4 star improvement in weekend Google ratings',
      tags: ['High Impact', 'Quick Win'],
    },
    {
      id: '2',
      action: 'Install acoustic panels or soft furnishings in the main dining room',
      why: '6 reviews specifically mention difficulty having a conversation due to noise. This is a low-cost fix with a high satisfaction payoff.',
      impact: 'Better experience for couples, families and business diners',
      tags: ['Ambience', 'Operational'],
    },
    {
      id: '3',
      action: 'Partner with a nearby carpark or provide a Google Maps pin for parking guidance',
      why: '5 reviews mention parking frustration — a simple addition to the website and Google listing can set expectations and reduce stress.',
      impact: 'Fewer pre-visit complaints, smoother guest arrival',
      tags: ['Quick Win', 'Accessibility'],
    },
  ],
  reviews: demoReviews,
  confidence: {
    level: 'High',
    percentage: 88,
    note: `Based on ${total} reviews across Google, TripAdvisor, and Yelp collected Apr–May 2026.`,
  },
};
