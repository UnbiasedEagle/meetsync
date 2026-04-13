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

/**
 * useWebRTC — manages the full lifecycle of a WebRTC video conference room.
 *
 * Architecture: mesh topology (peer-to-peer, no media server).
 * Every participant connects directly to every other participant.
 * The Spring Boot backend acts only as a signaling relay via STOMP/WebSocket —
 * it never touches the actual audio/video data.
 *
 * Signaling flow:
 *  1. Peer A joins  → broadcasts "join" to the room topic
 *  2. Peer B (already in room) receives "join" → creates RTCPeerConnection,
 *     adds local tracks, creates SDP offer, sends "offer" to Peer A
 *  3. Peer A receives "offer" → creates RTCPeerConnection, adds local tracks,
 *     sets remote description, creates SDP answer, sends "answer" to Peer B
 *  4. Peer B receives "answer" → sets remote description
 *  5. Both peers exchange ICE candidates → WebRTC negotiates the best path
 *  6. Once ICE connects, media flows directly peer-to-peer
 *
 * @param roomId  - the room's invite token, used as the STOMP topic key
 * @param isHost  - whether the current user is the room host
 */
export function useWebRTC(roomId: string, isHost: boolean) {
  /**
   * A random UUID generated once per browser tab.
   * We intentionally do NOT use the authenticated userId here because the same
   * user could open two tabs (e.g. host monitoring their own stream), and each
   * tab needs a distinct identity in the signaling layer.
   * useRef ensures the value survives re-renders without changing.
   */
  const sessionId = useRef(crypto.randomUUID()).current;
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  // Host is always "present" from their own perspective; guests start as false
  const [hostPresent, setHostPresent] = useState(isHost);
  // Latches true once the host has been seen — never resets back to false.
  // This separates "host hasn't joined yet" (lobby) from "host left mid-meeting"
  // (banner) so guests who are already in a call don't get thrown back to lobby.
  const [hostEverPresent, setHostEverPresent] = useState(isHost);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const stompClient = useRef<Client | null>(null);

  // One RTCPeerConnection per remote peer, keyed by their sessionId
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});

  /**
   * ICE candidates can arrive before setRemoteDescription() completes.
   * Adding a candidate without a remote description throws an error, so we
   * buffer incoming candidates here and flush them once the remote description
   * is set (see flushPendingCandidates).
   */
  const pendingCandidates = useRef<Record<string, RTCIceCandidateInit[]>>({});

  const iceServers = useRef<RTCIceServer[]>([
    { urls: "stun:stun.l.google.com:19302" },
  ]);

  // Tracks which sessionId belongs to the host so we can detect host departure
  const hostSessionId = useRef<string | null>(null);

  /**
   * Creates and wires up an RTCPeerConnection for a given remote peer.
   *
   * Each connection has three key callbacks:
   *  - onicecandidate: fires as the browser discovers network paths (host,
   *    server-reflexive via STUN, relay via TURN). We forward each candidate
   *    to the remote peer via the STOMP signaling channel.
   *  - ontrack: fires when the remote peer's media tracks arrive. We add the
   *    peer to state here so the UI renders their video tile.
   *  - oniceconnectionstatechange: monitors connection health. On failure or
   *    disconnect we clean up the peer connection and remove the video tile.
   */
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
    /**
     * isActive guards against React Strict Mode's double-invocation of effects.
     * In development, React mounts → unmounts → remounts every component to
     * surface side-effect bugs. Without this flag, the second mount would try
     * to set state on an already-cleaned-up hook instance.
     */
    let isActive = true;
    let stream: MediaStream;

    // Notify the room when the tab is closed so peers can clean up immediately
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

    /**
     * Drains any ICE candidates that arrived before the remote description was
     * set. Candidates are buffered in pendingCandidates during the offer/answer
     * exchange and applied here once setRemoteDescription() has completed.
     */
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
      /**
       * Fetch fresh TURN credentials from metered.ca on every room join.
       * TURN credentials are time-limited, so fetching dynamically ensures
       * they are always valid. TURN is required for peers behind strict NATs
       * (e.g. mobile networks) where a direct peer-to-peer path is blocked.
       * Falls back to STUN-only if the fetch fails.
       */
      try {
        const res = await fetch(
          "https://meetsync.metered.live/api/v1/turn/credentials?apiKey=2f321774b5fe7521469acfb279c18640d874",
        );
        iceServers.current = await res.json();
      } catch {
        // fall back to STUN-only if fetch fails
      }

      // Request camera and microphone access before connecting to the room
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      } catch {
        // Permission denied or no device available — block joining and surface to UI
        setPermissionDenied(true);
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
          // Subscribe to the room's broadcast topic to receive all signals
          client.subscribe(`/topic/room/${roomId}`, async (message) => {
            const signal = JSON.parse(message.body);

            // Ignore signals we sent ourselves (the server broadcasts to all)
            if (signal.from === sessionId) return;

            if (signal.type === "join") {
              if (peerConnections.current[signal.from]) return;
              // Re-announce host presence so guests who join after the host
              // still receive host-online and can exit the lobby screen
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
              // We are already in the room — initiate the connection to the newcomer
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
              // Guard against receiving a duplicate offer in an unexpected state
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
              // Only accept an answer when we are expecting one
              if (!pc || pc.signalingState !== "have-local-offer") return;
              await pc.setRemoteDescription(JSON.parse(signal.payload));
              await flushPendingCandidates(signal.from, pc);
            }

            if (signal.type === "ice-candidate" && signal.to === sessionId) {
              const pc = peerConnections.current[signal.from];
              const candidate = JSON.parse(signal.payload);
              if (pc?.remoteDescription) {
                // Remote description is set — safe to add the candidate directly
                await pc.addIceCandidate(candidate);
              } else {
                // Remote description not yet set — buffer and apply after
                pendingCandidates.current[signal.from] ??= [];
                pendingCandidates.current[signal.from].push(candidate);
              }
            }

            if (signal.type === "media-state") {
              // Sync the remote peer's audio/video toggle state so our UI
              // can display the correct mute/camera-off indicators on their tile
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
              setHostEverPresent(true);
            }

            if (signal.type === "leave") {
              setPeers((prev) => prev.filter((p) => p.peerId !== signal.from));
              const pc = peerConnections.current[signal.from];
              if (pc) {
                pc.close();
                delete peerConnections.current[signal.from];
              }
              // Track host departure so guests see a "host left" notice
              if (signal.from === hostSessionId.current) {
                setHostPresent(false);
              }
            }

            // Host has remotely muted this participant
            if (signal.type === "kick" && signal.to === sessionId) {
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

          // Announce arrival to all existing participants in the room
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
    hostEverPresent,
    permissionDenied,
    toggleAudio,
    toggleVideo,
    leaveRoom,
    mutePeer,
    kickPeer,
  };
}
