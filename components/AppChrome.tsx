'use client';

import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import { usePathname } from 'next/navigation';

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOperations = pathname.startsWith('/admin') || pathname.startsWith('/staff') || pathname.startsWith('/owner');

  return (
    <>
      {!isOperations && <Navbar />}
      <main className="flex-1">{children}</main>
      {!isOperations && <Footer />}
    </>
  );
}
