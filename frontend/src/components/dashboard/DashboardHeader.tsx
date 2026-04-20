interface DashboardHeaderProps {
  restaurantName: string;
  location: string;
  totalReviews: number;
}

export default function DashboardHeader({ restaurantName, location, totalReviews }: DashboardHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{restaurantName}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{location}</p>
      </div>
      <div className="text-right">
        <p className="text-2xl font-semibold text-gray-900">{totalReviews.toLocaleString()}</p>
        <p className="text-sm text-gray-500 mt-0.5">reviews analysed</p>
      </div>
    </div>
  );
}
