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
          'w-full px-4 py-2 rounded-lg border text-sm text-gray-900 placeholder-gray-400',
          'focus:outline-none focus:ring-2 transition-colors',
          error
            ? 'border-red-300 focus:ring-red-200'
            : 'border-gray-200 focus:ring-gray-300',
          isDisabled ? 'bg-gray-50 opacity-60 cursor-not-allowed' : 'bg-white',
        ]
          .filter(Boolean)
          .join(' ')}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
