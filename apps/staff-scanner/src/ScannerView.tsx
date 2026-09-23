import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkState } from 'expo-network';
import { useScanSounds } from './useScanSounds';
import GroupGuestSelection from './GroupGuestSelection';
import { c, ui } from './theme';
import { checkInTime, connectionLabel, operationsState, resultPresentation } from './presentation';
import type { Assignment, PendingScan, ScanResult, StaffContext, Stats } from './types';

export type ScannerSheet = 'gates' | 'manual' | 'settings' | null;
type Props = {
  entering:number;onEntering:(value:number)=>void;onConfirmGroup:()=>void;onCancelGroup:()=>void;
  camera: React.ReactNode; staff: StaffContext; active?: Assignment;
  stats: Stats | null; statsError: string; result: ScanResult | null; pending: PendingScan | null;
  busy: boolean; ready: boolean; blocked: boolean; paused: boolean; torch: boolean; error: string;
  connection: 'checking' | 'online' | 'lost'; foreground: boolean; cameraAvailable: boolean;
  sheet: ScannerSheet; manual: string; haptics: boolean;
  onSheet: (sheet: ScannerSheet) => void; onManual: (value: string) => void;
  onGate: (id: string) => void; onTorch: () => void; onPause: () => void;
  onRetry: () => void; onVerify: () => void; onSignOut: () => void; onHaptics: (enabled: boolean) => void;
};

function Control({ label, onPress, disabled, selected }: { label: string; onPress: () => void; disabled?: boolean; selected?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled, selected: !!selected }} disabled={disabled} onPress={onPress} style={[s.control, selected && s.controlSelected, disabled && ui.disabled]}><Text style={s.controlLabel}>{label}</Text></Pressable>;
}

export default function ScannerView(p: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [dismissed, setDismissed] = useState<ScanResult | null>(null);
  const [aimHeight, setAimHeight] = useState(300);
  const [sound, setSound] = useState(false);
  const network = useNetworkState();
  const soundUnavailable = useScanSounds(p.result, sound, p.foreground);
  const presentation = p.result ? resultPresentation(p.result) : null;
  useEffect(() => {
    if (!p.result || !presentation?.dismissAfter || !p.foreground || p.sheet) return;
    const timer = setTimeout(() => setDismissed(p.result), presentation.dismissAfter);
    return () => clearTimeout(timer);
  }, [p.result, presentation?.dismissAfter, p.foreground, p.sheet]);
  const visibleResult = p.result && p.result !== dismissed && !p.pending && !p.busy;
  const tone = presentation?.tone === 'success' ? c.green : presentation?.tone === 'warning' ? c.amber : c.red;
  const operations = operationsState(p.stats, p.statsError);
  const frameSize = Math.max(100, Math.min(width - 48, 360, aimHeight - 48));
  const status = connectionLabel(p.connection, p.foreground, network.isConnected, network.isInternetReachable);
  const scanDisabled = p.result?.result==='GROUP_READY' || p.busy || !!p.pending || p.blocked || !p.active || !p.ready;

  return <View style={ui.page}>
    {p.camera}
    <View pointerEvents="box-none" style={[s.content, { paddingTop: insets.top + 6, paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={s.header}>
        <View style={s.brandRow}><Text style={s.brand}>ARS <Text style={s.door}>DOOR</Text></Text><View accessibilityLabel={`ARS server: ${status}`} style={s.connection}><View style={[s.dot, { backgroundColor: status === 'ONLINE' ? c.green : status === 'OFFLINE' ? c.red : c.amber }]} /><Text style={s.connectionText}>{status}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Scanner settings and sign out" onPress={() => p.onSheet('settings')} style={s.menu}><Text style={s.menuText}>•••</Text></Pressable></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Change assigned venue and gate" disabled={p.busy || !!p.pending} onPress={() => p.onSheet('gates')} style={s.venue}><View style={{ flex: 1 }}><Text numberOfLines={1} style={s.venueName}>{p.active?.venue_name || 'No assigned venue'}</Text><Text numberOfLines={1} style={s.meta}>{p.active?.gate_name || 'No gate'} · {p.staff.name}</Text></View><Text style={s.chevron}>⌄</Text></Pressable>
      </View>

      <View pointerEvents="box-none" onLayout={event => setAimHeight(event.nativeEvent.layout.height)} style={s.aim}>
        {p.cameraAvailable && <View pointerEvents="none" style={{ alignItems: 'center' }}><View style={[s.frame, { width: frameSize, height: frameSize, borderColor: p.busy ? c.gold : p.pending ? c.amber : '#dfcfa399' }]}>{p.busy && <View style={s.verifying}><ActivityIndicator color={c.gold} size="large"/><Text style={s.verifyingText}>VERIFYING</Text></View>}</View><Text style={s.hint}>{p.busy ? 'Confirming with ARS' : p.pending ? 'Resolve pending scan below' : p.paused ? 'SCANNER PAUSED' : 'Hold one guest QR in the frame'}</Text></View>}
      </View>

      <View style={s.bottom}>
        <ScrollView style={s.results} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
          {!!p.error && <View accessibilityLiveRegion="assertive" style={[s.resultCard, { borderColor: c.amber }]}><Text style={[s.resultTitle, { color: c.amber }]}>{p.pending ? 'ENTRY NOT CONFIRMED' : 'SCANNER NOTICE'}</Text><Text style={s.body}>{p.error}</Text>{p.pending && <><Text style={s.meta}>Do not admit yet · Ref {p.pending.requestId.slice(-8)}</Text><Pressable accessibilityRole="button" disabled={p.busy} onPress={p.onRetry} style={[ui.button, p.busy && ui.disabled]}><Text style={ui.buttonText}>{p.busy ? 'CONFIRMING...' : 'RETRY SAME SCAN SAFELY'}</Text></Pressable></>}</View>}
          {p.result?.result==='GROUP_READY' && p.result.group && !p.pending && <View style={s.resultCard}>
            <Text style={[s.resultTitle,{color:c.gold}]}>GROUP PASS</Text><Text style={s.guest}>{p.result.ticket?.customer_name}</Text><Text style={s.body}>{p.result.ticket?.event_name}</Text>
            <Text style={s.body}>Purchased: {p.result.group.purchased_quantity} · Already entered: {p.result.group.checked_in_quantity} · Remaining: {p.result.group.remaining_quantity}</Text>
            <GroupGuestSelection key={`${p.result.group.id}:${p.result.group.checked_in_quantity}`} purchased={p.result.group.purchased_quantity} entered={p.result.group.checked_in_quantity} disabled={p.busy} onChange={p.onEntering}/>
            <Text style={s.body}>ENTERING NOW: {p.entering}</Text>
            <Text style={s.body}>REMAINING AFTER: {p.result.group.remaining_quantity-p.entering}</Text>
            <Control label={p.busy?'CONFIRMING...':`CHECK IN ${p.entering}`} disabled={p.busy||status!=='ONLINE'||p.entering<1||p.entering>p.result.group.remaining_quantity} onPress={p.onConfirmGroup}/><Control label="CANCEL" disabled={p.busy} onPress={p.onCancelGroup}/>
          </View>}
          {visibleResult && p.result?.result!=='GROUP_READY' && presentation && p.result && <View accessibilityLiveRegion="assertive" style={[s.resultCard, { borderColor: tone }]}>
            <Text style={[s.resultTitle, { color: tone }]}>{presentation.title}</Text>
            <Text style={s.body}>{presentation.detail}</Text>
            {p.result.group && <Text style={s.body}>{p.result.group.checked_in_quantity} / {p.result.group.purchased_quantity} entered · Remaining: {p.result.group.remaining_quantity}</Text>}
            {!!p.result.ticket && <><Text style={s.guest}>{p.result.ticket.customer_name}</Text><Text style={s.body}>{p.result.ticket.event_name}</Text><Text style={s.passType}>{p.result.ticket.ticket_type}</Text><Text style={s.meta}>{p.result.result === 'ALREADY_USED' ? 'Previous check-in' : 'Check-in'} · {checkInTime(p.result.ticket.scanned_at)}</Text><Text selectable style={s.passId}>PASS ID · {p.result.ticket.id}</Text></>}
            {presentation.dismissAfter > 0 ? <Text style={s.meta}>Ready for the next guest · closes automatically</Text> : <Control label="BACK TO SCANNER" onPress={() => setDismissed(p.result)} />}
          </View>}
          <View style={s.operations}>
            <View style={s.operationsHeading}><Text style={s.label}>TONIGHT OPERATIONS</Text><Text style={s.small}>IST · ALL ASSIGNED GATES</Text></View>
            {operations === 'empty' ? <><Text style={s.emptyTitle}>NO EVENT TONIGHT</Text><Text style={s.meta}>No published events in tonight&apos;s assigned scope.</Text></> : operations === 'loading' ? <Text style={s.meta}>Loading operational totals...</Text> : operations === 'unavailable' ? <Text style={s.meta}>Totals unavailable. Retrying automatically.</Text> : <View style={s.numbers}>{[['CHECKED IN', p.stats?.checked_in], ['PAID PASSES LEFT', p.stats?.remaining], ['CAPACITY', p.stats?.capacity]].map(([label, value]) => <View key={String(label)} style={s.metric}><Text style={s.number}>{value}</Text><Text style={s.small}>{label}</Text></View>)}</View>}
          </View>
        </ScrollView>
        <View style={s.controls}><Control label={p.torch ? 'FLASH ON' : 'FLASH'} selected={p.torch} disabled={!p.cameraAvailable} onPress={p.onTorch}/><Control label={p.paused ? 'RESUME' : 'PAUSE'} selected={p.paused} onPress={p.onPause}/><Control label="ENTER QR" disabled={scanDisabled} onPress={() => p.onSheet('manual')}/></View>
        {status === 'OFFLINE' && <Text accessibilityLiveRegion="polite" style={s.offline}>No offline approval. ARS must confirm every entry.</Text>}
      </View>
    </View>

    <Modal visible={!!p.sheet} transparent animationType="none" onRequestClose={() => p.onSheet(null)}>
      <KeyboardAvoidingView style={s.modal} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable accessibilityLabel="Close panel" style={s.backdrop} onPress={() => p.onSheet(null)}/>
        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}><ScrollView keyboardShouldPersistTaps="handled">
          <View style={s.sheetHeading}><Text style={s.sheetTitle}>{p.sheet === 'gates' ? 'Your gates' : p.sheet === 'manual' ? 'Enter pass token' : 'Scanner controls'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close panel" onPress={() => p.onSheet(null)} style={s.menu}><Text style={s.close}>×</Text></Pressable></View>
          {p.sheet === 'gates' ? p.staff.assignments.map(item => <Pressable accessibilityRole="button" disabled={p.busy || !!p.pending} key={item.id} style={[ui.panel, { marginTop: 10 }, item.id === p.active?.id && { borderColor: c.gold }]} onPress={() => p.onGate(item.id)}><Text style={s.venueName}>{item.venue_name} / {item.gate_name}</Text><Text style={s.meta}>{item.event_name || 'All assigned venue events'}</Text></Pressable>) : p.sheet === 'manual' ? <><Text style={s.body}>Enter an ARS pass token. Group passes require quantity confirmation.</Text><TextInput accessibilityLabel="Guest QR token or pass ID" style={[ui.input, { marginVertical: 16 }]} value={p.manual} onChangeText={p.onManual} autoCapitalize="none" autoCorrect={false} placeholder="ARS token or pass ID" placeholderTextColor={c.muted} maxLength={4096}/><Pressable accessibilityRole="button" disabled={!p.manual.trim() || scanDisabled} style={[ui.button, (!p.manual.trim() || scanDisabled) && ui.disabled]} onPress={p.onVerify}><Text style={ui.buttonText}>VERIFY PASS</Text></Pressable></> : <View style={{ gap: 18 }}>
            <Text style={s.body}>{p.staff.name} · {p.active?.venue_name} / {p.active?.gate_name}</Text>
            <View style={s.setting}><Text style={s.body}>Haptic feedback</Text><Switch accessibilityLabel="Haptic feedback" value={p.haptics} onValueChange={p.onHaptics} trackColor={{ false: c.line, true: c.gold }} thumbColor={c.white}/></View>
            <View style={s.setting}><Text style={s.body}>Scan sounds</Text><Switch accessibilityLabel="Scan sounds" value={sound} onValueChange={setSound} trackColor={{ false: c.line, true: c.gold }} thumbColor={c.white}/></View>
            <Text style={s.meta}>{soundUnavailable ? 'Sound unavailable on this device. Use the visual result and haptic feedback.' : 'Optional short tones for approved, duplicate and invalid results. Respects device volume and silent mode.'}</Text>
            <View style={ui.panel}><Text style={s.label}>GROUP BOOKINGS</Text><Text style={s.body}>Group bookings have one QR. Scan, select the entering quantity, then confirm. Scanning a group QR alone never admits anyone.</Text></View>
            <Text style={s.meta}>Paid passes left counts unscanned paid passes, not unused venue capacity. Status combines device connectivity and the latest ARS request; no entry is approved offline.</Text>
            <Pressable accessibilityRole="button" style={ui.secondary} onPress={p.onSignOut}><Text style={ui.secondaryText}>SIGN OUT</Text></Pressable>
          </View>}
        </ScrollView></View>
      </KeyboardAvoidingView>
    </Modal>
  </View>;
}

const s = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 12 },
  header: { backgroundColor: c.bg, paddingHorizontal: 10, borderBottomWidth: 1, borderColor: '#dfcfa325' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, brand: { flex: 1, color: c.gold, fontSize: 20, fontWeight: '800', letterSpacing: 1 }, door: { color: c.white, fontSize: 12, letterSpacing: 3 },
  connection: { flexDirection: 'row', alignItems: 'center', gap: 5 }, connectionText: { color: c.muted, fontSize: 8, fontWeight: '700', letterSpacing: .5 }, dot: { width: 5, height: 5, borderRadius: 3 },
  menu: { minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' }, menuText: { color: c.gold, fontSize: 22, letterSpacing: 2 },
  venue: { minHeight: 48, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 10 }, venueName: { color: c.white, fontSize: 16, fontWeight: '600' }, meta: { color: c.muted, fontSize: 11, lineHeight: 17 }, chevron: { color: c.gold, fontSize: 23 },
  aim: { flex: 1, minHeight: 156, alignItems: 'center', justifyContent: 'center' }, frame: { borderWidth: 3, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, hint: { color: c.white, fontSize: 12, backgroundColor: '#080908d9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4, marginTop: 10 },
  verifying: { backgroundColor: '#080908dd', padding: 20, borderRadius: 12, gap: 10, alignItems: 'center' }, verifyingText: { color: c.gold, fontSize: 10, letterSpacing: 2 },
  bottom: { maxHeight: '55%', gap: 8 }, results: { flexGrow: 0 },
  resultCard: { backgroundColor: c.bg, borderWidth: 2, borderRadius: 14, padding: 16, gap: 7 }, resultTitle: { fontWeight: '900', fontSize: 21, letterSpacing: .3 }, guest: { color: c.white, fontSize: 22, fontWeight: '700', marginTop: 2 }, body: { color: c.white, fontSize: 13, lineHeight: 20 }, passType: { color: c.gold, fontSize: 14, fontWeight: '600' }, passId: { color: c.muted, fontSize: 10, lineHeight: 15 },
  operations: { backgroundColor: c.bg, borderTopWidth: 1, borderColor: '#dfcfa325', padding: 10, gap: 6 }, operationsHeading: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }, label: { color: c.gold, fontSize: 9, fontWeight: '700', letterSpacing: 1.5 }, small: { color: c.muted, fontSize: 8, lineHeight: 12, fontWeight: '600' }, emptyTitle: { color: c.white, fontSize: 15, fontWeight: '700', letterSpacing: 1 }, numbers: { flexDirection: 'row', gap: 12 }, metric: { flex: 1, gap: 2 }, number: { color: c.white, fontSize: 23, fontWeight: '700' },
  controls: { flexDirection: 'row', gap: 8 }, control: { flex: 1, minHeight: 48, paddingHorizontal: 8, paddingVertical: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: c.bg, borderWidth: 1, borderColor: c.line, borderRadius: 10 }, controlSelected: { borderColor: c.gold, backgroundColor: c.panel }, controlLabel: { color: c.gold, fontSize: 10, fontWeight: '700', letterSpacing: .7 }, offline: { color: c.amber, backgroundColor: c.bg, textAlign: 'center', fontSize: 10, padding: 5 },
  modal: { flex: 1, justifyContent: 'flex-end' }, backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#000b' }, sheet: { maxHeight: '85%', backgroundColor: c.bg, padding: 20, borderTopWidth: 1, borderColor: c.gold, borderTopLeftRadius: 20, borderTopRightRadius: 20 }, sheetHeading: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 }, sheetTitle: { color: c.white, fontSize: 23, flex: 1, fontWeight: '700' }, close: { color: c.gold, fontSize: 28 }, setting: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
