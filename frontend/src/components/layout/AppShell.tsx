import Navbar from './Navbar';

interface AppShellProps {
  children: React.ReactNode;
  /** Override the default main element classes (max-w, padding, etc.) */
  mainClassName?: string;
}

export default function AppShell({ children, mainClassName }: AppShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--vt-bg)] via-white to-[var(--vt-bg-end)] dark:from-[var(--dk-bg)] dark:via-[var(--dk-via)] dark:to-[var(--dk-bg)] flex flex-col transition-colors">
      <Navbar />
      <main className={mainClassName ?? 'flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8'}>
        {children}
      </main>
    </div>
  );
}
