'use client';

import { Ticket,VenueStaffAssignment } from '@/lib/types';
import {
AlertTriangle,
Camera,
CheckCircle2,
Clock,
LogOut,
QrCode,
Search,
XCircle
} from 'lucide-react';
import { useState } from 'react';


export default function StaffScanner({ assignments }: { assignments: (VenueStaffAssignment & { venues: {name:string} })[] }) {
  const [assignmentId, setAssignmentId] = useState(assignments[0]?.id || '');
  const selectedVenue = assignments.find(a=>a.id===assignmentId)?.venues.name || '';
  const [inputToken, setInputToken] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResponse, setScanResponse] = useState<{
    result: 'VALID' | 'ALREADY_USED' | 'INVALID' | null;
    ticket?: Ticket;
    message?: string;
  }>({ result: null });

  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalScanned: 0, validToday: 0 });

  const handleScanSubmit = async (tokenToTest?: string) => {
    const token = tokenToTest || inputToken;
    if (!token) return;

    setIsProcessing(true);
    setScanResponse({ result: null });

    try {
      const res = await fetch('/api/staff/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrToken: token,
          assignmentId,
        }),
      });

      const data = await res.json();
      if (data.result && (res.ok || res.status === 409)) {
        setScanResponse({
          result: data.result,
          ticket: data.ticket,
          message: data.message,
        });

        // Update local scan feed
        if (data.ticket) {
          setScanHistory(prev => [
            {
              id: `scan-${Date.now()}`,
              token,
              result: data.result,
              customer_name: data.ticket.customer_name,
              event_name: data.ticket.event_name,
              time: new Date().toLocaleTimeString(),
            },
            ...prev,
          ]);

          if (data.result === 'VALID') {
            setStats(s => ({ ...s, validToday: s.validToday + 1, totalScanned: s.totalScanned + 1 }));
          }
        }
      } else {
        setScanResponse({
          result: 'INVALID',
          message: data.error || 'Ticket not found or invalid format.',
        });
      }
    } catch {
      setScanResponse({
        result: 'INVALID',
        message: 'Network error communicating with door server.',
      });
    } finally {
      setIsProcessing(false);
      setInputToken('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Door Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between glass-panel p-4 sm:p-6 rounded-3xl border border-border gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-accent-cyan/20 border border-accent-cyan/40 flex items-center justify-center">
            <QrCode className="w-6 h-6 text-accent-cyan" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-accent-cyan uppercase tracking-widest block">Door Control Terminal</span>
            <h1 className="text-xl font-bold text-white">{selectedVenue}</h1><select aria-label="Scanner assignment" className="mt-2 bg-black text-sm" value={assignmentId} onChange={e=>setAssignmentId(e.target.value)}>{assignments.map(a=><option key={a.id} value={a.id}>{a.venues.name} · {a.gate_name||'All gates'}{a.event_id?' · Event assignment':''}</option>)}</select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-surface border border-border text-xs text-gray-300">
            <span className="text-gray-400">Scanned Today:</span> <strong className="text-white">{stats.validToday}</strong>
          </div>
          <button
            onClick={async () => { const response = await fetch('/api/auth/logout', {method:'POST'}); if (response.ok) window.location.assign('/staff/login'); }}
            className="p-2 rounded-xl bg-surface hover:bg-surface-hover border border-border text-gray-400 hover:text-white"
            title="Lock Terminal"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Scanner Terminal */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-border space-y-6">
            
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-accent-pink" /> Live Ticket Token Scanner
            </h3>

            {/* Simulated Live Viewfinder */}
            <div className="relative h-48 bg-surface rounded-2xl border-2 border-dashed border-accent-cyan/40 flex flex-col items-center justify-center text-center p-4 overflow-hidden">
              <div className="w-24 h-24 rounded-2xl border-2 border-accent-pink animate-pulse flex items-center justify-center">
                <QrCode className="w-12 h-12 text-accent-pink opacity-80" />
              </div>
              <span className="text-xs font-semibold text-gray-300 mt-2">
                Align QR Code in Frame or Input Token Below
              </span>
            </div>

            {/* Manual Token Input */}
            <form onSubmit={(e) => { e.preventDefault(); handleScanSubmit(); }} className="space-y-3">
              <label className="block text-xs font-semibold text-gray-400">Manual Ticket ID / Token Entry</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Ticket ID or QR token"
                    value={inputToken}
                    onChange={e => setInputToken(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-accent-cyan uppercase"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isProcessing || !inputToken}
                  className="px-6 py-3 rounded-xl font-bold text-sm text-white bg-accent-cyan hover:bg-accent-cyan/80 transition-colors disabled:opacity-40"
                >
                  Scan Pass
                </button>
              </div>
            </form>


          </div>

          {/* Real-time Result Overlay Display */}
          {scanResponse.result && (
            <div className={`p-6 rounded-3xl border-2 space-y-3 animate-fadeIn ${
              scanResponse.result === 'VALID'
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                : scanResponse.result === 'ALREADY_USED'
                ? 'bg-amber-950/80 border-amber-500 text-amber-200'
                : 'bg-red-950/80 border-red-500 text-red-200'
            }`}>
              <div className="flex items-center gap-3">
                {scanResponse.result === 'VALID' && <CheckCircle2 className="w-8 h-8 text-emerald-400" />}
                {scanResponse.result === 'ALREADY_USED' && <AlertTriangle className="w-8 h-8 text-amber-400" />}
                {scanResponse.result === 'INVALID' && <XCircle className="w-8 h-8 text-red-400" />}
                
                <div>
                  <h2 className="text-xl font-black tracking-wide">
                    {scanResponse.result === 'VALID' && '✓ VALID TICKET - ENTRY GRANTED'}
                    {scanResponse.result === 'ALREADY_USED' && '⚠ TICKET ALREADY USED'}
                    {scanResponse.result === 'INVALID' && '✕ INVALID TICKET'}
                  </h2>
                  <p className="text-xs opacity-90">{scanResponse.message}</p>
                </div>
              </div>

              {scanResponse.ticket && (
                <div className="pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="opacity-70 block">Customer Name</span>
                    <strong className="text-white text-sm">{scanResponse.ticket.customer_name}</strong>
                  </div>
                  <div>
                    <span className="opacity-70 block">Pass Tier</span>
                    <strong className="text-white text-sm">{scanResponse.ticket.ticket_type}</strong>
                  </div>
                  <div>
                    <span className="opacity-70 block">Event</span>
                    <strong className="text-white">{scanResponse.ticket.event_name}</strong>
                  </div>
                  <div>
                    <span className="opacity-70 block">Ticket ID</span>
                    <code className="text-white font-mono">{scanResponse.ticket.id}</code>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Scan Log Feed */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-3xl border border-border space-y-4">
          <h3 className="text-base font-bold text-white flex items-center justify-between">
            <span>Today&apos;s Door Log</span>
            <Clock className="w-4 h-4 text-gray-400" />
          </h3>

          {scanHistory.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">
              No door scans recorded yet. Scan a ticket to populate live audit log.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {scanHistory.map((log) => (
                <div 
                  key={log.id} 
                  className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between text-xs"
                >
                  <div>
                    <strong className="text-white block">{log.customer_name}</strong>
                    <span className="text-gray-400 text-[11px]">{log.event_name}</span>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.result === 'VALID' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                    }`}>
                      {log.result}
                    </span>
                    <span className="block text-[10px] text-gray-500 mt-0.5">{log.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
