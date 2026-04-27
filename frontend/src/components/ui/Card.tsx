type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: CardPadding;
  onClick?: () => void;
}

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export default function Card({
  children,
  className = '',
  padding = 'md',
  onClick,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={[
        'bg-white dark:bg-[#13131F] border border-gray-100 dark:border-[#1E1E2E] rounded-2xl shadow-sm dark:shadow-violet-950/20',
        paddingStyles[padding],
        onClick
          ? 'cursor-pointer hover:shadow-lg hover:shadow-violet-100 dark:hover:shadow-violet-950/30 hover:scale-[1.01] transition-all duration-200'
          : 'transition-shadow duration-200',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
