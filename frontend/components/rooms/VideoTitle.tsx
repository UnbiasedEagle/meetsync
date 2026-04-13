import { useEffect, useRef } from "react";
import { MicOff, VideoOff } from "lucide-react";

export default function VideoTitle({
  stream,
  label,
  muted = false,
  audioEnabled = true,
  videoEnabled = true,
}: {
  stream: MediaStream;
  label: string;
  muted?: boolean;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative rounded-xl overflow-hidden bg-zinc-900 aspect-video">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className="w-full h-full object-cover"
      />

      {/* Camera off overlay */}
      {!videoEnabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
          <div className="w-16 h-16 rounded-full bg-zinc-700 flex items-center justify-center">
            <VideoOff className="w-7 h-7 text-zinc-400" />
          </div>
        </div>
      )}

      {/* Bottom bar — name + mic status */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <span className="text-xs text-white bg-black/50 px-2 py-0.5 rounded-md">
          {label}
        </span>
        {!audioEnabled && (
          <div className="bg-red-500/80 rounded-full p-1">
            <MicOff className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}
