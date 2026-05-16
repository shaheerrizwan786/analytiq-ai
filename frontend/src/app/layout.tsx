import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from '@/components/layout/ThemeProvider';
import { ModeProvider } from '@/lib/modeContext';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: 'device-width',
  viewportFit: 'cover',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Analytiq AI",
  description: "AI-powered restaurant feedback intelligence platform",
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Inline script: runs synchronously before first paint to avoid FOUC */}
        {/* Inline script: runs synchronously before first paint to avoid FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var v=localStorage.getItem('ui:variant');if(v==='cool'){d.setAttribute('data-vt','cool');var t=localStorage.getItem('ui:theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){d.classList.add('dark');}else{d.classList.remove('dark');}}else{d.removeAttribute('data-vt');d.classList.remove('dark');}var f=localStorage.getItem('a11y:font');if(f==='large')d.setAttribute('data-font','large');var c=localStorage.getItem('a11y:contrast');if(c==='true')d.setAttribute('data-contrast','high');var m=localStorage.getItem('a11y:motion');if(m==='true')d.setAttribute('data-motion','reduced');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider>
          <ModeProvider>{children}</ModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
