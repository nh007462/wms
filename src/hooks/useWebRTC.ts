'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { toneManager } from '@/lib/toneManager';
import { useRouter } from 'next/navigation';

interface Peer {
  id: string;
  nickname: string;
  pc: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
  instrument: string;
  remoteStream?: MediaStream;
}
interface Participant {
  id: string;
  nickname: string;
  instrument: string;
}

const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export function useWebRTC(roomId: string | null, isReady: boolean) {
  const router = useRouter();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const peersRef = useRef<Record<string, Peer>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [localId, setLocalId] = useState<string | null>(null);
  const [localNickname, setLocalNickname] = useState('');
  const [remoteStreams, setRemoteStreams] = useState<MediaStream[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const getWebSocketURL = () => {
    if (typeof window === 'undefined') return '';
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${window.location.host}/ws`;
  }

  const broadcastDataChannelMessage = useCallback((message: object) => {
    Object.values(peersRef.current).forEach(peer => {
      if (peer.dataChannel && peer.dataChannel.readyState === 'open') {
        peer.dataChannel.send(JSON.stringify(message));
      }
    });
  }, []);

  const handleUserLeft = useCallback((id: string) => {
    const peer = peersRef.current[id];
    if (peer) {
      peer.pc.close();
      if (peer.remoteStream) {
        setRemoteStreams(prev => prev.filter(s => s.id !== peer.remoteStream!.id));
      }
      delete peersRef.current[id];
    }
    setParticipants(prev => prev.filter(p => p.id !== id));
  }, []);

  const createPeerConnection = useCallback((peerId: string, peerNickname: string, instrument: string, initiator: boolean) => {
    if (peersRef.current[peerId]) return peersRef.current[peerId].pc;
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[peerId] = { id: peerId, nickname: peerNickname, pc, instrument };

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) wsRef.current.send(JSON.stringify({ type: 'signal', payload: { to: peerId, signal: { type: 'candidate', candidate: event.candidate } } }));
    };
    pc.ontrack = (event) => {
      if(peersRef.current[peerId]) {
        peersRef.current[peerId].remoteStream = event.streams[0];
        setRemoteStreams(prev => [...prev.filter(s => s.id !== event.streams[0].id), event.streams[0]]);
      }
    };
    pc.oniceconnectionstatechange = () => {
      if (['failed', 'disconnected', 'closed'].includes(pc.iceConnectionState)) handleUserLeft(peerId);
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
    }

    const setupDataChannel = (dc: RTCDataChannel) => {
      dc.onopen = () => setIsConnected(true);
      dc.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          switch(data.type) {
            case 'noteOn': toneManager.noteOn(data.instrument, data.note); break;
            case 'noteOff': toneManager.noteOff(data.instrument, data.note); break;
            case 'instrumentChange':
              setParticipants(prev => prev.map(p => p.id === peerId ? { ...p, instrument: data.instrument } : p));
              break;
          }
        } catch (e) { console.error("Error handling data channel message", e); }
      };
      if(peersRef.current[peerId]) peersRef.current[peerId].dataChannel = dc;
    };

    if (initiator) {
      const dc = pc.createDataChannel('data');
      setupDataChannel(dc);
    } else {
      pc.ondatachannel = (event) => setupDataChannel(event.channel);
    }
    
    return pc;
  }, [handleUserLeft]);

  useEffect(() => {
    if (!isReady || !roomId) return;
    const nickname = localStorage.getItem('nickname');
    if (!nickname) { router.push('/rooms'); return; }
    setLocalNickname(nickname);
    
    const ws = new WebSocket(getWebSocketURL());
    wsRef.current = ws;

    ws.onopen = () => ws.send(JSON.stringify({ type: 'join-room', payload: { roomId, nickname } }));
    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      const { type, payload } = data;
      switch(type) {
        case 'room-full':
          alert('このルームは満員です。');
          router.push('/rooms');
          break;
        case 'join-success':
          setLocalId(payload.id);
          setParticipants(payload.users);
          if (payload.users.length === 0) setIsConnected(true);
          payload.users.forEach((user: Participant) => {
            const pc = createPeerConnection(user.id, user.nickname, user.instrument, true);
            pc.createOffer()
              .then(offer => pc.setLocalDescription(offer))
              .then(() => {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                  wsRef.current.send(JSON.stringify({ type: 'signal', payload: { to: user.id, signal: pc.localDescription } }));
                }
              });
          });
          break;
        case 'user-joined':
          setParticipants(prev => [...prev, payload]);
          break;
        case 'signal':
          const { from, fromNickname, signal } = payload;
          let pc = peersRef.current[from]?.pc;
          if (signal.type === 'offer') {
            if(!pc) pc = createPeerConnection(from, fromNickname, 'piano', false);
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'signal', payload: { to: from, signal: pc.localDescription }}));
            }
          } else if (signal.type === 'answer') {
            if(pc) await pc.setRemoteDescription(new RTCSessionDescription(signal));
          } else if (signal.type === 'candidate') {
            if(pc && pc.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
          break;
        case 'user-left':
          handleUserLeft(payload.id);
          break;
      }
    };

    return () => {
      if(wsRef.current) wsRef.current.close();
      Object.values(peersRef.current).forEach(peer => peer.pc.close());
      peersRef.current = {};
      if (toneManager && typeof toneManager.toggleMic === 'function') {
        toneManager.toggleMic(false);
      }
    };
  }, [roomId, isReady, createPeerConnection, handleUserLeft, router]);

  // ★★★ ここが修正点 ★★★
  const toggleMic = useCallback(async (enabled: boolean): Promise<boolean> => {
    // toneManager.toggleMicは MediaStream | null を返す
    const stream = await toneManager.toggleMic(enabled);
    localStreamRef.current = stream;

    for (const peer of Object.values(peersRef.current)) {
      const senders = peer.pc.getSenders().filter(s => s.track?.kind === 'audio');
      senders.forEach(sender => peer.pc.removeTrack(sender));
      if (enabled && stream) {
        stream.getAudioTracks().forEach(track => peer.pc.addTrack(track, stream));
      }
    }
    // !!stream で streamオブジェクトの有無をbooleanに変換して返す
    return !!stream;
  }, []);

  return { participants, localNickname, localId, broadcastDataChannelMessage, toggleMic, remoteStreams, isConnected };
}