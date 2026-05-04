import Navbar from './Navbar';

interface AppShellProps {
  children: React.ReactNode;
  /** Override the default main element classes (max-w, padding, etc.) */
  mainClassName?: string;
}

export default function AppShell({ children, mainClassName }: AppShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30 dark:from-[#0C0C18] dark:via-[#0E0E1A] dark:to-[#0C0C18] flex flex-col transition-colors">
      <Navbar />
      <main className={mainClassName ?? 'flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8'}>
        {children}
      </main>
    </div>
  );
}
