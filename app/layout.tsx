import AppChrome from '@/components/AppChrome';
import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-background text-gray-100 antialiased selection:bg-[#cbb88a] selection:text-black">
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
