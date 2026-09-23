import { describe, expect, it } from 'vitest';
import { checkInTime, connectionLabel, operationsState, resultPresentation } from '../apps/staff-scanner/src/presentation';
import type { ScanResult, Stats } from '../apps/staff-scanner/src/types';

const result = (state: ScanResult['result'], replayed = false): ScanResult => ({ result: state, replayed, message: 'Server reason', request_id: 'test', recorded_at: '2026-09-18T12:00:00Z' });
describe('scanner presentation never invents admission or group counts', () => {
  it('never shows online after native connectivity loss, even with an earlier successful request', () => {
    expect(connectionLabel('online', true, false, false)).toBe('OFFLINE');
    expect(connectionLabel('online', true, true, false)).toBe('OFFLINE');
    expect(connectionLabel('lost', true, true, true)).toBe('OFFLINE');
    expect(connectionLabel('checking', true, true, true)).toBe('CONNECTING');
    expect(connectionLabel('online', false, true, true)).toBe('CONNECTING');
    expect(connectionLabel('online', true, true, true)).toBe('ONLINE');
  });
  it('auto-dismisses only fresh server-approved results', () => {
    expect(resultPresentation(result('VALID'))).toMatchObject({ title: 'ENTRY APPROVED', tone: 'success', dismissAfter: 3500 });
    expect(resultPresentation(result('ALREADY_USED'))).toMatchObject({ title: 'ALREADY CHECKED IN', tone: 'warning', dismissAfter: 0 });
    expect(resultPresentation(result('INVALID'))).toMatchObject({ title: 'INVALID TICKET', detail: 'Server reason', dismissAfter: 0 });
  });
  it.each(['VALID', 'ALREADY_USED', 'INVALID'] as const)('does not present a replayed %s as a fresh approval', state => {
    expect(resultPresentation(result(state, true))).toMatchObject({ title: 'RECOVERED RESULT', tone: 'warning', dismissAfter: 0 });
  });
  it('separates loading, unavailable and genuinely empty operational totals', () => {
    expect(operationsState(null, '')).toBe('loading');
    expect(operationsState(null, 'offline')).toBe('unavailable');
    const stats: Stats = { event_count: 0, checked_in: 0, remaining: 0, capacity: 0, as_of: '', date: '', scope: '' };
    expect(operationsState(stats, '')).toBe('empty');
    expect(operationsState(stats, 'stale')).toBe('unavailable');
    expect(operationsState({ ...stats, event_count: 1 }, '')).toBe('ready');
  });
  it('does not fabricate missing or invalid check-in timestamps', () => {
    expect(checkInTime(null)).toBe('Not recorded');
    expect(checkInTime('not-a-date')).toBe('Not recorded');
    expect(checkInTime('2026-09-18T12:00:00Z')).toContain('IST');
  });
});
