interface DashboardHeaderProps {
  restaurantName: string;
  location: string;
  totalReviews: number;
}

export default function DashboardHeader({ restaurantName, location, totalReviews }: DashboardHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-semibold bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] dark:from-[var(--accent-2)] dark:to-[var(--accent-3)] bg-clip-text text-transparent">
          {restaurantName}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{location}</p>
      </div>
      <div className="text-right">
        <p className="text-2xl font-semibold text-orange-500 dark:text-orange-400">{totalReviews.toLocaleString()}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">reviews analysed</p>
      </div>
    </div>
  );
}
