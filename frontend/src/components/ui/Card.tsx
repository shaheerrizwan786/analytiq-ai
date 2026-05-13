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
        'bg-white dark:bg-[var(--dk-card)] border border-gray-100 dark:border-[var(--dk-border)] rounded-2xl shadow-sm dark:shadow-[#9B2335]/10',
        paddingStyles[padding],
        onClick
          ? 'cursor-pointer hover:shadow-lg hover:shadow-orange-100 dark:hover:shadow-[#9B2335]/20 hover:scale-[1.01] transition-all duration-200'
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
