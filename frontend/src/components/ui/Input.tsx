interface InputProps {
  type?: 'text' | 'email' | 'password';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  isDisabled?: boolean;
}

export default function Input({
  type = 'text',
  placeholder,
  value,
  onChange,
  label,
  error,
  isDisabled = false,
}: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={isDisabled}
        onChange={(e) => onChange(e.target.value)}
        className={[
          'w-full px-4 py-2 rounded-lg border text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500',
          'focus:outline-none focus:ring-2 transition-colors',
          error
            ? 'border-red-300 focus:ring-red-200 dark:border-red-700 dark:focus:ring-red-900'
            : 'border-gray-200 dark:border-gray-700 focus:ring-gray-300 dark:focus:ring-gray-600',
          isDisabled
            ? 'bg-gray-50 dark:bg-gray-800 opacity-60 cursor-not-allowed'
            : 'bg-white dark:bg-gray-900',
        ]
          .filter(Boolean)
          .join(' ')}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
