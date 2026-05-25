import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

const METERED_USER = 'a2356b6905de4125c48c1199';
const METERED_CRED = 'qiDS7HJT6hxF4GAa';

// Free open-relay credentials (no monthly cap — fallback if dedicated quota runs out)
const OPEN_USER = 'openrelayproject';
const OPEN_CRED  = 'openrelayproject';

const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    // STUN — multiple providers for redundancy
    {
      urls: [
        'stun:stun.relay.metered.ca:80',
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun3.l.google.com:19302',
        'stun:stun4.l.google.com:19302',
        'stun:stun.cloudflare.com:3478',
      ],
    },
    // TURN — dedicated credentials (UDP, TCP, TLS)
    { urls: 'turn:global.relay.metered.ca:80',                 username: METERED_USER, credential: METERED_CRED },
    { urls: 'turn:global.relay.metered.ca:80?transport=tcp',   username: METERED_USER, credential: METERED_CRED },
    { urls: 'turn:global.relay.metered.ca:443',                username: METERED_USER, credential: METERED_CRED },
    { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: METERED_USER, credential: METERED_CRED },
    // TURN — open relay fallback (free, no quota — works when dedicated quota exhausted)
    { urls: 'turn:openrelay.metered.ca:80',                    username: OPEN_USER, credential: OPEN_CRED },
    { urls: 'turn:openrelay.metered.ca:80?transport=tcp',      username: OPEN_USER, credential: OPEN_CRED },
    { urls: 'turn:openrelay.metered.ca:443',                   username: OPEN_USER, credential: OPEN_CRED },
    { urls: 'turns:openrelay.metered.ca:443?transport=tcp',    username: OPEN_USER, credential: OPEN_CRED },
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
};

/** When the page is hidden (app minimised / soft-left), keep the connection
 *  alive for up to 5 minutes so users can return quickly. */
const DISCONNECT_TIMEOUT_MS = 300_000;

const SPEAKING_THRESHOLD = 10;
const SPEAKING_POLL_MS = 120;

export interface VideoRoomRecord {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
  status: string;
  room_type: 'video' | 'audio' | string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VideoParticipantRecord {
  id: string;
  room_id: string;
  user_id: string;
  display_name: string | null;
  is_active: boolean;
  joined_at: string;
  left_at: string | null;
}

interface VideoSignalRecord {
  id: string;
  room_id: string;
  sender_id: string;
  recipient_id: string | null;
  signal_type: 'offer' | 'answer' | 'ice-candidate';
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
  created_at: string;
}

export interface RemoteVideoStream {
  userId: string;
  displayName: string;
  stream: MediaStream;
}

export interface VideoRoomMessageRecord {
  id: string;
  room_id: string;
  user_id: string;
  display_name: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface VideoMessageReactionRecord {
  id: string;
  message_id: string;
  room_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface PeerStat {
  userId: string;
  iceState: string;
  localCandidateType: 'host' | 'srflx' | 'relay' | 'unknown';
  remoteCandidateType: 'host' | 'srflx' | 'relay' | 'unknown';
  rttMs: number | null;
  bytesSent: number;
  bytesReceived: number;
  audioPacketsLost: number;
}

// ── Module-level session persistence ─────────────────────────────────────────
// React refs are garbage-collected on component unmount, which closes every
// RTCPeerConnection they hold. Saving to module-level prevents GC and keeps
// audio/video flowing when the user navigates away without hanging up.
interface PersistedSession {
  roomId: string;
  peerConns: Map<string, RTCPeerConnection>;
  stream: MediaStream;
  origVideoTrack: MediaStreamTrack | null;
  audioCtx: AudioContext | null;
  keepAliveOsc: OscillatorNode | null;
  analysers: Map<string, AnalyserNode>;
  sources: Map<string, MediaStreamAudioSourceNode>;
  initiated: Set<string>;
  pendingIce: Map<string, RTCIceCandidateInit[]>;
  screenTrack: MediaStreamTrack | null;
  remoteStreams: RemoteVideoStream[];
}
let _persist: PersistedSession | null = null;

interface UseAdminVideoRoomOptions {
  roomId?: string;
  userId?: string;
  displayName?: string;
  enabled: boolean;
  canManageRoom?: boolean;
}

export const useAdminVideoRoom = ({
  roomId,
  userId,
  displayName,
  enabled,
  canManageRoom = false,
}: UseAdminVideoRoomOptions) => {
  const [room, setRoom] = useState<VideoRoomRecord | null>(null);
  const [participants, setParticipants] = useState<VideoParticipantRecord[]>([]);
  const [messages, setMessages] = useState<VideoRoomMessageRecord[]>([]);
  const [reactions, setReactions] = useState<VideoMessageReactionRecord[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<RemoteVideoStream[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [startRequested, setStartRequested] = useState(false);
  const [mutedParticipants, setMutedParticipants] = useState<Set<string>>(new Set());
  const [activeSpeakers, setActiveSpeakers] = useState<Set<string>>(new Set());
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'reconnecting'>('good');
  const [peerStats, setPeerStats] = useState<Map<string, PeerStat>>(new Map());

  const channelRef = useRef<any>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const initiatedPeersRef = useRef<Set<string>>(new Set());
  const localStreamRef = useRef<MediaStream | null>(null);
  const joinedRef = useRef(false);
  const pendingIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const participantsRef = useRef<VideoParticipantRecord[]>([]);
  const disconnectTimersRef = useRef<Map<string, number>>(new Map());
  const displayNameRef = useRef(displayName || 'Participant');
  const canManageRoomRef = useRef(canManageRoom);
  const roomRef = useRef<VideoRoomRecord | null>(null);
  const facingModeRef = useRef<'user' | 'environment'>('user');
  const userIdRef = useRef(userId);
  const isPageHiddenRef = useRef(false);
  /** When true, unmount cleanup does full teardown (explicit hang-up / admin end).
   *  Default is false: navigation without raccrocher keeps peers alive. */
  const hardLeaveRef = useRef(false);
  /** Legacy soft-leave flag kept for compatibility. */
  const softLeaveRef = useRef(false);

  // Audio level detection
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodesRef = useRef<Map<string, AnalyserNode>>(new Map());
  const sourceNodesRef = useRef<Map<string, MediaStreamAudioSourceNode>>(new Map());
  const keepAliveNodeRef = useRef<OscillatorNode | null>(null);
  const remoteStreamsRef = useRef<RemoteVideoStream[]>([]);

  const roomType = room?.room_type ?? 'unknown';
  const canShareScreen =
    roomType === 'video' && typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getDisplayMedia);

  const activeParticipants = useMemo(
    () => participants.filter((p) => p.is_active && !p.left_at),
    [participants]
  );

  useEffect(() => {
    participantsRef.current = participants;
    displayNameRef.current = displayName || 'Participant';
    canManageRoomRef.current = canManageRoom;
    roomRef.current = room;
    userIdRef.current = userId;
    remoteStreamsRef.current = remoteStreams;
  }, [participants, displayName, canManageRoom, room, userId, remoteStreams]);

  // ── Auto-restore from soft leave ─────────────────────────────────────────────
  // If a persisted session exists for this room, skip the "Rejoindre" button
  // and restore directly without requiring another user tap.
  useEffect(() => {
    if (!enabled || !roomId || !userId || startRequested) return;
    if (_persist) {
      if (_persist.roomId === roomId) {
        setStartRequested(true);
      } else {
        // Stale persisted session for a different room — release it
        _persist.peerConns.forEach((pc) => pc.close());
        _persist.stream.getTracks().forEach((t) => t.stop());
        _persist = null;
      }
    }
  }, [enabled, roomId, userId, startRequested]);

  // ── Audio level detection ───────────────────────────────────────────────────

  const getOrCreateAudioContext = useCallback((): AudioContext | null => {
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext();
        // Silent keep-alive oscillator so the AudioContext never suspends
        const osc = audioContextRef.current.createOscillator();
        const gain = audioContextRef.current.createGain();
        gain.gain.value = 0.00001;
        osc.connect(gain);
        gain.connect(audioContextRef.current.destination);
        osc.start();
        keepAliveNodeRef.current = osc;
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
      return audioContextRef.current;
    } catch {
      return null;
    }
  }, []);

  const attachAudioAnalyser = useCallback((uid: string, stream: MediaStream) => {
    if (!stream.getAudioTracks().some(t => t.readyState === 'live')) return;
    try {
      const ctx = getOrCreateAudioContext();
      if (!ctx) return;
      if (sourceNodesRef.current.has(uid)) return;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      sourceNodesRef.current.set(uid, source);
      analyserNodesRef.current.set(uid, analyser);
    } catch (e) {
      console.warn('[audio-level] attach failed', e);
    }
  }, [getOrCreateAudioContext]);

  const detachAudioAnalyser = useCallback((uid: string) => {
    try { sourceNodesRef.current.get(uid)?.disconnect(); } catch {}
    sourceNodesRef.current.delete(uid);
    analyserNodesRef.current.delete(uid);
  }, []);

  const pollSpeakers = useCallback(() => {
    if (analyserNodesRef.current.size === 0) return;
    const newSpeakers = new Set<string>();
    analyserNodesRef.current.forEach((analyser, uid) => {
      try {
        const buf = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(buf);
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
        if (avg > SPEAKING_THRESHOLD) newSpeakers.add(uid);
      } catch {}
    });
    setActiveSpeakers(prev => {
      const same = prev.size === newSpeakers.size && [...prev].every(id => newSpeakers.has(id));
      return same ? prev : newSpeakers;
    });
  }, []);

  useEffect(() => {
    if (!isConnected) return;
    const id = setInterval(pollSpeakers, SPEAKING_POLL_MS);
    return () => clearInterval(id);
  }, [isConnected, pollSpeakers]);

  // ── WebRTC stats collection (candidate type, RTT, packet loss) ──────────────

  const collectStats = useCallback(async () => {
    const map = new Map<string, PeerStat>();
    await Promise.all(
      Array.from(peerConnectionsRef.current.entries()).map(async ([pid, pc]) => {
        try {
          const reports = await pc.getStats();
          const candidateMap = new Map<string, string>();
          let localCandidateType: PeerStat['localCandidateType'] = 'unknown';
          let remoteCandidateType: PeerStat['remoteCandidateType'] = 'unknown';
          let rttMs: number | null = null;
          let bytesSent = 0;
          let bytesReceived = 0;
          let audioPacketsLost = 0;

          reports.forEach((r: RTCStats & Record<string, unknown>) => {
            if (r.type === 'local-candidate' || r.type === 'remote-candidate') {
              candidateMap.set(r.id as string, (r.candidateType as string) || 'unknown');
            }
          });

          reports.forEach((r: RTCStats & Record<string, unknown>) => {
            if (r.type === 'candidate-pair' && r.nominated && r.state === 'succeeded') {
              rttMs = r.currentRoundTripTime != null ? Math.round((r.currentRoundTripTime as number) * 1000) : null;
              bytesSent = (r.bytesSent as number) || 0;
              bytesReceived = (r.bytesReceived as number) || 0;
              localCandidateType = (candidateMap.get(r.localCandidateId as string) || 'unknown') as PeerStat['localCandidateType'];
              remoteCandidateType = (candidateMap.get(r.remoteCandidateId as string) || 'unknown') as PeerStat['remoteCandidateType'];
            }
            if (r.type === 'inbound-rtp' && r.kind === 'audio') {
              audioPacketsLost = (r.packetsLost as number) || 0;
            }
          });

          map.set(pid, {
            userId: pid,
            iceState: pc.iceConnectionState,
            localCandidateType,
            remoteCandidateType,
            rttMs,
            bytesSent,
            bytesReceived,
            audioPacketsLost,
          });
        } catch { /* peer may have closed */ }
      })
    );
    if (map.size > 0) setPeerStats(map);
  }, []);

  useEffect(() => {
    if (!isConnected) return;
    void collectStats();
    const id = setInterval(() => void collectStats(), 3000);
    return () => clearInterval(id);
  }, [isConnected, collectStats]);

  // ── MediaSession API — tells the OS to keep audio alive (like WhatsApp) ────

  useEffect(() => {
    if (!isConnected || !('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'Appel en cours',
      artist: roomRef.current?.title || 'Réunion',
      album: 'Voie Vérité Vie',
    });
    navigator.mediaSession.playbackState = 'playing';
    const noop = () => {};
    navigator.mediaSession.setActionHandler('play', noop);
    navigator.mediaSession.setActionHandler('pause', noop);
    return () => {
      navigator.mediaSession.playbackState = 'none';
      try { navigator.mediaSession.setActionHandler('play', null); } catch {}
      try { navigator.mediaSession.setActionHandler('pause', null); } catch {}
    };
  }, [isConnected]);

  // ── Page Visibility — pause disconnect timers when app is hidden ────────────

  useEffect(() => {
    if (!isConnected) return;
    const handleVisibility = () => {
      isPageHiddenRef.current = document.visibilityState === 'hidden';
      if (document.visibilityState === 'hidden') {
        // Resume AudioContext so it doesn't suspend in background
        getOrCreateAudioContext();
      } else {
        // Coming back — try to reconnect any failed peers
        peerConnectionsRef.current.forEach((pc, pid) => {
          if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            // ICE restart
            const uid = userIdRef.current;
            if (!uid) return;
            const shouldOffer = uid.localeCompare(pid) < 0;
            if (shouldOffer) {
              pc.createOffer({ iceRestart: true })
                .then(offer => pc.setLocalDescription(offer))
                .then(() => {
                  if (pc.localDescription) {
                    void db.from('video_room_signals').insert({
                      room_id: roomId,
                      sender_id: uid,
                      recipient_id: pid,
                      signal_type: 'offer',
                      payload: pc.localDescription.toJSON?.() ?? pc.localDescription,
                    });
                  }
                })
                .catch(() => {});
            }
          }
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isConnected, getOrCreateAudioContext, roomId]);

  const getParticipantLabel = useCallback((pid: string) => {
    const p = participantsRef.current.find((e) => e.user_id === pid);
    return p?.display_name || 'Participant';
  }, []);

  // ── Data loading ─────────────────────────────────────────────────────────────

  const loadRoom = useCallback(async () => {
    if (!roomId) return null;
    const { data, error } = await db.from('video_rooms').select('*').eq('id', roomId).single();
    if (error) throw error;
    setRoom(data as VideoRoomRecord);
    return data as VideoRoomRecord;
  }, [roomId]);

  const loadParticipants = useCallback(async () => {
    if (!roomId) return;
    const { data, error } = await db
      .from('video_room_participants')
      .select('*')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });
    if (error) throw error;
    setParticipants((data || []) as VideoParticipantRecord[]);
  }, [roomId]);

  const loadMessages = useCallback(async () => {
    if (!roomId) return;
    const { data, error } = await db
      .from('video_room_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    setMessages((data || []) as VideoRoomMessageRecord[]);
  }, [roomId]);

  const loadReactions = useCallback(async () => {
    if (!roomId) return;
    const { data, error } = await db
      .from('video_message_reactions')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    setReactions((data || []) as VideoMessageReactionRecord[]);
  }, [roomId]);

  // ── Signaling ─────────────────────────────────────────────────────────────

  const sendSignal = useCallback(
    async (
      signalType: VideoSignalRecord['signal_type'],
      payload: RTCSessionDescriptionInit | RTCIceCandidateInit,
      recipientId?: string
    ) => {
      if (!roomId || !userId) return;
      await db.from('video_room_signals').insert({
        room_id: roomId,
        sender_id: userId,
        recipient_id: recipientId ?? null,
        signal_type: signalType,
        payload,
      });
    },
    [roomId, userId]
  );

  const upsertRemoteStream = useCallback(
    (pid: string, stream: MediaStream) => {
      attachAudioAnalyser(pid, stream);
      setRemoteStreams((cur) => {
        const label = getParticipantLabel(pid);
        const existing = cur.find((e) => e.userId === pid);
        if (existing) {
          return cur.map((e) => (e.userId === pid ? { ...e, stream, displayName: label } : e));
        }
        return [...cur, { userId: pid, displayName: label, stream }];
      });
    },
    [attachAudioAnalyser, getParticipantLabel]
  );

  const removePeer = useCallback((pid: string) => {
    const timer = disconnectTimersRef.current.get(pid);
    if (timer) {
      window.clearTimeout(timer);
      disconnectTimersRef.current.delete(pid);
    }
    const pc = peerConnectionsRef.current.get(pid);
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
      peerConnectionsRef.current.delete(pid);
    }
    pendingIceCandidatesRef.current.delete(pid);
    initiatedPeersRef.current.delete(pid);
    detachAudioAnalyser(pid);
    setRemoteStreams((cur) => cur.filter((e) => e.userId !== pid));
  }, [detachAudioAnalyser]);

  const flushPendingIceCandidates = useCallback(async (pid: string, pc: RTCPeerConnection) => {
    const pending = pendingIceCandidatesRef.current.get(pid) || [];
    if (pending.length === 0 || !pc.remoteDescription) return;
    for (const c of pending) {
      try { await pc.addIceCandidate(c); } catch {}
    }
    pendingIceCandidatesRef.current.delete(pid);
  }, []);

  const createPeerConnection = useCallback(
    (pid: string) => {
      const existing = peerConnectionsRef.current.get(pid);
      if (existing) return existing;

      const pc = new RTCPeerConnection(RTC_CONFIGURATION);
      const stream = localStreamRef.current;
      const audioTracks = stream?.getAudioTracks() || [];
      const videoTracks = stream?.getVideoTracks() || [];

      audioTracks.forEach((t) => pc.addTrack(t, stream as MediaStream));
      videoTracks.forEach((t) => pc.addTrack(t, stream as MediaStream));

      if (audioTracks.length === 0) pc.addTransceiver('audio', { direction: 'recvonly' });
      if (roomType !== 'audio' && videoTracks.length === 0) pc.addTransceiver('video', { direction: 'recvonly' });

      pc.onicecandidate = (ev) => {
        if (ev.candidate) void sendSignal('ice-candidate', ev.candidate.toJSON(), pid);
      };

      pc.ontrack = (ev) => {
        // Some browsers/mobile WebViews deliver tracks without a stream — build one manually
        const s = ev.streams[0] ?? new MediaStream([ev.track]);
        upsertRemoteStream(pid, s);
        // Re-notify when a muted track unmutes (e.g. remote mic enabled after join)
        ev.track.onunmute = () => upsertRemoteStream(pid, s);
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        const uid = userIdRef.current;
        const existingTimer = disconnectTimersRef.current.get(pid);

        if (state === 'connected') {
          if (existingTimer) { window.clearTimeout(existingTimer); disconnectTimersRef.current.delete(pid); }
          setConnectionQuality('good');
          return;
        }

        if (state === 'disconnected') {
          setConnectionQuality('poor');
          // Give extra time if page is hidden (user switched app)
          const timeout = isPageHiddenRef.current ? DISCONNECT_TIMEOUT_MS * 2 : DISCONNECT_TIMEOUT_MS;
          if (!existingTimer) {
            const tid = window.setTimeout(() => {
              if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                removePeer(pid);
              }
              disconnectTimersRef.current.delete(pid);
            }, timeout);
            disconnectTimersRef.current.set(pid, tid);
          }
          return;
        }

        if (state === 'failed') {
          setConnectionQuality('reconnecting');
          if (existingTimer) { window.clearTimeout(existingTimer); disconnectTimersRef.current.delete(pid); }
          // Try ICE restart before giving up
          const shouldOffer = uid && uid.localeCompare(pid) < 0;
          if (shouldOffer) {
            pc.createOffer({ iceRestart: true })
              .then(offer => pc.setLocalDescription(offer))
              .then(() => { if (pc.localDescription) void sendSignal('offer', pc.localDescription, pid); })
              .catch(() => removePeer(pid));
          } else {
            // The other side will restart ICE — give it 10 s
            const tid = window.setTimeout(() => {
              if (pc.connectionState === 'failed') removePeer(pid);
              disconnectTimersRef.current.delete(pid);
            }, 10_000);
            disconnectTimersRef.current.set(pid, tid);
          }
          return;
        }

        if (state === 'closed') {
          if (existingTimer) { window.clearTimeout(existingTimer); disconnectTimersRef.current.delete(pid); }
          removePeer(pid);
        }
      };

      peerConnectionsRef.current.set(pid, pc);
      return pc;
    },
    [removePeer, roomType, sendSignal, upsertRemoteStream]
  );

  const createOfferForParticipant = useCallback(
    async (pid: string) => {
      const pc = createPeerConnection(pid);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal('offer', offer, pid);
      initiatedPeersRef.current.add(pid);
    },
    [createPeerConnection, sendSignal]
  );

  const replaceOutgoingVideoTrack = useCallback(async (track: MediaStreamTrack | null) => {
    await Promise.all(
      Array.from(peerConnectionsRef.current.values()).map(async (pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(track);
      })
    );
  }, []);

  const rebuildLocalStream = useCallback((videoTrack: MediaStreamTrack | null) => {
    const s = new MediaStream();
    const audioTracks = localStreamRef.current?.getAudioTracks() || [];
    audioTracks.forEach((t) => s.addTrack(t));
    if (videoTrack) s.addTrack(videoTrack);
    localStreamRef.current = s;
    setLocalStream(s);
  }, []);

  // ── Screen share ─────────────────────────────────────────────────────────────

  const stopScreenShare = useCallback(async () => {
    if (!isScreenSharing) return;
    screenTrackRef.current?.stop();
    screenTrackRef.current = null;
    setIsScreenSharing(false);
    await replaceOutgoingVideoTrack(originalVideoTrackRef.current);
    rebuildLocalStream(originalVideoTrackRef.current);
    setCameraEnabled(Boolean(originalVideoTrackRef.current?.enabled));
  }, [isScreenSharing, rebuildLocalStream, replaceOutgoingVideoTrack]);

  const startScreenShare = useCallback(async () => {
    if (roomType === 'audio') throw new Error('Partage d\'écran indisponible en appel audio.');
    if (!navigator.mediaDevices?.getDisplayMedia) throw new Error('Partage d\'écran indisponible.');
    const ss = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const [st] = ss.getVideoTracks();
    if (!st) throw new Error('Aucun flux écran détecté.');
    screenTrackRef.current = st;
    setIsScreenSharing(true);
    await replaceOutgoingVideoTrack(st);
    rebuildLocalStream(st);
    setCameraEnabled(true);
    st.onended = () => void stopScreenShare();
  }, [rebuildLocalStream, replaceOutgoingVideoTrack, roomType, stopScreenShare]);

  // ── Camera flip ───────────────────────────────────────────────────────────

  const flipCamera = useCallback(async () => {
    if (roomType === 'audio' || isScreenSharing) return;
    const nextMode = facingModeRef.current === 'user' ? 'environment' : 'user';
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: nextMode } },
        audio: false,
      });
      const [newTrack] = newStream.getVideoTracks();
      if (!newTrack) return;
      originalVideoTrackRef.current?.stop();
      originalVideoTrackRef.current = newTrack;
      facingModeRef.current = nextMode;
      await replaceOutgoingVideoTrack(newTrack);
      rebuildLocalStream(newTrack);
      setCameraEnabled(true);
    } catch (err) {
      console.warn('[video-room] Camera flip failed', err);
    }
  }, [roomType, isScreenSharing, replaceOutgoingVideoTrack, rebuildLocalStream]);

  // ── Signal handling ───────────────────────────────────────────────────────

  const handleIncomingSignal = useCallback(
    async (signal: VideoSignalRecord) => {
      if (!userId || signal.sender_id === userId) return;
      if (signal.recipient_id && signal.recipient_id !== userId) return;

      const pc = createPeerConnection(signal.sender_id);

      try {
        if (signal.signal_type === 'offer') {
          // ── Perfect negotiation: handle offer collision (glare) ──────────
          // The peer whose userId is lexicographically LOWER initiates offers
          // (see syncPeers). That peer is "impolite" — it ignores colliding offers.
          // The peer with the HIGHER userId is "polite" — it rolls back its own
          // local offer and accepts the incoming one instead.
          const isPolite = userId.localeCompare(signal.sender_id) > 0;
          const offerCollision = pc.signalingState !== 'stable';

          if (offerCollision && !isPolite) {
            // Impolite peer: drop the incoming offer to avoid glare
            return;
          }

          if (offerCollision && isPolite) {
            // Polite peer: rollback our local offer, accept theirs
            try { await pc.setLocalDescription({ type: 'rollback' }); } catch {}
          }

          await pc.setRemoteDescription(signal.payload as RTCSessionDescriptionInit);
          await flushPendingIceCandidates(signal.sender_id, pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendSignal('answer', answer, signal.sender_id);
        }

        if (signal.signal_type === 'answer') {
          if (pc.signalingState !== 'have-local-offer') return;
          await pc.setRemoteDescription(signal.payload as RTCSessionDescriptionInit);
          await flushPendingIceCandidates(signal.sender_id, pc);
        }

        if (signal.signal_type === 'ice-candidate') {
          const candidate = signal.payload as RTCIceCandidateInit;
          if (!pc.remoteDescription) {
            const q = pendingIceCandidatesRef.current.get(signal.sender_id) || [];
            q.push(candidate);
            pendingIceCandidatesRef.current.set(signal.sender_id, q);
          } else {
            try { await pc.addIceCandidate(candidate); } catch {}
          }
        }
      } catch (err) {
        console.warn('[video-room] Signal handling error', err);
      }

      // Delete processed signal
      await db.from('video_room_signals').delete().eq('id', signal.id);
    },
    [createPeerConnection, flushPendingIceCandidates, sendSignal, userId]
  );

  /** ★ KEY FIX: fetch signals that arrived before our channel subscription ★ */
  const fetchPendingSignals = useCallback(async () => {
    if (!roomId || !userId) return;
    try {
      const { data } = await db
        .from('video_room_signals')
        .select('*')
        .eq('room_id', roomId)
        // Only fetch signals addressed to us (or broadcast signals with no recipient)
        .or(`recipient_id.is.null,recipient_id.eq.${userId}`)
        .order('created_at', { ascending: true });

      for (const sig of data || []) {
        await handleIncomingSignal(sig as VideoSignalRecord);
      }
    } catch (e) {
      console.warn('[video-room] fetchPendingSignals error', e);
    }
  }, [handleIncomingSignal, roomId, userId]);

  const syncPeers = useCallback(async () => {
    if (!userId || !localStreamRef.current) return;
    const others = activeParticipants.filter((p) => p.user_id !== userId);
    const activeIds = new Set(others.map((p) => p.user_id));

    peerConnectionsRef.current.forEach((_, pid) => {
      if (!activeIds.has(pid)) removePeer(pid);
    });

    for (const p of others) {
      if (!peerConnectionsRef.current.has(p.user_id)) {
        createPeerConnection(p.user_id);
      }
      const shouldInit = userId.localeCompare(p.user_id) < 0;
      if (shouldInit && !initiatedPeersRef.current.has(p.user_id)) {
        await createOfferForParticipant(p.user_id);
      }
    }
  }, [activeParticipants, createOfferForParticipant, createPeerConnection, removePeer, userId]);

  // ── Room management ───────────────────────────────────────────────────────

  const activateRoom = useCallback(
    async (currentRoom: VideoRoomRecord) => {
      if (!roomId || !canManageRoomRef.current) return currentRoom;
      const { data, error } = await db
        .from('video_rooms')
        .update({ status: 'live', started_at: currentRoom.started_at || new Date().toISOString(), ended_at: null })
        .eq('id', roomId)
        .select('*')
        .single();
      if (!error && data) { setRoom(data as VideoRoomRecord); return data as VideoRoomRecord; }
      return currentRoom;
    },
    [roomId]
  );

  const joinRoom = useCallback(async () => {
    if (!roomId || !userId) return;
    const { error } = await db.from('video_room_participants').upsert(
      {
        room_id: roomId,
        user_id: userId,
        display_name: displayNameRef.current,
        is_active: true,
        joined_at: new Date().toISOString(),
        left_at: null,
      },
      { onConflict: 'room_id,user_id' }
    );
    if (error) throw error;
    joinedRef.current = true;
  }, [roomId, userId]);

  const leaveRoom = useCallback(async () => {
    if (!roomId || !userId || !joinedRef.current) return;
    await db
      .from('video_room_participants')
      .update({ is_active: false, left_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('user_id', userId);
    joinedRef.current = false;
    setIsConnected(false);
  }, [roomId, userId]);

  const endRoom = useCallback(async () => {
    if (!roomId || !canManageRoomRef.current) return;

    // 1. Broadcast instantly (<100ms) so all active subscribers react immediately
    //    — much faster than Postgres Changes which can take several seconds.
    if (channelRef.current) {
      try {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'session-ended',
          payload: { roomId },
        });
      } catch { /* non-critical */ }
    }

    // 2. Update DB as authoritative source of truth — throw on failure so caller can toast
    const { error: roomErr } = await db
      .from('video_rooms')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', roomId);
    if (roomErr) throw new Error(`Impossible de terminer la réunion : ${roomErr.message}`);
    await db.from('video_room_participants').update({ is_active: false, left_at: new Date().toISOString() }).eq('room_id', roomId);
    setIsConnected(false);
  }, [roomId]);

  // Heartbeat: keeps the participant row alive in the DB while user is in background
  const heartbeat = useCallback(async () => {
    if (!roomId || !userId || !joinedRef.current) return;
    await db
      .from('video_room_participants')
      .update({ is_active: true })
      .eq('room_id', roomId)
      .eq('user_id', userId);
  }, [roomId, userId]);

  /** Call before navigating away to keep audio flowing to remote peers (WhatsApp-style).
   *  This is now the DEFAULT behaviour on unmount — calling this is optional. */
  const softLeave = useCallback(() => {
    softLeaveRef.current = true;
  }, []);

  /** Call when user explicitly hangs up or admin ends the room.
   *  This is the ONLY scenario that fully disconnects peers and marks the user as left. */
  const triggerHardLeave = useCallback(() => {
    hardLeaveRef.current = true;
  }, []);

  // ── Join request ──────────────────────────────────────────────────────────

  const requestJoin = useCallback(async () => {
    if (!enabled || !roomId || !userId || isJoining || startRequested) return;
    setIsJoining(true);
    setLoading(true);
    setMediaError(null);

    try {
      const currentRoom = room || (await loadRoom());
      if (!currentRoom) throw new Error('Salle introuvable.');

      const shouldUseVideo = currentRoom.room_type !== 'audio';
      let media: MediaStream | null = null;

      try {
        media = await navigator.mediaDevices.getUserMedia({
          video: shouldUseVideo ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 1,
          },
        });
      } catch {
        if (shouldUseVideo) {
          try {
            media = await navigator.mediaDevices.getUserMedia({
              audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
              video: false,
            });
            setMediaError('Caméra indisponible — appel audio uniquement.');
          } catch { media = null; }
        }
      }

      if (!media) {
        localStreamRef.current = new MediaStream();
        originalVideoTrackRef.current = null;
        setLocalStream(localStreamRef.current);
        setMicEnabled(false);
        setCameraEnabled(false);
        setMediaError(
          'Micro/caméra refusés par le navigateur. Vérifiez les autorisations dans les paramètres de votre navigateur.'
        );
        setStartRequested(true);
        return;
      }

      originalVideoTrackRef.current = media.getVideoTracks()[0] || null;
      localStreamRef.current = media;
      setLocalStream(media);

      // Attach audio analyser for the local stream
      if (userId) attachAudioAnalyser(userId, media);

      setMicEnabled(media.getAudioTracks().some((t) => t.enabled));
      setCameraEnabled(currentRoom.room_type !== 'audio' && Boolean(originalVideoTrackRef.current?.enabled));
      setStartRequested(true);
    } catch (err) {
      console.error('[video-room] requestJoin failed', err);
      setMediaError('Impossible d\'activer le micro ou la caméra.');
    } finally {
      setIsJoining(false);
      setLoading(false);
    }
  }, [attachAudioAnalyser, enabled, isJoining, loadRoom, room, roomId, startRequested, userId]);

  // ── Toggle controls ───────────────────────────────────────────────────────

  const toggleMicrophone = useCallback(() => {
    const tracks = localStreamRef.current?.getAudioTracks() || [];
    const next = !micEnabled;
    tracks.forEach((t) => { t.enabled = next; });
    setMicEnabled(next);
  }, [micEnabled]);

  const toggleCamera = useCallback(() => {
    if (roomType === 'audio') return;
    const vt = originalVideoTrackRef.current;
    if (!vt) return;
    const next = !cameraEnabled;
    vt.enabled = next;
    if (!isScreenSharing) {
      const live = localStreamRef.current?.getVideoTracks()[0];
      if (live) live.enabled = next;
    }
    setCameraEnabled(next);
  }, [cameraEnabled, isScreenSharing, roomType]);

  // ── Admin mute ────────────────────────────────────────────────────────────

  const muteParticipant = useCallback((pid: string) => {
    setMutedParticipants((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid); else next.add(pid);
      return next;
    });
  }, []);

  // ── Messages CRUD ─────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (content: string) => {
      if (!roomId || !userId || !content.trim()) return;
      const { error } = await db.from('video_room_messages').insert({
        room_id: roomId,
        user_id: userId,
        display_name: displayNameRef.current,
        content: content.trim(),
      });
      if (error) throw error;
    },
    [roomId, userId]
  );

  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      if (!roomId || !userId || !newContent.trim()) return;
      const { error } = await db
        .from('video_room_messages')
        .update({ content: newContent.trim(), updated_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    [roomId, userId]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!roomId || !userId) return;
      const { error } = await db
        .from('video_room_messages')
        .delete()
        .eq('id', messageId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    [roomId, userId]
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!roomId || !userId) return;
      const existing = reactions.find(
        (r) => r.message_id === messageId && r.user_id === userId && r.emoji === emoji
      );
      if (existing) {
        await db.from('video_message_reactions').delete().eq('id', existing.id);
        return;
      }
      await db.from('video_message_reactions').insert({
        room_id: roomId,
        message_id: messageId,
        user_id: userId,
        emoji,
      });
    },
    [reactions, roomId, userId]
  );

  // ── Preload room ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!enabled || !roomId || !userId) { setLoading(false); return; }
    let active = true;
    const preload = async () => {
      try { await loadRoom(); } catch {}
      finally { if (active && !startRequested) setLoading(false); }
    };
    if (!startRequested) void preload();
    return () => { active = false; };
  }, [enabled, loadRoom, roomId, startRequested, userId]);

  // ── Main room lifecycle ───────────────────────────────────────────────────

  useEffect(() => {
    if (!enabled || !roomId || !userId || !startRequested) return;
    let active = true;

    const startRoom = async () => {
      setLoading(true);
      try {
        const currentRoom = roomRef.current || (await loadRoom());
        if (!currentRoom) throw new Error('Salle introuvable.');

        // ── Restore from soft leave ──────────────────────────────────────────
        // We have a module-level snapshot of all WebRTC state from the previous
        // soft leave. Restore refs, update React state, re-subscribe to signaling.
        if (_persist && _persist.roomId === roomId) {
          const saved = _persist;
          _persist = null;

          peerConnectionsRef.current = saved.peerConns;
          localStreamRef.current = saved.stream;
          originalVideoTrackRef.current = saved.origVideoTrack;
          audioContextRef.current = saved.audioCtx;
          keepAliveNodeRef.current = saved.keepAliveOsc;
          analyserNodesRef.current = saved.analysers;
          sourceNodesRef.current = saved.sources;
          initiatedPeersRef.current = saved.initiated;
          pendingIceCandidatesRef.current = saved.pendingIce;
          screenTrackRef.current = saved.screenTrack;

          setLocalStream(saved.stream);
          setRemoteStreams(saved.remoteStreams);
          setMicEnabled(saved.stream.getAudioTracks().some((t) => t.enabled));
          setCameraEnabled(currentRoom.room_type !== 'audio' && Boolean(saved.origVideoTrack?.enabled));
          setIsScreenSharing(Boolean(saved.screenTrack && saved.screenTrack.readyState === 'live'));

          // Re-activate participant row without resetting joined_at
          if (userId) {
            await db
              .from('video_room_participants')
              .update({ is_active: true, left_at: null })
              .eq('room_id', roomId)
              .eq('user_id', userId);
            joinedRef.current = true;
          }

          await Promise.all([loadParticipants(), loadMessages(), loadReactions()]);

          if (!channelRef.current) {
            const channel = db
              .channel(`video-room:${roomId}`)
              .on('postgres_changes', { event: '*', schema: 'public', table: 'video_room_participants', filter: `room_id=eq.${roomId}` }, () => void loadParticipants())
              .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'video_room_signals', filter: `room_id=eq.${roomId}` }, (sig: { new: VideoSignalRecord }) => void handleIncomingSignal(sig.new))
              .on('postgres_changes', { event: '*', schema: 'public', table: 'video_room_messages', filter: `room_id=eq.${roomId}` }, () => void loadMessages())
              .on('postgres_changes', { event: '*', schema: 'public', table: 'video_message_reactions', filter: `room_id=eq.${roomId}` }, () => void loadReactions())
              .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'video_rooms', filter: `id=eq.${roomId}` }, (ev: { new: VideoRoomRecord }) => setRoom(ev.new))
              .on('broadcast', { event: 'session-ended' }, () => {
                setRoom((prev) => (prev ? { ...prev, status: 'ended' } : prev));
              })
              .subscribe(async (status: string) => {
                if (status === 'SUBSCRIBED') await fetchPendingSignals();
              });
            channelRef.current = channel;
          }

          if (active) setIsConnected(true);
          return;
        }

        // ── Normal join path ─────────────────────────────────────────────────
        if (!localStreamRef.current) {
          localStreamRef.current = new MediaStream();
          setLocalStream(localStreamRef.current);
          originalVideoTrackRef.current = null;
          setMicEnabled(false);
          setCameraEnabled(false);
        }

        await joinRoom();
        await activateRoom(currentRoom);
        await Promise.all([loadParticipants(), loadMessages(), loadReactions()]);

        if (!channelRef.current) {
          const channel = db
            .channel(`video-room:${roomId}`)
            .on('postgres_changes', {
              event: '*', schema: 'public', table: 'video_room_participants',
              filter: `room_id=eq.${roomId}`,
            }, () => void loadParticipants())
            .on('postgres_changes', {
              event: 'INSERT', schema: 'public', table: 'video_room_signals',
              filter: `room_id=eq.${roomId}`,
            }, (p: { new: VideoSignalRecord }) => void handleIncomingSignal(p.new))
            .on('postgres_changes', {
              event: '*', schema: 'public', table: 'video_room_messages',
              filter: `room_id=eq.${roomId}`,
            }, () => void loadMessages())
            .on('postgres_changes', {
              event: '*', schema: 'public', table: 'video_message_reactions',
              filter: `room_id=eq.${roomId}`,
            }, () => void loadReactions())
            .on('postgres_changes', {
              event: 'UPDATE', schema: 'public', table: 'video_rooms',
              filter: `id=eq.${roomId}`,
            }, (p: { new: VideoRoomRecord }) => setRoom(p.new))
            // ── Instant broadcast: admin ended the session ─────────────────
            // This fires in <100ms for all connected clients, much faster than
            // Postgres Changes (which can take several seconds to propagate).
            .on('broadcast', { event: 'session-ended' }, () => {
              setRoom((prev) => prev ? { ...prev, status: 'ended' } : prev);
            })
            .subscribe(async (status: string) => {
              if (status === 'SUBSCRIBED') {
                // ★ KEY FIX: now that we're subscribed, fetch any signals
                //   that were sent BEFORE our subscription was ready.
                await fetchPendingSignals();
              }
            });
          channelRef.current = channel;
        }

        if (active) setIsConnected(true);
      } catch (err) {
        console.error('[video-room] startRoom failed', err);
        if (active) setMediaError('Impossible de rejoindre la salle. Vérifiez votre connexion.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void startRoom();

    return () => {
      active = false;
      // Always remove the Supabase realtime channel
      if (channelRef.current) db.removeChannel(channelRef.current);
      channelRef.current = null;
      disconnectTimersRef.current.forEach((t) => window.clearTimeout(t));
      disconnectTimersRef.current.clear();

      const isHard = hardLeaveRef.current;
      hardLeaveRef.current = false; // reset for next mount
      softLeaveRef.current = false;

      if (!isHard) {
        // ── Soft leave: save all WebRTC state to module-level so GC doesn't
        //    close the RTCPeerConnections while the user browses other pages.
        //    Connections are restored seamlessly when the user comes back.
        if (localStreamRef.current && roomId) {
          _persist = {
            roomId,
            peerConns: peerConnectionsRef.current,
            stream: localStreamRef.current,
            origVideoTrack: originalVideoTrackRef.current,
            audioCtx: audioContextRef.current,
            keepAliveOsc: keepAliveNodeRef.current,
            analysers: analyserNodesRef.current,
            sources: sourceNodesRef.current,
            initiated: initiatedPeersRef.current,
            pendingIce: pendingIceCandidatesRef.current,
            screenTrack: screenTrackRef.current,
            remoteStreams: remoteStreamsRef.current,
          };
        }
        return;
      }

      // ── Hard leave (explicit raccrocher or admin terminer): full cleanup ─
      void leaveRoom();
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      initiatedPeersRef.current.clear();
      pendingIceCandidatesRef.current.clear();
      setRemoteStreams([]);
      screenTrackRef.current?.stop();
      screenTrackRef.current = null;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      originalVideoTrackRef.current = null;
      setLocalStream(null);
      setIsScreenSharing(false);
      setIsConnected(false);
      setStartRequested(false);
      setActiveSpeakers(new Set());
      analyserNodesRef.current.clear();
      sourceNodesRef.current.clear();
      try { keepAliveNodeRef.current?.stop(); } catch {}
      keepAliveNodeRef.current = null;
      try { audioContextRef.current?.close(); } catch {}
      audioContextRef.current = null;
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'none';
        try { navigator.mediaSession.setActionHandler('play', null); } catch {}
        try { navigator.mediaSession.setActionHandler('pause', null); } catch {}
      }
    };
  }, [
    activateRoom, enabled, fetchPendingSignals, handleIncomingSignal,
    joinRoom, leaveRoom, loadMessages, loadParticipants, loadReactions,
    loadRoom, roomId, startRequested, userId,
  ]);

  // ── Sync peers on participant changes ─────────────────────────────────────

  useEffect(() => {
    if (!enabled || !startRequested || !localStreamRef.current) return;
    void syncPeers();
  }, [activeParticipants, enabled, startRequested, syncPeers]);

  return {
    room,
    roomType,
    participants: activeParticipants,
    remoteStreams,
    messages,
    reactions,
    localStream,
    loading,
    mediaError,
    micEnabled,
    cameraEnabled,
    isScreenSharing,
    isJoining,
    isConnected,
    canShareScreen,
    mutedParticipants,
    activeSpeakers,
    connectionQuality,
    peerStats,
    requestJoin,
    toggleMicrophone,
    toggleCamera,
    flipCamera,
    startScreenShare,
    stopScreenShare,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    muteParticipant,
    leaveRoom,
    endRoom,
    heartbeat,
    softLeave,
    triggerHardLeave,
  };
};
