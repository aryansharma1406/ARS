import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccessError, loadContext, loadStats, pendingKey, submitScan } from './api';
import { secureStorage } from './storage';
import { c, ui } from './theme';
import type { PendingScan, ScanResult, StaffContext, Stats } from './types';

type Props = { staff: StaffContext; onContext: (context: StaffContext) => void; onSignOut: () => Promise<void> };
export default function Scanner({ staff, onContext, onSignOut }: Props) {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [assignmentId, setAssignmentId] = useState(staff.assignments[0]?.id ?? '');
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [pending, setPending] = useState<PendingScan | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [paused, setPaused] = useState(false);
  const [torch, setTorch] = useState(false);
  const [sheet, setSheet] = useState<'gates' | 'manual' | null>(null);
  const [manual, setManual] = useState('');
  const active = staff.assignments.find((item) => item.id === assignmentId);
  const lock = useRef(false);
  const mounted = useRef(true);
  const scope = useRef(assignmentId);
  scope.current = assignmentId;
  const seen = useRef({ token: '', at: 0 });
  const cooldown = useRef(0);
  const refresh = useCallback(async () => {
    if (!assignmentId) return;
    try {
      const data = await loadStats(assignmentId);
      if (mounted.current && scope.current === assignmentId) { setStats(data); setStatsError(''); setBlocked(false); }
    } catch (err) {
      if (mounted.current && scope.current === assignmentId) {
        setStatsError('Totals unavailable or stale. Refreshing automatically.');
        if (err instanceof AccessError) setBlocked(true);
      }
    }
  }, [assignmentId]);
  useEffect(() => {
    mounted.current = true;
    secureStorage.getItem(pendingKey(staff.staff_id)).then((value) => {
      if (!mounted.current) return;
      if (value) { const saved = JSON.parse(value) as PendingScan; setPending(saved); setAssignmentId(saved.assignmentId); setError('An earlier scan needs confirmation. Retry before admitting anyone.'); }
      setReady(true);
    }).catch(() => { if (mounted.current) setError('Secure storage could not be opened. Restart the app before scanning.'); });
    const subscription = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    return () => { mounted.current = false; subscription.remove(); };
  }, [staff.staff_id]);
  useEffect(() => {
    if (!foreground) return;
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 15000);
    return () => clearInterval(timer);
  }, [foreground, refresh]);
  async function run(request: PendingScan) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setPending(request);
    try {
      // Persist before transmission: a timeout or process restart can retry the same receipt.
      await secureStorage.setItem(pendingKey(staff.staff_id), JSON.stringify(request));
      const response = await submitScan(request);
      await secureStorage.removeItem(pendingKey(staff.staff_id));
      if (!mounted.current) return;
      setPending(null); setResult(response);
      cooldown.current = Date.now() + 1600;
      void Haptics.notificationAsync(response.result === 'VALID' && !response.replayed ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning).catch(() => {});
      void refresh();
    } catch (err) {
      if (mounted.current) {
        setError(err instanceof AccessError ? 'Staff access is unavailable. Contact your venue owner. This scan is not confirmed.' : 'No entry confirmation. Check your connection and retry this scan. Do not admit the guest yet.');
        if (err instanceof AccessError) setBlocked(true);
      }
    } finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  function scan(token: string) {
    const now = Date.now();
    const repeated = seen.current.token === token && now - seen.current.at < 1400;
    seen.current = { token, at: now };
    if (repeated || now < cooldown.current || lock.current || pending || !ready || blocked || !active || paused || !foreground || sheet) return;
    if (token.length > 4096) { setError('QR code is too large. Use an ARS guest pass.'); return; }
    void run({ requestId: Crypto.randomUUID(), assignmentId, token });
  }
  async function refreshAccess() {
    try { const next = await loadContext(); onContext(next); setBlocked(false); void refresh(); }
    catch { setError('Staff access could not be refreshed. Contact your venue owner.'); }
  }
  const heading = result?.result === 'VALID' ? 'ENTRY APPROVED' : result?.result === 'ALREADY_USED' ? 'ALREADY CHECKED IN' : 'INVALID TICKET';
  const color = result?.result === 'VALID' ? c.green : result?.result === 'ALREADY_USED' ? c.amber : c.red;
  return <View style={ui.page}>
    {permission?.granted && foreground && !blocked && active ? <CameraView style={StyleSheet.absoluteFill} facing="back" enableTorch={torch} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => scan(data)} onMountError={() => { setPaused(true); setError('Camera could not start. Check camera access or restart the app.'); }} /> : <View style={[StyleSheet.absoluteFill, ui.center]}>
      <Text style={ui.title}>{!active || blocked ? 'Scanner access unavailable' : 'Camera access'}</Text>
      <Text style={ui.text}>{!active || blocked ? 'Ask your venue owner for an active venue and gate assignment.' : 'Allow camera access to scan ARS passes. No audio is recorded.'}</Text>
      {!permission?.granted && <Pressable style={ui.button} onPress={() => { if (permission?.canAskAgain === false) void Linking.openSettings(); else void requestPermission(); }}><Text style={ui.buttonText}>ALLOW CAMERA</Text></Pressable>}
      {(!active || blocked) && <Pressable style={ui.button} onPress={() => void refreshAccess()}><Text style={ui.buttonText}>REFRESH ACCESS</Text></Pressable>}
    </View>}
    <View pointerEvents="box-none" style={[styles.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}><Text style={ui.label}>ARS / DOOR OPERATIONS</Text><Text style={ui.text}>{staff.name}</Text></View>
        <Pressable accessibilityLabel="Sign out" style={ui.secondary} onPress={() => Alert.alert('Sign out?', pending ? 'An unconfirmed scan will remain saved for this account. Recover it after signing in again.' : 'End your scanner session?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', onPress: () => { void onSignOut().catch(() => setError('Sign-out failed. Please try again.')); } }])}><Text style={ui.secondaryText}>SIGN OUT</Text></Pressable>
      </View>
      <Pressable disabled={busy || !!pending} style={styles.gate} onPress={() => setSheet('gates')}><Text style={ui.text}>{active?.venue_name ?? 'Select venue'} / {active?.gate_name ?? 'No assignment'}</Text><Text style={ui.muted}>{active?.event_name ?? 'All assigned venue events'} · Change gate</Text></Pressable>
      <View pointerEvents="none" style={styles.aim}><View style={styles.frame} /><Text style={styles.hint}>{busy ? 'VERIFYING WITH ARS...' : pending ? 'SCAN NEEDS CONFIRMATION' : paused ? 'SCANNING PAUSED' : 'HOLD ONE GUEST QR INSIDE THE FRAME'}</Text></View>
      <View style={styles.bottom}>
        {!!error && <View style={styles.notice}><Text style={ui.error}>{error}</Text>{pending && <Pressable disabled={busy} style={ui.button} onPress={() => void run(pending)}><Text style={ui.buttonText}>{busy ? 'CONFIRMING...' : 'RETRY SAME SCAN SAFELY'}</Text></Pressable>}</View>}
        {result && !pending && <View style={[styles.notice, { borderColor: color }]}>
          <Text style={[styles.result, { color }]}>{heading}</Text>
          {result.replayed && <Text style={{ color: c.amber }}>Recovered earlier result. Do not admit the same guest twice.</Text>}
          <ScrollView style={{ maxHeight: 125 }}><Text style={ui.text}>{result.ticket?.customer_name ?? result.message}</Text>{result.ticket && <><Text style={ui.muted}>{result.ticket.event_name} · {result.ticket.venue_name}</Text><Text style={ui.text}>{result.ticket.ticket_type}</Text><Text style={ui.muted}>Check-in: {result.ticket.scanned_at ? new Date(result.ticket.scanned_at).toLocaleString() : 'Not checked in'}</Text></>}</ScrollView>
        </View>}
        <View style={styles.stats}>
          <Text style={ui.label}>TONIGHT / IST · ALL ASSIGNED EVENT GATES</Text>
          <View style={styles.numbers}>{[['CHECKED IN', stats?.checked_in], ['PAID PASSES LEFT', stats?.remaining], ['CAPACITY', stats?.capacity]].map(([label, value]) => <View key={String(label)} style={{ flex: 1 }}><Text style={styles.number}>{value ?? '—'}</Text><Text style={styles.small}>{label}</Text></View>)}</View>
          <Text style={ui.muted}>{statsError || (stats ? `Updated ${new Date(stats.as_of).toLocaleTimeString()}` : 'Loading venue totals...')}</Text>
        </View>
        <View style={ui.row}>
          <Pressable style={[ui.secondary, styles.control]} onPress={() => setTorch(!torch)}><Text style={ui.secondaryText}>TORCH {torch ? 'OFF' : 'ON'}</Text></Pressable>
          <Pressable style={[ui.secondary, styles.control]} onPress={() => setPaused(!paused)}><Text style={ui.secondaryText}>{paused ? 'RESUME' : 'PAUSE'}</Text></Pressable>
          <Pressable disabled={busy || !!pending || blocked || !active || !ready} style={[ui.secondary, styles.control]} onPress={() => setSheet('manual')}><Text style={ui.secondaryText}>ENTER QR</Text></Pressable>
        </View>
      </View>
    </View>
    <Modal visible={!!sheet} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
      <Pressable style={styles.backdrop} onPress={() => setSheet(null)} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}><ScrollView keyboardShouldPersistTaps="handled">
        <Text style={ui.title}>{sheet === 'gates' ? 'Your gates' : 'Enter pass token'}</Text>
        {sheet === 'gates' ? staff.assignments.map((item) => <Pressable key={item.id} style={[ui.panel, { marginTop: 12 }]} onPress={() => { setAssignmentId(item.id); setStats(null); setResult(null); setError(''); seen.current = { token: '', at: 0 }; setSheet(null); }}><Text style={ui.text}>{item.venue_name} / {item.gate_name}</Text><Text style={ui.muted}>{item.event_name ?? 'All venue events'}</Text></Pressable>) : <><TextInput style={[ui.input, { marginVertical: 16 }]} value={manual} onChangeText={setManual} autoCapitalize="none" autoCorrect={false} placeholder="ARS QR token or ticket ID" placeholderTextColor={c.muted} maxLength={4096} /><Pressable disabled={!manual.trim() || busy || !!pending || blocked || !active} style={ui.button} onPress={() => { const token = manual.trim(); setSheet(null); setManual(''); void run({ requestId: Crypto.randomUUID(), assignmentId, token }); }}><Text style={ui.buttonText}>VERIFY PASS</Text></Pressable></>}
        <Pressable style={[ui.secondary, { marginTop: 16 }]} onPress={() => setSheet(null)}><Text style={ui.secondaryText}>CLOSE</Text></Pressable>
      </ScrollView></View>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#080908e8', padding: 12, borderRadius: 12 },
  gate: { backgroundColor: '#080908e8', padding: 12, marginTop: 8, borderRadius: 8 },
  aim: { flex: 1, minHeight: 70, alignItems: 'center', justifyContent: 'center' },
  frame: { width: '60%', aspectRatio: 1, maxHeight: 170, borderWidth: 2, borderColor: c.gold, borderRadius: 16 },
  hint: { backgroundColor: '#080908d9', color: c.gold, fontSize: 10, fontWeight: '700', padding: 8, marginTop: 8 },
  bottom: { gap: 8 }, notice: { backgroundColor: '#080908f5', borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 14, gap: 8 },
  result: { fontWeight: '900', fontSize: 21 }, stats: { backgroundColor: '#080908ed', padding: 12, borderRadius: 10, gap: 8 },
  numbers: { flexDirection: 'row', gap: 8 }, number: { fontSize: 25, fontWeight: '800', color: c.gold }, small: { fontSize: 9, color: c.muted },
  control: { flex: 1, alignItems: 'center', paddingHorizontal: 4 }, backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#000b' },
  sheet: { marginTop: 'auto', maxHeight: '80%', backgroundColor: c.bg, padding: 24, borderTopWidth: 1, borderColor: c.gold },
});
