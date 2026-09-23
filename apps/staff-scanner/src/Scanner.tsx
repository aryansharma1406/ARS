import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import ScannerView, { type ScannerSheet } from './ScannerView';
import { AccessError, ScannerError, loadContext, loadStats, pendingKey, submitScan } from './api';
import { secureStorage } from './storage';
import { ui } from './theme';
import type { PendingScan, ScanResult, StaffContext, Stats } from './types';

type Props = { staff: StaffContext; onContext: (context: StaffContext) => void; onSignOut: () => Promise<void> };
export default function Scanner({ staff, onContext, onSignOut }: Props) {
  useKeepAwake();
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
  const [sheet, setSheet] = useState<ScannerSheet>(null);
  const [haptics, setHaptics] = useState(true);
  const [connection, setConnection] = useState<'checking' | 'online' | 'lost'>('checking');
  const [manual, setManual] = useState('');
  const [groupToken,setGroupToken]=useState('');
  const [entering,setEntering]=useState(1);
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
      if (mounted.current && scope.current === assignmentId) { setStats(data); setStatsError(''); setBlocked(false); setConnection('online'); }
    } catch (err) {
      if (mounted.current && scope.current === assignmentId) {
        setConnection('lost');
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
    setConnection('checking');
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 15000);
    return () => clearInterval(timer);
  }, [foreground, refresh]);
  async function run(request: PendingScan) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setPending(request);
    let phase: 'save' | 'submit' | 'clear' = 'save';
    try {
      // Persist before transmission: a timeout or process restart can retry the same receipt.
      await secureStorage.setItem(pendingKey(staff.staff_id), JSON.stringify(request));
      phase = 'submit';
      const response = await submitScan(request);
      phase = 'clear';
      await secureStorage.removeItem(pendingKey(staff.staff_id));
      if (!mounted.current) return;
      setGroupToken(response.result==='GROUP_READY'?request.token:'');setEntering(1);
      setPending(null); setResult(response); setConnection('online');
      cooldown.current = Date.now() + 1600;
      if (haptics) void Haptics.notificationAsync(response.result === 'VALID' && !response.replayed ? Haptics.NotificationFeedbackType.Success : response.result === 'INVALID' && !response.replayed ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Warning).catch(() => {});
      void refresh();
    } catch (err) {
      if (mounted.current) {
        if (phase === 'submit') setConnection('lost');
        setError(phase === 'save'
          ? 'This phone could not securely save the scan. Nothing was sent. Retry or contact support.'
          : phase === 'clear'
            ? 'ARS responded, but this phone could not clear the saved request. Retry the same scan to recover its result; do not admit the guest twice.'
            : err instanceof ScannerError
              ? err.message
              : 'No entry confirmation. Check your connection and retry this same scan. Do not admit the guest yet.');
        if (err instanceof AccessError) setBlocked(true);
      }
    } finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  function scan(token: string) {
    const now = Date.now();
    const repeated = seen.current.token === token && now - seen.current.at < 1400;
    seen.current = { token, at: now };
    if (repeated || now < cooldown.current || lock.current || pending || !ready || blocked || !active || paused || !foreground || sheet || result?.result==='GROUP_READY') return;
    if (token.length > 4096) { setError('QR code is too large. Use an ARS guest pass.'); return; }
    void run({ requestId: Crypto.randomUUID(), assignmentId, token });
  }
  async function refreshAccess() {
    try { const next = await loadContext(); onContext(next); setBlocked(false); void refresh(); }
    catch { setError('Staff access could not be refreshed. Contact your venue owner.'); }
  }
  return <ScannerView
    entering={entering} onEntering={setEntering} onCancelGroup={()=>{setResult(null);setGroupToken('');cooldown.current=Date.now()+1600;}}
    onConfirmGroup={()=>{if(groupToken && result?.result==='GROUP_READY' && !pending && !busy)void run({requestId:Crypto.randomUUID(),assignmentId,token:groupToken,quantity:entering});}}
    camera={permission?.granted && foreground && !blocked && active ? <CameraView style={StyleSheet.absoluteFill} facing="back" enableTorch={torch} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => scan(data)} onMountError={() => { setPaused(true); setError('Camera could not start. Check camera access or restart the app.'); }} /> : <View style={[StyleSheet.absoluteFill, ui.center]}>
      <Text style={ui.title}>{!active || blocked ? 'Scanner access unavailable' : 'Camera access'}</Text>
      <Text style={ui.text}>{!active || blocked ? 'Ask your venue owner for an active venue and gate assignment.' : 'Allow camera access to scan ARS passes. No audio is recorded.'}</Text>
      {!permission?.granted && <Pressable style={ui.button} onPress={() => { if (permission?.canAskAgain === false) void Linking.openSettings(); else void requestPermission(); }}><Text style={ui.buttonText}>ALLOW CAMERA</Text></Pressable>}
      {(!active || blocked) && <Pressable style={ui.button} onPress={() => void refreshAccess()}><Text style={ui.buttonText}>REFRESH ACCESS</Text></Pressable>}
    </View>}
    staff={staff} active={active} stats={stats} statsError={statsError} result={result} pending={pending}
    busy={busy} ready={ready} blocked={blocked} paused={paused} torch={torch} error={error}
    connection={connection} foreground={foreground} cameraAvailable={!!permission?.granted && foreground && !blocked && !!active}
    sheet={sheet} manual={manual} haptics={haptics} onHaptics={setHaptics} onSheet={setSheet} onManual={setManual}
    onTorch={() => setTorch(!torch)} onPause={() => setPaused(!paused)}
    onRetry={() => { if (pending) void run(pending); }}
    onGate={id => { setAssignmentId(id); setStats(null); setResult(null); setError(''); seen.current = { token: '', at: 0 }; setSheet(null); }}
    onVerify={() => { const token = manual.trim(); setSheet(null); setManual(''); void run({ requestId: Crypto.randomUUID(), assignmentId, token }); }}
    onSignOut={() => Alert.alert('Sign out?', pending ? 'An unconfirmed scan will remain saved for this account. Recover it after signing in again.' : 'End your scanner session?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', onPress: () => { void onSignOut().catch(() => setError('Sign-out failed. Please try again.')); } }])}
  />;
}
