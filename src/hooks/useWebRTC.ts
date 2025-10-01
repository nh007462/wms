'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { toneManager } from '@/lib/toneManager';

// ピア接続の状態を管理する型定義
interface Peer {
  id: string;
  nickname: string;
  pc: RTCPeerConnection;
  dataChannel: RTCDataChannel;
  instrument?: string;
  stream?: MediaStream;
}
interface Participant {
  id: string;
  nickname: string;
  instrument?: string;
}

const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export function useWebRTC(roomId: string | null) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const peersRef = useRef<Record<string, Peer>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const localIdRef = useRef<string | null>(null);
  const [localNickname, setLocalNickname] = useState('');
  
  // WebSocketサーバーのURLを動的に決定
  const getWebSocketURL = () => {
    if (typeof window === 'undefined') return '';
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${window.location.host}`;
  }

  // データチャネル経由でメッセージを送信
  const broadcastDataChannelMessage = useCallback((message: object) => {
    Object.values(peersRef.current).forEach(peer => {
      if (peer.dataChannel && peer.dataChannel.readyState === 'open') {
        peer.dataChannel.send(JSON.stringify(message));
      }
    });
  }, []);

  // ピア接続を作成する関数
  const createPeerConnection = useCallback((peerId: string, peerNickname: string, initiator: boolean) => {
    console.log(`Creating peer connection to ${peerId} (initiator: ${initiator})`);
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    // ICE候補が見つかった時の処理
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'signal',
          payload: { to: peerId, signal: { type: 'candidate', candidate: event.candidate } },
        }));
      }
    };

    // リモートストリームが追加された時の処理
    pc.ontrack = (event) => {
      console.log(`Received remote stream from ${peerId}`);
      peersRef.current[peerId].stream = event.streams[0];
      // ここでUIを更新するロジックが必要な場合は、Stateを使う
    };

    // ローカルのマイクストリームをピア接続に追加
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // データチャネルのセットアップ
    const setupDataChannel = (dc: RTCDataChannel) => {
      dc.onopen = () => console.log(`Data channel with ${peerId} opened.`);
      dc.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'note') {
            toneManager.playNote(data.instrument, data.note, data.duration);
        } else if (data.type === 'instrumentChange') {
            peersRef.current[peerId].instrument = data.instrument;
            setParticipants(prev => prev.map(p => p.id === peerId ? { ...p, instrument: data.instrument } : p));
        }
      };
    };

    if (initiator) {
      const dc = pc.createDataChannel('data');
      setupDataChannel(dc);
    } else {
      pc.ondatachannel = (event) => {
        console.log(`Received data channel from ${peerId}`);
        const dc = event.channel;
        setupDataChannel(dc);
        peersRef.current[peerId].dataChannel = dc;
      };
    }

    peersRef.current[peerId] = { id: peerId, nickname: peerNickname, pc, dataChannel: null! };
    return pc;
  }, []);


  // WebSocket接続の初期化とクリーンアップ
  useEffect(() => {
    if (!roomId) return;
    const nickname = localStorage.getItem('nickname');
    if (!nickname) {
        window.location.href = '/rooms';
        return;
    }
    setLocalNickname(nickname);
    
    const ws = new WebSocket(getWebSocketURL());
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      ws.send(JSON.stringify({ type: 'join-room', payload: { roomId, nickname } }));
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      const { type, payload } = data;

      switch(type) {
        case 'all-users': {
            localIdRef.current = ws.id; // サーバーから割り当てられたID
            const users: {id: string, nickname: string}[] = payload;
            console.log('Existing users:', users);
            users.forEach(user => {
                const pc = createPeerConnection(user.id, user.nickname, true);
                pc.createOffer()
                  .then(offer => pc.setLocalDescription(offer))
                  .then(() => {
                    ws.send(JSON.stringify({ 
                        type: 'signal', 
                        payload: { to: user.id, signal: pc.localDescription }
                    }));
                  });
            });
            setParticipants(users);
            break;
        }
        case 'user-joined': {
            console.log('User joined:', payload);
            setParticipants(prev => [...prev, payload]);
            break;
        }
        case 'signal': {
            const { from, signal } = payload;
            let pc = peersRef.current[from]?.pc;

            if (signal.type === 'offer') {
                if(!pc) {
                    const fromUser = participants.find(p => p.id === from);
                    pc = createPeerConnection(from, fromUser?.nickname || 'Unknown', false);
                }
                pc.setRemoteDescription(new RTCSessionDescription(signal))
                  .then(() => pc.createAnswer())
                  .then(answer => pc.setLocalDescription(answer))
                  .then(() => {
                    ws.send(JSON.stringify({
                        type: 'signal',
                        payload: { to: from, signal: pc.localDescription }
                    }));
                  });
            } else if (signal.type === 'answer') {
                pc.setRemoteDescription(new RTCSessionDescription(signal));
            } else if (signal.type === 'candidate') {
                pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            }
            break;
        }
        case 'user-left': {
            console.log('User left:', payload.id);
            if (peersRef.current[payload.id]) {
                peersRef.current[payload.id].pc.close();
                delete peersRef.current[payload.id];
            }
            setParticipants(prev => prev.filter(p => p.id !== payload.id));
            break;
        }
        case 'user-instrument-updated': {
            if (peersRef.current[payload.id]) {
                peersRef.current[payload.id].instrument = payload.instrument;
            }
            setParticipants(prev => prev.map(p => p.id === payload.id ? { ...p, instrument: payload.instrument } : p));
            break;
        }
      }
    };

    // クリーンアップ処理
    return () => {
      console.log('Cleaning up WebRTC connections.');
      Object.values(peersRef.current).forEach(peer => peer.pc.close());
      peersRef.current = {};
      if(wsRef.current) {
        wsRef.current.close();
      }
      toneManager.toggleMic(false);
    };
  }, [roomId, createPeerConnection]);

  // マイクのオンオフ
  const toggleMic = useCallback(async (enabled: boolean) => {
    const stream = await toneManager.toggleMic(enabled);
    localStreamRef.current = stream;
    // 既存のピア接続にトラックを追加/削除
    Object.values(peersRef.current).forEach(peer => {
      const senders = peer.pc.getSenders().filter(sender => sender.track?.kind === 'audio');
      if (enabled && stream) {
        if (senders.length === 0) {
          stream.getTracks().forEach(track => peer.pc.addTrack(track, stream));
        }
      } else {
        senders.forEach(sender => peer.pc.removeTrack(sender));
      }
    });
    return !!stream;
  }, []);

  return {
    participants,
    localNickname,
    localId: localIdRef.current,
    broadcastDataChannelMessage,
    toggleMic,
  };
}