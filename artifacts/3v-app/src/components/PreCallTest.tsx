import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mic, MicOff, Wifi, CheckCircle2, AlertCircle, Loader2, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PreCallTestProps {
  open: boolean;
  onClose: () => void;
  onJoin: () => void;
}

type TestState = 'idle' | 'testing-mic' | 'testing-latency' | 'done' | 'error';

const STUN_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:stun.cloudflare.com:3478',
];

const PreCallTest = ({ open, onClose, onJoin }: PreCallTestProps) => {
  const [state, setState] = useState<TestState>('idle');
  const [micLevel, setMicLevel] = useState(0);
  const [micOk, setMicOk] = useState<boolean | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [latencyOk, setLatencyOk] = useState<boolean | null>(null);
  const [micLabel, setMicLabel] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(5);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const pollRef = useRef<number | null>(null);
  const peakRef = useRef(0);

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    try { audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;
    analyserRef.current = null;
    peakRef.current = 0;
  }, []);

  useEffect(() => {
    if (!open) { cleanup(); setState('idle'); setMicOk(null); setLatency(null); setLatencyOk(null); setErrorMsg(''); }
  }, [open, cleanup]);

  const testMicrophone = async () => {
    setState('testing-mic');
    setMicOk(null);
    peakRef.current = 0;
    setCountdown(5);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      streamRef.current = stream;
      const label = stream.getAudioTracks()[0]?.label || 'Microphone';
      setMicLabel(label);

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      analyserRef.current = analyser;

      let timeLeft = 5;
      const tick = setInterval(() => {
        if (!analyserRef.current) { clearInterval(tick); return; }
        const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(buf);
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
        const pct = Math.min(100, (avg / 40) * 100);
        setMicLevel(pct);
        if (avg > peakRef.current) peakRef.current = avg;
        timeLeft -= 1 / 10;
        setCountdown(Math.max(0, Math.ceil(timeLeft)));
        if (timeLeft <= 0) {
          clearInterval(tick);
          const ok = peakRef.current > 5;
          setMicOk(ok);
          setMicLevel(0);
          testLatency();
        }
      }, 100);
      pollRef.current = tick as any;
    } catch (err: any) {
      setErrorMsg('Microphone refusé. Vérifiez les autorisations dans votre navigateur.');
      setState('error');
    }
  };

  const testLatency = async () => {
    setState('testing-latency');
    setLatency(null);
    try {
      const results: number[] = [];
      for (const server of STUN_SERVERS) {
        try {
          const t0 = performance.now();
          const pc = new RTCPeerConnection({ iceServers: [{ urls: server }] });
          pc.createDataChannel('test');
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => { pc.close(); resolve(); }, 3000);
            pc.onicecandidate = (ev) => {
              if (ev.candidate) {
                const rtt = Math.round(performance.now() - t0);
                results.push(rtt);
                clearTimeout(timer);
                pc.close();
                resolve();
              }
            };
            pc.onicecandidateerror = () => { clearTimeout(timer); pc.close(); resolve(); };
          });
        } catch {}
      }
      if (results.length > 0) {
        const avg = Math.round(results.reduce((a, b) => a + b, 0) / results.length);
        setLatency(avg);
        setLatencyOk(avg < 300);
      } else {
        setLatency(null);
        setLatencyOk(null);
      }
    } catch {}
    cleanup();
    setState('done');
  };

  const getLatencyLabel = (ms: number | null) => {
    if (ms === null) return { label: 'Inconnue', color: 'text-zinc-400' };
    if (ms < 80) return { label: `${ms}ms — Excellent`, color: 'text-green-400' };
    if (ms < 200) return { label: `${ms}ms — Bon`, color: 'text-green-400' };
    if (ms < 400) return { label: `${ms}ms — Acceptable`, color: 'text-yellow-400' };
    return { label: `${ms}ms — Faible`, color: 'text-red-400' };
  };

  const lat = getLatencyLabel(latency);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { cleanup(); onClose(); } }}>
      <DialogContent className="max-w-sm bg-zinc-900 border-zinc-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-semibold">Test avant appel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {state === 'idle' && (
            <div className="text-center py-4 space-y-3">
              <p className="text-zinc-400 text-sm">Vérifiez que votre micro et votre connexion fonctionnent avant de rejoindre.</p>
              <Button onClick={testMicrophone} size="lg" className="w-full gap-2">
                <Mic className="h-4 w-4" /> Lancer le test
              </Button>
            </div>
          )}

          {(state === 'testing-mic') && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Test du microphone… ({countdown}s restantes)
              </div>
              <p className="text-xs text-zinc-500">{micLabel}</p>
              <div className="space-y-1">
                <p className="text-xs text-zinc-400">Parlez maintenant pour tester votre micro :</p>
                <div className="h-4 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-100"
                    style={{ width: `${micLevel}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-zinc-600">
                  <span>Silence</span><span>Fort</span>
                </div>
              </div>
            </div>
          )}

          {state === 'testing-latency' && (
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Test de connexion en cours…
            </div>
          )}

          {state === 'done' && (
            <div className="space-y-3">
              <div className={cn(
                'flex items-center gap-3 rounded-lg p-3 border',
                micOk ? 'border-green-500/40 bg-green-500/10' : 'border-red-500/40 bg-red-500/10'
              )}>
                {micOk ? <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" /> : <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />}
                <div>
                  <p className="text-sm font-medium text-white">{micOk ? 'Microphone opérationnel' : 'Microphone non détecté'}</p>
                  <p className="text-xs text-zinc-400">{micLabel || (micOk ? 'Son détecté' : 'Parlez plus fort ou vérifiez votre micro')}</p>
                </div>
              </div>

              <div className={cn(
                'flex items-center gap-3 rounded-lg p-3 border',
                latencyOk !== false ? 'border-green-500/40 bg-green-500/10' : 'border-yellow-500/40 bg-yellow-500/10'
              )}>
                <Wifi className={cn('h-5 w-5 shrink-0', latencyOk !== false ? 'text-green-400' : 'text-yellow-400')} />
                <div>
                  <p className="text-sm font-medium text-white">Latence réseau</p>
                  <p className={cn('text-xs', lat.color)}>{lat.label}</p>
                </div>
              </div>

              {(!micOk) && (
                <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-lg p-2">
                  ⚠️ Votre micro n'a pas été détecté. Vous pouvez quand même rejoindre mais les autres ne vous entendront peut-être pas.
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={testMicrophone} className="flex-1 border-zinc-700 text-zinc-300">
                  Retester
                </Button>
                <Button size="sm" onClick={() => { cleanup(); onJoin(); }} className="flex-1 gap-1">
                  <Volume2 className="h-3.5 w-3.5" /> Rejoindre
                </Button>
              </div>
            </div>
          )}

          {state === 'error' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg p-3 border border-red-500/40 bg-red-500/10">
                <MicOff className="h-5 w-5 text-red-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">Erreur</p>
                  <p className="text-xs text-zinc-400">{errorMsg}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setState('idle'); setErrorMsg(''); }} className="flex-1 border-zinc-700 text-zinc-300">
                  Retour
                </Button>
                <Button size="sm" onClick={() => { cleanup(); onJoin(); }} className="flex-1">
                  Rejoindre quand même
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PreCallTest;
