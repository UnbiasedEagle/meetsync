"use client";

import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  UserX,
  MicOff as MuteIcon,
} from "lucide-react";
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
  const {
    localStream,
    peers,
    audioEnabled,
    videoEnabled,
    toggleAudio,
    toggleVideo,
    leaveRoom,
    mutePeer,
    kickPeer,
  } = useWebRTC(room.inviteToken);

  const isHost = room.hostId === userId;

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

      {/* Video grid */}
      <div className="flex-1 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
        {/* Local video */}
        {localStream && (
          <VideoTitle
            stream={localStream}
            label="You"
            muted={true}
            audioEnabled={audioEnabled}
            videoEnabled={videoEnabled}
          />
        )}

        {/* Remote videos */}
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
                  title={
                    peer.audioEnabled
                      ? "Mute participant"
                      : "Unmute participant"
                  }
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
          {audioEnabled ? (
            <Mic className="w-5 h-5" />
          ) : (
            <MicOff className="w-5 h-5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`rounded-full w-12 h-12 ${!videoEnabled ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "text-white hover:bg-zinc-800"}`}
          onClick={toggleVideo}
          title={videoEnabled ? "Turn off camera" : "Turn on camera"}
        >
          {videoEnabled ? (
            <Video className="w-5 h-5" />
          ) : (
            <VideoOff className="w-5 h-5" />
          )}
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
