import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: "NoxPass | Goa Nightlife & Club Event Passes",
  description: "Book VIP entry tickets for Club Xtreme Tito's Lane Goa and top nightclubs. Instant digital QR passes, direct promoter attribution, and secure door check-ins.",
  keywords: ["Club Xtreme Goa", "Tito's Lane Goa", "Goa Nightlife Tickets", "Nightclub Entry Passes", "Techno Rave Goa"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-background text-gray-100 antialiased selection:bg-accent-purple selection:text-white">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
