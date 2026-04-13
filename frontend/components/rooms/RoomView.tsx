"use client";

import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  UserX,
  MicOff as MuteIcon,
  Clock,
  AlertCircle,
  CameraOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useWebRTC } from "@/hooks/useWebRTC";
import VideoTitle from "./VideoTitle";
import { Room } from "@/types/room";
import InviteForm from "./InviteForm";

interface RoomViewProps {
  room: Room;
  userId: string;
}

export default function RoomView({ room, userId }: RoomViewProps) {
  const isHost = room.hostId === userId;

  const {
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
  } = useWebRTC(room.inviteToken, isHost);

  // After 30 s with no host on the initial lobby, update the message
  const [longWait, setLongWait] = useState(false);

  // Toast when participants join or leave (skip the initial mount)
  const prevPeerCount = useRef<number | null>(null);
  useEffect(() => {
    if (prevPeerCount.current === null) {
      prevPeerCount.current = peers.length;
      return;
    }
    if (peers.length > prevPeerCount.current) {
      toast("A participant has joined the meeting.");
    } else if (peers.length < prevPeerCount.current) {
      toast("A participant has left the meeting.");
    }
    prevPeerCount.current = peers.length;
  }, [peers.length]);

  useEffect(() => {
    // Only run the timer when waiting on the initial lobby (host never joined)
    if (isHost || hostEverPresent) return;
    const t = setTimeout(() => setLongWait(true), 30_000);
    return () => clearTimeout(t);
  }, [isHost, hostEverPresent]);

  if (permissionDenied) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
          <CameraOff className="w-7 h-7 text-red-400" />
        </div>
        <div className="text-center">
          <h2 className="text-white text-xl font-semibold mb-2">
            Camera &amp; microphone access required
          </h2>
          <p className="text-zinc-400 text-sm max-w-sm">
            MeetSync needs access to your camera and microphone to join the
            meeting. Please allow access in your browser settings and reload the
            page.
          </p>
        </div>
        <Button
          className="bg-red-500 hover:bg-red-600 text-white px-6"
          onClick={() => window.location.reload()}
        >
          Reload page
        </Button>
      </div>
    );
  }

  // Guest lobby — shown only before the host has ever joined
  if (!isHost && !hostEverPresent) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
          <Clock className="w-7 h-7 text-zinc-400" />
        </div>
        <div className="text-center">
          <h2 className="text-white text-xl font-semibold mb-2">
            {longWait ? "Host hasn't joined yet" : "Waiting for host to join…"}
          </h2>
          <p className="text-zinc-400 text-sm max-w-xs">
            {longWait
              ? "The host doesn't seem to be available right now. You can keep waiting or leave."
              : `You'll be connected to "${room.name}" as soon as the host starts the meeting.`}
          </p>
        </div>
        <Button
          className="bg-red-500 hover:bg-red-600 text-white px-6"
          onClick={leaveRoom}
        >
          Leave room
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between gap-4">
        <span className="text-white font-medium shrink-0">{room.name}</span>
        {isHost && <InviteForm inviteToken={room.inviteToken} />}
        <span className="text-xs text-zinc-400 shrink-0">
          {peers.length + 1} participant{peers.length !== 0 ? "s" : ""}
        </span>
      </div>

      {/* Host-left notice — shown to guests after the host disconnects mid-meeting */}
      {!isHost && !hostPresent && (
        <div className="mx-4 mt-4 flex items-center gap-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0" />
          <p className="text-sm text-yellow-300">
            The host has left the meeting. You can stay or leave.
          </p>
        </div>
      )}

      {/* Video grid */}
      <div className="flex-1 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
        {localStream && (
          <VideoTitle
            stream={localStream}
            label="You"
            muted={true}
            audioEnabled={audioEnabled}
            videoEnabled={videoEnabled}
          />
        )}

        {peers.map((peer) => (
          <div key={peer.peerId} className="relative">
            <VideoTitle
              stream={peer.stream}
              label={peer.peerId.slice(0, 8)}
              audioEnabled={peer.audioEnabled}
              videoEnabled={peer.videoEnabled}
            />
            {isHost && (
              <div className="absolute top-2 right-2 flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 bg-black/50 hover:bg-black/70 text-white"
                  onClick={() => mutePeer(peer.peerId, !peer.audioEnabled)}
                  title={peer.audioEnabled ? "Mute participant" : "Unmute participant"}
                >
                  <MuteIcon className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 bg-black/50 hover:bg-black/70 text-white"
                  onClick={() => kickPeer(peer.peerId)}
                  title="Remove participant"
                >
                  <UserX className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="px-4 py-4 border-t border-zinc-800 flex items-center justify-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className={`rounded-full w-12 h-12 ${!audioEnabled ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "text-white hover:bg-zinc-800"}`}
          onClick={toggleAudio}
          title={audioEnabled ? "Mute" : "Unmute"}
        >
          {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`rounded-full w-12 h-12 ${!videoEnabled ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "text-white hover:bg-zinc-800"}`}
          onClick={toggleVideo}
          title={videoEnabled ? "Turn off camera" : "Turn on camera"}
        >
          {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full w-12 h-12 bg-red-500 hover:bg-red-600 text-white"
          onClick={leaveRoom}
          title="Leave room"
        >
          <PhoneOff className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
