'use client';

import React, { useState, useEffect } from 'react';
import { Ticket, Order } from '@/lib/types';
import { getTickets, getOrders } from '@/lib/store';
import { formatINR, downloadCSV } from '@/lib/utils';
import { Download, Search, Ticket as TicketIcon, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadTicketsAndOrders();
  }, []);

  const loadTicketsAndOrders = async () => {
    const tkts = await getTickets();
    const ords = await getOrders();
    setTickets(tkts);
    setOrders(ords);
  };

  const filteredTickets = tickets.filter(t => {
    const q = search.toLowerCase();
    return (
      t.id.toLowerCase().includes(q) ||
      t.customer_name.toLowerCase().includes(q) ||
      t.customer_email.toLowerCase().includes(q) ||
      (t.source_code && t.source_code.toLowerCase().includes(q)) ||
      t.qr_token.toLowerCase().includes(q)
    );
  });

  const handleExportCSV = () => {
    const exportData = filteredTickets.map(t => ({
      'Ticket ID': t.id,
      'Customer Name': t.customer_name,
      'Customer Email': t.customer_email,
      'Customer Phone': t.customer_phone,
      'Event': t.event_name,
      'Venue': t.venue_name,
      'Source Code': t.source_code || 'Direct',
      'QR Token': t.qr_token,
      'Entry Status': t.status,
      'Scanned At': t.scanned_at || 'Not Scanned',
      'Created At': t.created_at,
    }));
    downloadCSV('NoxPass_Ticket_Sales.csv', exportData);
  };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Tickets & Transaction Log</h2>
          <p className="text-xs text-gray-400">View guest passes, QR tokens, payment status, and promoter sources</p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-surface border border-border hover:bg-surface-hover transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4 text-accent-cyan" /> Export Ticket Sales CSV
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter by Ticket ID, Customer, Source (e.g. XYZ-ARYAN)..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-accent-purple"
        />
      </div>

      {/* Table */}
      <div className="glass-panel rounded-3xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-surface/80 text-gray-400 uppercase text-[10px] font-bold border-b border-border">
              <tr>
                <th className="px-6 py-4">Ticket Pass</th>
                <th className="px-6 py-4">Customer Details</th>
                <th className="px-6 py-4">Event & Venue</th>
                <th className="px-6 py-4">Source Code</th>
                <th className="px-6 py-4">Door Status</th>
                <th className="px-6 py-4 text-right">Pass View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredTickets.map((t) => (
                <tr key={t.id} className="hover:bg-surface/40 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-white">
                    <span className="block text-accent-cyan">{t.qr_token}</span>
                    <span className="text-[10px] text-gray-500 font-normal">ID: {t.id}</span>
                  </td>

                  <td className="px-6 py-4">
                    <strong className="text-white block">{t.customer_name}</strong>
                    <span className="text-[11px] text-gray-400 block">{t.customer_email}</span>
                    <span className="text-[11px] text-gray-500">{t.customer_phone}</span>
                  </td>

                  <td className="px-6 py-4">
                    <strong className="text-white block">{t.event_name}</strong>
                    <span className="text-[11px] text-accent-purple">{t.venue_name}</span>
                  </td>

                  <td className="px-6 py-4">
                    {t.source_code ? (
                      <span className="px-2.5 py-1 rounded bg-accent-pink/20 border border-accent-pink/40 text-accent-pink font-mono font-bold text-[11px]">
                        {t.source_code}
                      </span>
                    ) : (
                      <span className="text-gray-500 italic">Direct Organic</span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                      t.status === 'VALID'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        : t.status === 'USED'
                        ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                        : 'bg-red-950 text-red-300'
                    }`}>
                      {t.status === 'VALID' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                      {t.status === 'USED' && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                      {t.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/ticket/${t.id}`}
                      target="_blank"
                      className="text-xs font-bold text-accent-purple hover:underline"
                    >
                      Open Pass &rarr;
                    </Link>
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
