'use client';

import { EmptyState, PageLoading } from '@/components/PageState';

import { getOrders } from '@/lib/store';
import { formatINR } from '@/lib/utils';
import { Users } from 'lucide-react';
import { useEffect,useState } from 'react';

interface CustomerRecord {
  name: string;
  email: string;
  phone: string;
  ticketsCount: number;
  totalSpend: number;
  lastEvent: string;
}

export default function AdminCustomersPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    setLoadError('');
    try {
    const orders = await getOrders();

    const customerMap: Record<string, CustomerRecord> = {};

    for (const ord of orders) {
      const email = ord.customer_email.toLowerCase();
      if (!customerMap[email]) {
        customerMap[email] = {
          name: ord.customer_name,
          email: ord.customer_email,
          phone: ord.customer_phone,
          ticketsCount: 0,
          totalSpend: 0,
          lastEvent: 'Club Xtreme Event',
        };
      }
      customerMap[email].ticketsCount += ord.quantity;
      customerMap[email].totalSpend += ord.subtotal;
    }

    setCustomers(Object.values(customerMap));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load records.');
    } finally { setLoading(false); }
  };

  if (loading) return <PageLoading/>;

  return (
    <div className="space-y-6">
      {loadError ? <div role="alert" className="border-l-2 border-red-400 bg-red-950/20 p-5 text-sm text-red-200"><p>{loadError}</p><button className="ars-button ars-button-secondary mt-4" onClick={() => void loadCustomers()}>Retry loading</button></div> : !customers.length && <EmptyState title="No customers to display" copy="Records matching this view will appear here when available."/>}
      <div>
        <h2 className="text-2xl font-black uppercase text-white flex items-center gap-2"><Users className="w-5 h-5 text-accent-cyan" /> Customer directory & CRM</h2>
        <p className="text-xs text-zinc-400">View registered partygoers, attendance history, and lifetime ticket value.</p>
      </div>

      <div className="ars-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-black/30 text-zinc-500 uppercase text-[10px] font-black border-b border-white/10">
              <tr>
                <th className="px-6 py-4">Customer name</th>
                <th className="px-6 py-4">Contact phone</th>
                <th className="px-6 py-4">Email address</th>
                <th className="px-6 py-4">Passes purchased</th>
                <th className="px-6 py-4 text-right">Lifetime spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {customers.map((c) => (
                <tr key={c.email} className="hover:bg-black/40 transition-colors">
                  <td className="px-6 py-4 font-black text-white">{c.name}</td>
                  <td className="px-6 py-4 font-mono text-zinc-400">{c.phone}</td>
                  <td className="px-6 py-4 text-accent-cyan">{c.email}</td>
                  <td className="px-6 py-4 font-black text-white">{c.ticketsCount} Pass(es)</td>
                  <td className="px-6 py-4 text-right font-black text-accent-pink">{formatINR(c.totalSpend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
