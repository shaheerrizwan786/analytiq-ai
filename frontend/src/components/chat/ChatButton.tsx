'use client';

interface ChatButtonProps {
  onClick: () => void;
  unread?: number;
}

export default function ChatButton({ onClick, unread = 0 }: ChatButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Open AI Advisor"
      className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-2)] active:scale-95 fab-cta-shadow flex items-center justify-center transition-all duration-200 group"
    >
      {/* Chat icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="group-hover:scale-110 transition-transform"
        aria-hidden="true"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>

      {/* Unread badge */}
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--accent-3)] text-[10px] font-bold text-white flex items-center justify-center">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}
