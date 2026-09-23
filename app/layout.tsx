import AppChrome from '@/components/AppChrome';
import type { Metadata } from 'next';
import './globals.css';
import './hospitality.css';

export const metadata: Metadata = {
  title: "ARS | Experience the Night",
  description: "Discover exceptional nightlife, book securely, and enter with an instant digital ARS pass.",
  keywords: ["ARS", "Nightlife Events", "Event Tickets", "Digital Event Passes", "Club Events"],
  openGraph: { title: "ARS | Experience the Night", description: "Discover the best events, venues and nights worth remembering.", type: "website" },
  twitter: { card: "summary", title: "ARS | Experience the Night", description: "Discover the best events, venues and nights worth remembering." },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Browser extensions can inject root theme attributes before React hydrates.
    // Suppress only this element's mismatch; application children remain checked.
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-background text-gray-100 antialiased selection:bg-[#cbb88a] selection:text-black">
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
