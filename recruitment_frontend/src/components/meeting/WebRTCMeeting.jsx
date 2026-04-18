import { useEffect, useRef, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { FiVideo, FiVideoOff, FiMic, FiMicOff, FiX, FiAlertTriangle, FiRefreshCw, FiCheckCircle, FiLogOut, FiMonitor, FiUser, FiClock } from 'react-icons/fi';
import { getWebSocketUrl, getWebRTCConfig } from '../../config/webrtc.config';

const WebRTCMeeting = ({ interviewId, userId, userName, userRole, onClose, onProctoringViolation }) => {
  const { showToast } = useToast();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Refs for WebRTC state (persistent across renders)
  const peerConnectionRef = useRef(null);
  const stompClientRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const iceCandidatesQueue = useRef([]);
  const hasInitialized = useRef(false);
  const isInitiatorRef = useRef(false);
  const isProcessingOffer = useRef(false);
  const isProcessingAnswer = useRef(false);
  const remoteUserRef = useRef(null);
  // Refs to track local media state for syncing with new joiners
  const isVideoEnabledRef = useRef(true);
  const isAudioEnabledRef = useRef(true);

  // Refs for props to avoid stale closures in callbacks
  const userRoleRef = useRef(userRole);
  const userNameRef = useRef(userName);

  // Update refs when props change
  useEffect(() => {
    userRoleRef.current = userRole;
    userNameRef.current = userName;
  }, [userRole, userName]);

  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [remoteUser, setRemoteUser] = useState(null);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('initializing');
  const [meetingState, setMeetingState] = useState('active'); // active, ended
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteIsSharing, setRemoteIsSharing] = useState(false);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [isRemoteAudioMuted, setIsRemoteAudioMuted] = useState(false);

  // WebRTC Configuration
  const RTC_CONFIG = getWebRTCConfig();

  const isMounted = useRef(false);



  useEffect(() => {
    if (hasInitialized.current) return;

    hasInitialized.current = true;
    isMounted.current = true;

    initializeMeeting();

    // Safety: Cleanup on tab close/refresh
    const handleBeforeUnload = () => {
      cleanup();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      isMounted.current = false;
      cleanup();
    };
  }, [interviewId, userId]);

  const initializeMeeting = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser does not support camera/microphone access.');
      }

      // 1. GET USER MEDIA
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 24, max: 30 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      } catch (err) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true
            }
          });
          if (isMounted.current) setIsVideoEnabled(false);
        } catch (audioErr) {
          // Silent failure
        }
      }

      // CHECK MOUNTED STATUS
      if (!isMounted.current) {
        if (stream) stream.getTracks().forEach(t => t.stop());
        return;
      }

      // Handle Local Video
      if (stream) {
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.muted = true;
          localVideoRef.current.playsInline = true;
          localVideoRef.current.setAttribute('playsinline', 'true');

          setTimeout(() => {
            localVideoRef.current?.play().catch(() => { });
          }, 100);
        }
      }

      // 2. CREATE PEER CONNECTION (ONCE)
      const pc = new RTCPeerConnection(RTC_CONFIG);

      if (!isMounted.current) {
        pc.close();
        if (stream) stream.getTracks().forEach(t => t.stop());
        return;
      }

      peerConnectionRef.current = pc;

      // 3. ADD TRACKS
      if (stream) {
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });
      } else {
        pc.addTransceiver('audio', { direction: 'recvonly' });
        pc.addTransceiver('video', { direction: 'recvonly' });
      }

      // 4. SETUP HANDLERS
      pc.onnegotiationneeded = () => { };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        if (state === 'connected' || state === 'completed') {
          setConnectionStatus('connected');
        } else if (state === 'disconnected' || state === 'checking') {
          setConnectionStatus('reconnecting');
        } else if (state === 'failed' || state === 'closed') {
          setConnectionStatus('failed');
          hasCreatedOffer.current = false;
        }
      };

      pc.onconnectionstatechange = () => { };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({
            type: 'ice-candidate',
            interviewId,
            userId,
            userName,
            role: userRole,
            data: event.candidate
          });
        }
      };

      pc.ontrack = (event) => {
        const remoteVid = remoteVideoRef.current;
        if (!remoteVid) return;

        if (event.track.kind === 'video') {
          event.track.onmute = () => {
            setIsRemoteMuted(true);
          };
          event.track.onunmute = () => {
            setIsRemoteMuted(false);
          };
          // Set initial state
          setIsRemoteMuted(event.track.muted);
        }

        if (event.track.kind === 'audio') {
          event.track.onmute = () => {
            setIsRemoteAudioMuted(true);
          };
          event.track.onunmute = () => {
            setIsRemoteAudioMuted(false);
          };
          // Set initial state
          setIsRemoteAudioMuted(event.track.muted);
        }

        if (event.streams && event.streams[0]) {
          if (remoteVid.srcObject !== event.streams[0]) {
            remoteVid.srcObject = event.streams[0];
            setHasRemoteStream(true);
          }
        } else {
          if (!remoteVid.srcObject) {
            remoteVid.srcObject = new MediaStream();
          }
          remoteVid.srcObject.addTrack(event.track);
          setHasRemoteStream(true);
        }

        remoteVid.muted = false;
        remoteVid.playsInline = true;
        remoteVid.autoplay = true;

        const tryPlay = async () => {
          try {
            if (remoteVid.paused) {
              await remoteVid.play();
            }
          } catch (e) {
            setTimeout(tryPlay, 500);
          }
        };
        setTimeout(tryPlay, 200);
      };

      // 5. CONNECT WEBSOCKET
      if (isMounted.current) {
        connectWebSocket();
      }

      // Meeting started - informational event only, not a violation

    } catch (error) {
      if (isMounted.current) {
        showToast('Failed to initialize meeting: ' + error.message, 'error');
      }
    }
  };

  // 🔍 STATS MONITORING (Updated with Audio + Secure Check)


  const connectWebSocket = () => {
    const wsUrl = getWebSocketUrl();
    const socket = new SockJS(wsUrl);
    const stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      onConnect: () => {
        setIsConnected(true);

        stompClient.subscribe(`/queue/meeting/${interviewId}/${userId}`, (msg) => {
          const parsed = JSON.parse(msg.body);
          handleSignalingMessage(parsed);
        });

        // Join
        sendSignal({
          type: 'join',
          interviewId,
          userId,
          userName,
          role: userRole,
          timestamp: new Date().toISOString()
        });
      },
      onStompError: (frame) => { }
    });

    stompClient.activate();
    stompClientRef.current = stompClient;
  };

  const sendSignal = (msg) => {
    if (stompClientRef.current?.connected) {
      stompClientRef.current.publish({
        destination: `/app/meeting/signal`,
        body: JSON.stringify(msg)
      });
    }
  };

  // Flag to ensure we don't create multiple offers for the same connection
  const hasCreatedOffer = useRef(false);

  const handleSignalingMessage = async (msg) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      switch (msg.type) {
        case 'participant-joined':
          setRemoteUser(msg);
          remoteUserRef.current = msg;

          const currentRole = userRoleRef.current;

          if (currentRole !== 'CANDIDATE' && !hasCreatedOffer.current) {
            setTimeout(() => {
              if (isMounted.current && !hasCreatedOffer.current) {
                createOffer();
              }
            }, 1000);
          }

          // SYNC: Tell the new joiner my current media state
          // (Use Refs to avoid stale closure issues in this callback)
          sendSignal({
            type: 'media-state-update',
            interviewId,
            userId,
            mediaType: 'video',
            enabled: isVideoEnabledRef.current
          });
          sendSignal({
            type: 'media-state-update',
            interviewId,
            userId,
            mediaType: 'audio',
            enabled: isAudioEnabledRef.current
          });
          break;

        case 'existing-participant':
          setRemoteUser(msg);
          remoteUserRef.current = msg;
          isInitiatorRef.current = false;
          hasCreatedOffer.current = false;
          break;

        case 'offer':
          await handleOffer(msg.data);
          break;

        case 'answer':
          await handleAnswer(msg.data);
          break;

        case 'ice-candidate':
          await handleIceCandidate(msg.data);
          break;

        case 'participant-left':
          setRemoteUser(null);
          remoteUserRef.current = null;
          setHasRemoteStream(false);
          hasCreatedOffer.current = false;
          setRemoteIsSharing(false);
          break;

        case 'screen-share-start':
          setRemoteIsSharing(true);
          // If I am sharing, and someone else starts, I must stop (as per requirements)
          if (screenStreamRef.current) {
            stopScreenShare();
            showToast(`${msg.userName} started sharing their screen. Your sharing has ended.`, 'info');
          }
          break;

        case 'screen-share-stop':
          setRemoteIsSharing(false);
          break;

        case 'media-state-update':
          if (msg.mediaType === 'video') {
            setIsRemoteMuted(!msg.enabled);
          } else if (msg.mediaType === 'audio') {
            setIsRemoteAudioMuted(!msg.enabled);
          }
          break;
      }
    } catch (err) {
      console.error('Signaling Error:', err);
    }
  };

  const createOffer = async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    if (hasCreatedOffer.current) return;
    if (userRole === 'CANDIDATE') return;
    if (pc.signalingState !== 'stable') return;

    hasCreatedOffer.current = true;
    isInitiatorRef.current = true;

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendSignal({
        type: 'offer',
        interviewId,
        userId,
        userName,
        role: userRole,
        data: offer,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error('Create Offer Error:', e);
    }
  };

  const handleOffer = async (offer) => {
    try {
      if (isProcessingOffer.current) return;

      const pc = peerConnectionRef.current;
      if (!pc) return;
      if (pc.signalingState !== 'stable') return;

      isProcessingOffer.current = true;

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      processQueuedCandidates();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendSignal({
        type: 'answer',
        interviewId,
        userId,
        userName,
        role: userRole,
        data: answer,
        timestamp: new Date().toISOString()
      });

      isProcessingOffer.current = false;
    } catch (err) {
      isProcessingOffer.current = false;
      console.error('Handle Offer Error:', err);
    }
  };

  const handleAnswer = async (answer) => {
    try {
      if (isProcessingAnswer.current) return;

      const pc = peerConnectionRef.current;
      if (!pc) return;
      if (pc.signalingState !== 'have-local-offer') return;

      isProcessingAnswer.current = true;

      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      // Manual track check fallback
      setTimeout(() => {
        const remoteVid = remoteVideoRef.current;
        if (remoteVid && !remoteVid.srcObject) {
          const stream = new MediaStream();
          pc.getReceivers().forEach(receiver => {
            if (receiver.track) stream.addTrack(receiver.track);
          });

          if (stream.getTracks().length > 0) {
            remoteVid.srcObject = stream;
            remoteVid.autoplay = true;
            remoteVid.playsInline = true;
            remoteVid.muted = false;
            setHasRemoteStream(true);

            const attemptPlay = () => {
              remoteVid.play().catch(e => { });
            };
            remoteVid.addEventListener('loadeddata', attemptPlay, { once: true });
            setTimeout(attemptPlay, 1000);
          }
        }
      }, 500);

      processQueuedCandidates();
      isProcessingAnswer.current = false;
    } catch (err) {
      isProcessingAnswer.current = false;
      console.error('Handle Answer Error:', err);
    }
  };

  const handleIceCandidate = async (candidate) => {
    try {
      const pc = peerConnectionRef.current;
      if (!pc) return;

      if (pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        iceCandidatesQueue.current.push(candidate);
      }
    } catch (e) {
      console.error('ICE Error:', e);
    }
  };

  const processQueuedCandidates = () => {
    const pc = peerConnectionRef.current;
    if (!pc || !pc.remoteDescription) return;

    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift();
      pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error('ICE Error', e));
    }
  };

  const cleanup = () => {
    // 1. Leave Signal
    if (stompClientRef.current) {
      if (stompClientRef.current.connected) {
        sendSignal({ type: 'leave', interviewId, userId, userName, role: userRole });
      }
      try {
        stompClientRef.current.deactivate();
      } catch (e) { console.error('Stomp deactivation error', e); }
      stompClientRef.current = null;
    }

    // 2. Stop Local Tracks (Crucial for Camera Light)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
          track.enabled = false;
        } catch (e) { console.error('Track stop error', e); }
      });
      localStreamRef.current = null;
    }

    // 3. Clear Video Elements (Release Hardware)
    if (localVideoRef.current) {
      localVideoRef.current.pause();
      localVideoRef.current.srcObject = null;
      localVideoRef.current.load(); // Force release
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.pause();
      remoteVideoRef.current.srcObject = null;
      remoteVideoRef.current.load(); // Force release
    }

    // Stop Screen Share Track
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }

    // 4. Close PeerConnection
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.ontrack = null;
        peerConnectionRef.current.onicecandidate = null;
        peerConnectionRef.current.onnegotiationneeded = null;
        peerConnectionRef.current.close();
      } catch (e) { console.error('PC close error', e); }
      peerConnectionRef.current = null;
    }

    // 5. Clear State Refs
    setHasRemoteStream(false);
    hasInitialized.current = false;
    hasCreatedOffer.current = false;
    isProcessingOffer.current = false;
    isProcessingAnswer.current = false;
    iceCandidatesQueue.current = [];
  };

  const handleEndMeeting = () => {
    cleanup();
    setMeetingState('ended');
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getVideoTracks()[0];
      if (track) {
        const newEnabled = !isVideoEnabled;
        track.enabled = newEnabled;
        setIsVideoEnabled(newEnabled);
        isVideoEnabledRef.current = newEnabled;

        // Notify remote peer
        sendSignal({
          type: 'media-state-update',
          interviewId,
          userId,
          mediaType: 'video',
          enabled: newEnabled
        });
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) {
        const newEnabled = !isAudioEnabled;
        track.enabled = newEnabled;
        setIsAudioEnabled(newEnabled);
        isAudioEnabledRef.current = newEnabled;

        // Notify remote peer
        sendSignal({
          type: 'media-state-update',
          interviewId,
          userId,
          mediaType: 'audio',
          enabled: newEnabled
        });
      }
    }
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const screenTrack = stream.getVideoTracks()[0];

      screenTrack.onended = () => {
        stopScreenShare();
      };

      const pc = peerConnectionRef.current;
      if (pc) {
        // Find video transceiver to replace track
        const videoTransceiver = pc.getTransceivers().find(t => t.receiver.track.kind === 'video');

        if (videoTransceiver && videoTransceiver.sender) {
          await videoTransceiver.sender.replaceTrack(screenTrack);
          videoTransceiver.direction = 'sendrecv';
        }
      }

      // Update local preview to show my screen
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      screenStreamRef.current = stream;
      setIsScreenSharing(true);

      sendSignal({
        type: 'screen-share-start',
        interviewId,
        userId,
        userName,
        role: userRole
      });

    } catch (err) {
      console.error("Error starting screen share", err);
      // User likely cancelled the picker
    }
  };

  const stopScreenShare = async () => {
    // Stop screen track
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }

    // Restore camera
    const cameraStream = localStreamRef.current;
    const cameraTrack = cameraStream ? cameraStream.getVideoTracks()[0] : null;

    const pc = peerConnectionRef.current;
    if (pc) {
      const videoTransceiver = pc.getTransceivers().find(t => t.receiver.track.kind === 'video');
      if (videoTransceiver && videoTransceiver.sender) {
        // If camera track exists, replace with it. If not (camera failed), replace with null.
        await videoTransceiver.sender.replaceTrack(cameraTrack);
        // If no camera track, maybe set direction to recvonly? 
        if (!cameraTrack) {
          // videoTransceiver.direction = 'recvonly'; // Optional: keeps connection alive but sends nothing
        }
      }
    }

    // Restore local preview
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = cameraStream;
      // Ensure video plays if it was active
      if (cameraStream && isVideoEnabled) {
        localVideoRef.current.play().catch(e => { });
      }
    }

    setIsScreenSharing(false);

    sendSignal({
      type: 'screen-share-stop',
      interviewId,
      userId,
      userName,
      role: userRole
    });
  };

  /* 
   * 🔄 RECONNECT MEDIA
   * Fix for 'Tx=0' issue where mobile browser stops sending data.
   * This forces a full re-acquisition of the camera/mic.
   */
  const refreshMedia = async () => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 24, max: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(e => { });
      }

      const pc = peerConnectionRef.current;
      if (pc) {
        const audioTrack = stream.getAudioTracks()[0];
        const videoTrack = stream.getVideoTracks()[0];

        pc.getTransceivers().forEach(t => {
          if (t.sender) {
            if (t.receiver.track.kind === 'audio' && audioTrack) {
              t.sender.replaceTrack(audioTrack).catch(e => { });
              t.direction = 'sendrecv';
            }
            if (t.receiver.track.kind === 'video' && videoTrack) {
              t.sender.replaceTrack(videoTrack).catch(e => { });
              t.direction = 'sendrecv';
            }
          }
        });
      }

      setIsVideoEnabled(true);
      setIsAudioEnabled(true);
    } catch (e) {
      showToast('Failed to refresh camera: ' + e.message, 'error');
    }
  };

  if (meetingState === 'ended') {
    return (
      <div className="flex flex-col h-full bg-gray-900 items-center justify-center relative">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl text-center max-w-md w-full border border-gray-700">
          <div className="w-20 h-20 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiCheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Meeting Ended</h2>
          <p className="text-gray-400 mb-8">You have left the interview session safely.</p>

          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <FiLogOut />
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black relative">
      {/* Remote Video */}
      <div className="flex-1 relative bg-gray-900 overflow-hidden">
        {/* CRITICAL: Always render video element so ref is available for pc.ontrack */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          muted={false}
          className="absolute inset-0 w-full h-full object-contain bg-black"
          style={{
            display: hasRemoteStream ? 'block' : 'none',
            objectFit: 'contain'
          }}
        />

        {/* Remote Camera OFF: Show blank placeholder only (no text, no icon) */}
        {hasRemoteStream && isRemoteMuted && !remoteIsSharing && (
          <div className="absolute inset-0 bg-gray-900 z-50 flex items-center justify-center">
            {/* Empty placeholder - no text, no icon */}
          </div>
        )}

        {/* Remote Mic OFF: No UI indicator (silent) */}

        {/* Connection Status Overlay */}
        <div className="absolute top-2 right-2 flex flex-col items-end pointer-events-none z-10">
          {connectionStatus === 'reconnecting' && (
            <div className="bg-yellow-600/90 text-white px-3 py-1 rounded-full text-sm mb-2 animate-pulse">
              Reconnecting...
            </div>
          )}
          {connectionStatus === 'failed' && (
            <div className="bg-red-600/90 text-white px-3 py-1 rounded-full text-sm mb-2">
              Connection Lost
            </div>
          )}
          {remoteIsSharing && (
            <div className="bg-blue-600/90 text-white px-3 py-1 rounded-full text-sm mb-2 flex items-center gap-2">
              <FiMonitor className="w-4 h-4" /> {remoteUser?.userName || "Remote User"} is presenting
            </div>
          )}
        </div>

        {/* Placeholder overlay - shown when no remote stream */}
        {!hasRemoteStream && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-white text-center px-4">
              <div className="w-24 h-24 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                <FiVideo className="w-12 h-12" />
              </div>
              <p className="text-lg">Waiting for other participant...</p>
              {remoteUser && <p className="text-sm text-gray-400 mt-2">{remoteUser.userName} is here</p>}
              {!isConnected && <p className="text-sm text-yellow-500 mt-2">Connecting...</p>}
              <p className="text-xs text-gray-600 mt-4">Debug: Room {interviewId} | Me: {userId}</p>
            </div>
          </div>
        )}
      </div>

      {/* Local Video */}
      <div className="absolute bottom-24 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-white shadow-lg">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full ${isScreenSharing ? 'object-contain bg-black' : 'object-cover'} ${!isVideoEnabled && !isScreenSharing ? 'hidden' : ''}`}
        />
        {isScreenSharing && (
          <div className="absolute top-2 right-2 bg-blue-600 px-2 py-0.5 rounded text-[10px] text-white font-medium flex items-center gap-1">
            <FiMonitor className="w-3 h-3" /> You
          </div>
        )}
        {!isVideoEnabled && !isScreenSharing && (
          <div className="w-full h-full flex flex-col items-center justify-center text-white">
            <FiVideoOff className="w-8 h-8 mb-2" />
            <span className="text-xs">Camera is off</span>
          </div>
        )}
      </div>

      {/* Error Overlay */}
      {!localStreamRef.current && hasInitialized.current && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-600/90 text-white px-4 py-2 rounded shadow">
          <FiAlertTriangle className="inline mr-2" />
          Camera access failed. Check permissions/https.
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        <div className="flex items-center justify-center gap-4">
          <button onClick={toggleAudio} className={`p-3 rounded-full ${isAudioEnabled ? 'bg-white/20' : 'bg-red-600'} text-white`}>
            {isAudioEnabled ? <FiMic /> : <FiMicOff />}
          </button>

          <button onClick={toggleVideo} className={`p-3 rounded-full ${isVideoEnabled ? 'bg-white/20' : 'bg-red-600'} text-white`}>
            {isVideoEnabled ? <FiVideo /> : <FiVideoOff />}
          </button>

          {/* New Refresh Button */}
          <button onClick={refreshMedia} className="p-3 rounded-full bg-blue-600 text-white" title="Reconnect Camera">
            <FiRefreshCw />
          </button>

          <button
            onClick={isScreenSharing ? stopScreenShare : startScreenShare}
            disabled={remoteIsSharing && !isScreenSharing}
            className={`p-3 rounded-full text-white ${isScreenSharing ? 'bg-blue-500' : 'bg-white/20 hover:bg-white/30'} disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
          >
            <FiMonitor />
          </button>

          <button onClick={handleEndMeeting} className="p-3 rounded-full bg-red-600 text-white" title="End Meeting">
            <FiX />
          </button>
        </div>
      </div>



    </div>
  );
};

export default WebRTCMeeting;
