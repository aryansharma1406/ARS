'use client';

import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import { usePathname } from 'next/navigation';

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOperations = pathname.startsWith('/admin') || pathname.startsWith('/staff') || pathname.startsWith('/owner');

  return (
    <div className={isOperations ? 'flex min-h-screen flex-col' : 'hospitality flex min-h-screen flex-col'}>
      {!isOperations && <a href="#ars-main-content" className="hospitality-skip">Skip to content</a>}
      {!isOperations && <Navbar />}
      <main id="ars-main-content" tabIndex={-1} className="flex-1">{children}</main>
      {!isOperations && <Footer />}
    </div>
  );
}
