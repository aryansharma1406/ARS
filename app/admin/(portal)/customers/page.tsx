'use client';

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
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
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
  };

  return (
    <div className="space-y-6">
      
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-accent-cyan" /> Customer Directory & CRM
        </h2>
        <p className="text-xs text-gray-400">View registered partygoers, attendance history, and lifetime ticket value.</p>
      </div>

      <div className="glass-panel rounded-3xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-surface/80 text-gray-400 uppercase text-[10px] font-bold border-b border-border">
              <tr>
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Contact Phone</th>
                <th className="px-6 py-4">Email Address</th>
                <th className="px-6 py-4">Passes Purchased</th>
                <th className="px-6 py-4 text-right">Lifetime Spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {customers.map((c) => (
                <tr key={c.email} className="hover:bg-surface/40 transition-colors">
                  <td className="px-6 py-4 font-bold text-white text-sm">
                    {c.name}
                  </td>

                  <td className="px-6 py-4 font-mono text-gray-300">
                    {c.phone}
                  </td>

                  <td className="px-6 py-4 text-accent-cyan">
                    {c.email}
                  </td>

                  <td className="px-6 py-4 font-semibold text-white">
                    {c.ticketsCount} Pass(es)
                  </td>

                  <td className="px-6 py-4 text-right font-black text-sm text-accent-pink">
                    {formatINR(c.totalSpend)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
