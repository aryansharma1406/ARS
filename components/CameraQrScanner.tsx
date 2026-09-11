'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff } from 'lucide-react';

export default function CameraQrScanner({ disabled, onScan }: { disabled: boolean; onScan: (token: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [scanned, setScanned] = useState(false);

  function release() {
    generation.current += 1;
    if (timer.current) clearTimeout(timer.current);
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }
  function stop() {
    release(); setActive(false); setStarting(false);
  }
  useEffect(() => {
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', hide);
    return () => { document.removeEventListener('visibilitychange', hide); release(); };
  }, []);

  async function start() {
    if (disabled || starting || active) return;
    release();
    const run = generation.current;
    setStarting(true); setError(''); setScanned(false);
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access requires HTTPS or localhost. On a phone, open the site using an HTTPS address.');
      }
      const media = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } });
      if (run !== generation.current) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media;
      const player = video.current;
      if (!player) { release(); return; }
      player.srcObject = media;
      await player.play();
      const { default: decode } = await import('jsqr');
      if (run !== generation.current) return;
      setActive(true); setStarting(false);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('This browser cannot read camera frames. Try another browser or use manual entry.');
      const read = () => {
        if (run !== generation.current) return;
        try {
          if (player.readyState >= 2 && player.videoWidth) {
            const scale = Math.min(1, 960 / player.videoWidth);
            canvas.width = Math.round(player.videoWidth * scale);
            canvas.height = Math.round(player.videoHeight * scale);
            context.drawImage(player, 0, 0, canvas.width, canvas.height);
            const frame = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = decode(frame.data, frame.width, frame.height, { inversionAttempts: 'attemptBoth' });
            if (code?.data.trim()) {
              stop(); setScanned(true); onScan(code.data.trim()); return;
            }
          }
          timer.current = setTimeout(read, 180);
        } catch {
          stop(); setError('The camera stopped responding. Start it again or enter the QR token below.');
        }
      };
      read();
    } catch (e) {
      if (run !== generation.current) return;
      stop();
      const name = e instanceof Error ? e.name : '';
      setError(name === 'NotAllowedError' ? 'Camera access was blocked. Open this site\'s browser permissions, allow Camera, then click Start camera again.'
        : name === 'NotFoundError' ? 'No camera was found. Connect a camera or use manual token entry.'
        : name === 'NotReadableError' ? 'Camera is busy or blocked by your device. Close other camera apps and try again.'
        : e instanceof Error ? e.message : 'Unable to start the camera.');
    }
  }

  return <div className="space-y-4">
    <div className="relative h-64 overflow-hidden border border-[#cbb88a]/30 bg-black sm:h-80">
      <video ref={video} muted playsInline aria-label="Live QR scanner camera" className={`h-full w-full object-cover ${active || starting ? '' : 'invisible'}`} />
      {!active && !starting && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center"><Camera className="h-10 w-10 text-[#cbb88a]" /><p className="text-sm text-white">{scanned ? 'QR captured. Review the result below.' : 'Scan a customer\'s QR pass'}</p><p className="max-w-xs text-xs leading-5 text-zinc-400">Start the camera and allow access when your browser asks.</p></div>}
      {active && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="h-44 w-44 border-2 border-[#cbb88a] shadow-[0_0_0_999px_rgba(0,0,0,0.25)]" /><span className="absolute bottom-3 bg-black/70 px-3 py-1 text-xs text-white">Hold the QR code steady inside the frame</span></div>}
    </div>
    {error && <p role="alert" className="border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={disabled || starting || active} onClick={() => void start()} className="ars-button"><Camera className="h-4 w-4" />{starting ? 'Opening camera...' : scanned ? 'Scan next ticket' : 'Start camera'}</button>
      {(active || starting) && <button type="button" onClick={stop} className="ars-button ars-button-secondary"><CameraOff className="h-4 w-4" />Stop camera</button>}
    </div>
  </div>;
}
