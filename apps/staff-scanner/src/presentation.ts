import type { ScanResult, Stats } from './types';

export function connectionLabel(server: 'checking' | 'online' | 'lost', foreground: boolean, connected?: boolean, reachable?: boolean) {
  if (!foreground) return 'CONNECTING';
  if (connected === false || reachable === false || server === 'lost') return 'OFFLINE';
  return server === 'online' ? 'ONLINE' : 'CONNECTING';
}

// Presentation only: never used to authorize entry or change scan requests.
export function resultPresentation(result: ScanResult) {
  if (result.result==='GROUP_READY') return {title:'GROUP PASS',tone:'warning' as const,dismissAfter:0,detail:'Select entering quantity. No guests admitted yet.'};
  if (result.replayed) return { title: 'RECOVERED RESULT', tone: 'warning' as const, dismissAfter: 0, detail: 'Earlier server response. Do not admit the same guest twice.' };
  if (result.result === 'VALID') return { title: 'ENTRY APPROVED', tone: 'success' as const, dismissAfter: 3500, detail: result.group ? `${result.admitted_quantity||0} guests confirmed by ARS.` : 'One guest pass confirmed by ARS.' };
  if (result.result === 'ALREADY_USED') return { title: result.group ? 'GROUP PASS FULLY USED' : 'ALREADY CHECKED IN', tone: 'warning' as const, dismissAfter: 0, detail: result.message || 'Duplicate entry denied.' };
  return { title: 'INVALID TICKET', tone: 'error' as const, dismissAfter: 0, detail: result.message || 'This pass is not valid for entry.' };
}

export function operationsState(stats: Stats | null, error: string) {
  if (error) return 'unavailable';
  if (!stats) return 'loading';
  return stats.event_count === 0 ? 'empty' : 'ready';
}

export function checkInTime(value: string | null | undefined) {
  if (!value || Number.isNaN(Date.parse(value))) return 'Not recorded';
  return `${new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })} IST`;
}
