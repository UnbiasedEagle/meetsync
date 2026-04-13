import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { PUBLIC_BACKEND_URL } from "@/lib/config";

interface Peer {
  peerId: string;
  stream: MediaStream;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

export function useWebRTC(roomId: string, isHost: boolean) {
  const sessionId = useRef(crypto.randomUUID()).current;
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  // Host is always "present" from their own perspective; guests start as false
  const [hostPresent, setHostPresent] = useState(isHost);

  const stompClient = useRef<Client | null>(null);
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
  const pendingCandidates = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const iceServers = useRef<RTCIceServer[]>([
    { urls: "stun:stun.l.google.com:19302" },
  ]);
  const hostSessionId = useRef<string | null>(null);

  function createPeerConnection(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: iceServers.current });

    pc.onicecandidate = (event) => {
      if (event.candidate && stompClient.current?.connected) {
        stompClient.current.publish({
          destination: "/app/signal",
          body: JSON.stringify({
            type: "ice-candidate",
            from: sessionId,
            to: peerId,
            roomId,
            payload: JSON.stringify(event.candidate),
          }),
        });
      }
    };

    pc.ontrack = (event) => {
      setPeers((prev) => {
        const exists = prev.find((p) => p.peerId === peerId);
        if (exists) return prev;
        return [
          ...prev,
          {
            peerId,
            stream: event.streams[0],
            audioEnabled: true,
            videoEnabled: true,
          },
        ];
      });
    };

    pc.oniceconnectionstatechange = () => {
      if (
        pc.iceConnectionState === "disconnected" ||
        pc.iceConnectionState === "failed" ||
        pc.iceConnectionState === "closed"
      ) {
        setPeers((prev) => prev.filter((p) => p.peerId !== peerId));
        pc.close();
        delete peerConnections.current[peerId];
      }
    };

    peerConnections.current[peerId] = pc;
    return pc;
  }

  useEffect(() => {
    let isActive = true;
    let stream: MediaStream;

    function handleBeforeUnload() {
      stompClient.current?.publish({
        destination: "/app/signal",
        body: JSON.stringify({
          type: "leave",
          from: sessionId,
          roomId,
          payload: "",
        }),
      });
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    async function flushPendingCandidates(
      peerId: string,
      pc: RTCPeerConnection,
    ) {
      const pending = pendingCandidates.current[peerId] ?? [];
      for (const candidate of pending) {
        await pc.addIceCandidate(candidate);
      }
      delete pendingCandidates.current[peerId];
    }

    async function init() {
      try {
        const res = await fetch(
          "https://meetsync.metered.live/api/v1/turn/credentials?apiKey=2f321774b5fe7521469acfb279c18640d874",
        );
        iceServers.current = await res.json();
      } catch {
        // fall back to STUN-only if fetch fails
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      } catch {
        return;
      }

      if (!isActive) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      setLocalStream(stream);

      const client = new Client({
        webSocketFactory: () => new SockJS(`${PUBLIC_BACKEND_URL}/ws`),
        onConnect: () => {
          client.subscribe(`/topic/room/${roomId}`, async (message) => {
            const signal = JSON.parse(message.body);

            if (signal.from === sessionId) return;

            if (signal.type === "join") {
              if (peerConnections.current[signal.from]) return;
              // Re-announce host presence to any guest who joins after the host
              if (isHost) {
                client.publish({
                  destination: "/app/signal",
                  body: JSON.stringify({
                    type: "host-online",
                    from: sessionId,
                    roomId,
                    payload: "",
                  }),
                });
              }
              const pc = createPeerConnection(signal.from);
              stream.getTracks().forEach((track) => pc.addTrack(track, stream));
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              client.publish({
                destination: "/app/signal",
                body: JSON.stringify({
                  type: "offer",
                  from: sessionId,
                  to: signal.from,
                  roomId,
                  payload: JSON.stringify(offer),
                }),
              });
            }

            if (signal.type === "offer" && signal.to === sessionId) {
              const pc =
                peerConnections.current[signal.from] ??
                createPeerConnection(signal.from);
              if (pc.signalingState !== "stable") return;
              stream.getTracks().forEach((track) => pc.addTrack(track, stream));
              await pc.setRemoteDescription(JSON.parse(signal.payload));
              await flushPendingCandidates(signal.from, pc);
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              client.publish({
                destination: "/app/signal",
                body: JSON.stringify({
                  type: "answer",
                  from: sessionId,
                  to: signal.from,
                  roomId,
                  payload: JSON.stringify(answer),
                }),
              });
            }

            if (signal.type === "answer" && signal.to === sessionId) {
              const pc = peerConnections.current[signal.from];
              if (!pc || pc.signalingState !== "have-local-offer") return;
              await pc.setRemoteDescription(JSON.parse(signal.payload));
              await flushPendingCandidates(signal.from, pc);
            }

            if (signal.type === "ice-candidate" && signal.to === sessionId) {
              const pc = peerConnections.current[signal.from];
              const candidate = JSON.parse(signal.payload);
              if (pc?.remoteDescription) {
                await pc.addIceCandidate(candidate);
              } else {
                pendingCandidates.current[signal.from] ??= [];
                pendingCandidates.current[signal.from].push(candidate);
              }
            }

            if (signal.type === "media-state") {
              const { audioEnabled, videoEnabled } = JSON.parse(signal.payload);
              setPeers((prev) =>
                prev.map((p) =>
                  p.peerId === signal.from
                    ? { ...p, audioEnabled, videoEnabled }
                    : p,
                ),
              );
            }

            if (signal.type === "host-online") {
              hostSessionId.current = signal.from;
              setHostPresent(true);
            }

            if (signal.type === "leave") {
              setPeers((prev) => prev.filter((p) => p.peerId !== signal.from));
              const pc = peerConnections.current[signal.from];
              if (pc) {
                pc.close();
                delete peerConnections.current[signal.from];
              }
              // If the host left (tab close / explicit leave), redirect guests
              if (signal.from === hostSessionId.current) {
                setHostPresent(false);
              }
            }

            if (signal.type === "kick" && signal.to === sessionId) {
              window.location.href = "/dashboard";
            }

            if (signal.type === "end-meeting") {
              window.location.href = "/dashboard";
            }

            if (signal.type === "toggle-audio" && signal.to === sessionId) {
              const { audioEnabled } = JSON.parse(signal.payload);
              stream
                .getAudioTracks()
                .forEach((t) => (t.enabled = audioEnabled));
              setAudioEnabled(audioEnabled);
            }
          });

          client.publish({
            destination: "/app/signal",
            body: JSON.stringify({
              type: "join",
              from: sessionId,
              roomId,
              payload: "",
            }),
          });

          // Host announces presence so guests know the meeting has started
          if (isHost) {
            client.publish({
              destination: "/app/signal",
              body: JSON.stringify({
                type: "host-online",
                from: sessionId,
                roomId,
                payload: "",
              }),
            });
          }
        },
      });

      if (!isActive) return;

      client.activate();
      stompClient.current = client;
    }

    init();

    return () => {
      isActive = false;
      window.removeEventListener("beforeunload", handleBeforeUnload);
      stream?.getTracks().forEach((t) => t.stop());
      Object.values(peerConnections.current).forEach((pc) => pc.close());
      peerConnections.current = {};
      pendingCandidates.current = {};
      stompClient.current?.deactivate();
      stompClient.current = null;
    };
  }, [roomId]);

  function toggleAudio() {
    if (!localStream) return;
    const next = !audioEnabled;
    localStream.getAudioTracks().forEach((t) => (t.enabled = next));
    setAudioEnabled(next);
    stompClient.current?.publish({
      destination: "/app/signal",
      body: JSON.stringify({
        type: "media-state",
        from: sessionId,
        roomId,
        payload: JSON.stringify({ audioEnabled: next, videoEnabled }),
      }),
    });
  }

  function toggleVideo() {
    if (!localStream) return;
    const next = !videoEnabled;
    localStream.getVideoTracks().forEach((t) => (t.enabled = next));
    setVideoEnabled(next);
    stompClient.current?.publish({
      destination: "/app/signal",
      body: JSON.stringify({
        type: "media-state",
        from: sessionId,
        roomId,
        payload: JSON.stringify({ audioEnabled, videoEnabled: next }),
      }),
    });
  }

  function leaveRoom() {
    stompClient.current?.publish({
      destination: "/app/signal",
      body: JSON.stringify({
        type: "leave",
        from: sessionId,
        roomId,
        payload: "",
      }),
    });
    localStream?.getTracks().forEach((t) => t.stop());
    Object.values(peerConnections.current).forEach((pc) => pc.close());
    stompClient.current?.deactivate();
    window.location.href = "/dashboard";
  }

  function mutePeer(peerId: string, audioEnabled: boolean) {
    stompClient.current?.publish({
      destination: "/app/signal",
      body: JSON.stringify({
        type: "toggle-audio",
        from: sessionId,
        to: peerId,
        roomId,
        payload: JSON.stringify({ audioEnabled }),
      }),
    });
    setPeers((prev) =>
      prev.map((p) => (p.peerId === peerId ? { ...p, audioEnabled } : p)),
    );
  }

  function endMeeting() {
    stompClient.current?.publish({
      destination: "/app/signal",
      body: JSON.stringify({
        type: "end-meeting",
        from: sessionId,
        roomId,
        payload: "",
      }),
    });
    localStream?.getTracks().forEach((t) => t.stop());
    Object.values(peerConnections.current).forEach((pc) => pc.close());
    stompClient.current?.deactivate();
    window.location.href = "/dashboard";
  }

  function kickPeer(peerId: string) {
    stompClient.current?.publish({
      destination: "/app/signal",
      body: JSON.stringify({
        type: "kick",
        from: sessionId,
        to: peerId,
        roomId,
        payload: "",
      }),
    });
    setPeers((prev) => prev.filter((p) => p.peerId !== peerId));
    const pc = peerConnections.current[peerId];
    if (pc) {
      pc.close();
      delete peerConnections.current[peerId];
    }
  }

  return {
    localStream,
    peers,
    audioEnabled,
    videoEnabled,
    hostPresent,
    toggleAudio,
    toggleVideo,
    leaveRoom,
    endMeeting,
    mutePeer,
    kickPeer,
  };
}
