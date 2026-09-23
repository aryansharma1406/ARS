import { useEffect, useRef, useState } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import type { ScanResult } from './types';

// Feedback is driven exclusively by a confirmed server response. It never submits a scan.
export function useScanSounds(result: ScanResult | null, enabled: boolean, foreground: boolean) {
  const approved = useAudioPlayer(require('../assets/approved.wav'));
  const duplicate = useAudioPlayer(require('../assets/duplicate.wav'));
  const invalid = useAudioPlayer(require('../assets/invalid.wav'));
  const heard = useRef<ScanResult | null>(result);
  const [unavailable, setUnavailable] = useState(false);
  const mode = useRef<Promise<void> | null>(null);

  useEffect(() => {
    mode.current = setAudioModeAsync({ allowsRecording: false, shouldPlayInBackground: false, playsInSilentMode: false, interruptionMode: 'mixWithOthers' });
    void mode.current.catch(() => setUnavailable(true));
  }, []);

  useEffect(() => {
    if (!result || result === heard.current) return;
    heard.current = result;
    if (!enabled || !foreground) return;
    const player = result.replayed || result.result === 'ALREADY_USED' ? duplicate : result.result === 'VALID' ? approved : invalid;
    let cancelled = false;
    void (async () => {
      try {
        await mode.current;
        approved.pause(); duplicate.pause(); invalid.pause();
        player.volume = 0.65;
        await player.seekTo(0);
        if (!cancelled) { player.play(); setUnavailable(false); }
      } catch { if (!cancelled) setUnavailable(true); }
    })();
    return () => { cancelled = true; };
  }, [result, enabled, foreground, approved, duplicate, invalid]);

  useEffect(() => {
    if (!enabled || !foreground) {
      try { approved.pause(); duplicate.pause(); invalid.pause(); } catch { /* Visual feedback remains available. */ }
    }
  }, [enabled, foreground, approved, duplicate, invalid]);

  return unavailable;
}
