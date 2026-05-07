import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

export interface ActiveCallInfo {
  roomId: string;
  roomTitle: string;
  roomType: string;
  isAdmin: boolean;
  startedAt: Date;
}

interface CallSessionContextValue {
  activeCall: ActiveCallInfo | null;
  isConnected: boolean;
  isMicEnabled: boolean;
  participantCount: number;
  startCall: (info: ActiveCallInfo) => void;
  endCallSession: () => void;
  notifyConnected: (connected: boolean) => void;
  notifyMic: (enabled: boolean) => void;
  notifyParticipants: (count: number) => void;
  setSoftLeaveCallback: (fn: (() => void) | null) => void;
  getHangUpFn: () => (() => Promise<void>) | null;
  setHangUpFn: (fn: (() => Promise<void>) | null) => void;
  getMicToggleFn: () => (() => void) | null;
  setMicToggleFn: (fn: (() => void) | null) => void;
}

const CallSessionContext = createContext<CallSessionContextValue>({
  activeCall: null,
  isConnected: false,
  isMicEnabled: true,
  participantCount: 0,
  startCall: () => {},
  endCallSession: () => {},
  notifyConnected: () => {},
  notifyMic: () => {},
  notifyParticipants: () => {},
  setSoftLeaveCallback: () => {},
  getHangUpFn: () => null,
  setHangUpFn: () => {},
  getMicToggleFn: () => null,
  setMicToggleFn: () => {},
});

export const useCallSession = () => useContext(CallSessionContext);

export const CallSessionProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeCall, setActiveCall] = useState<ActiveCallInfo | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [participantCount, setParticipantCount] = useState(0);

  const softLeaveCallbackRef = useRef<(() => void) | null>(null);
  const hangUpFnRef = useRef<(() => Promise<void>) | null>(null);
  const micToggleFnRef = useRef<(() => void) | null>(null);

  const startCall = useCallback((info: ActiveCallInfo) => {
    setActiveCall(info);
    setIsConnected(false);
    setIsMicEnabled(true);
    setParticipantCount(0);
  }, []);

  const endCallSession = useCallback(() => {
    setActiveCall(null);
    setIsConnected(false);
    setParticipantCount(0);
    softLeaveCallbackRef.current = null;
    hangUpFnRef.current = null;
    micToggleFnRef.current = null;
  }, []);

  const notifyConnected = useCallback((v: boolean) => setIsConnected(v), []);
  const notifyMic = useCallback((v: boolean) => setIsMicEnabled(v), []);
  const notifyParticipants = useCallback((n: number) => setParticipantCount(n), []);
  const setSoftLeaveCallback = useCallback((fn: (() => void) | null) => { softLeaveCallbackRef.current = fn; }, []);
  const getHangUpFn = useCallback(() => hangUpFnRef.current, []);
  const setHangUpFn = useCallback((fn: (() => Promise<void>) | null) => { hangUpFnRef.current = fn; }, []);
  const getMicToggleFn = useCallback(() => micToggleFnRef.current, []);
  const setMicToggleFn = useCallback((fn: (() => void) | null) => { micToggleFnRef.current = fn; }, []);

  return (
    <CallSessionContext.Provider value={{
      activeCall,
      isConnected,
      isMicEnabled,
      participantCount,
      startCall,
      endCallSession,
      notifyConnected,
      notifyMic,
      notifyParticipants,
      setSoftLeaveCallback,
      getHangUpFn,
      setHangUpFn,
      getMicToggleFn,
      setMicToggleFn,
    }}>
      {children}
    </CallSessionContext.Provider>
  );
};
