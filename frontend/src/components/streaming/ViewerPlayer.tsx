import { useState, useRef, useEffect } from "react";
import { useTracks, useRoomContext } from "@livekit/components-react";
import { Track } from "livekit-client";
import type { StreamingSession } from "@/hooks/useStreaming";
import type { Event } from "../../../../packages/shared/types/event.types";

type ViewerPlayerProps = {
  session: StreamingSession & {
    event?: {
      id: string;
      name: string;
      thumbnail?: string | null;
    };
    entity?: {
      id: string;
      name: string;
      thumbnail?: string | null;
    };
  };
  event?: Event;
  onLeave: () => void;
};

export function ViewerPlayer({ session, event, onLeave }: ViewerPlayerProps) {
  const room = useRoomContext();
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Get video tracks from remote participants
  const videoTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: true }
  );

  // Attach video track to video element
  useEffect(() => {
    if (videoTracks.length > 0 && videoRef.current) {
      const trackRef = videoTracks[0];
      const track = trackRef.publication?.track;
      if (track) {
        track.attach(videoRef.current);
        return () => {
          track.detach();
        };
      }
    }
  }, [videoTracks]);

  // Handle mute toggle - unsubscribe/resubscribe to audio tracks
  const handleMuteToggle = () => {
    if (room) {
      const newMutedState = !isMuted;
      // Unsubscribe from audio tracks when muted, resubscribe when unmuted
      room.remoteParticipants.forEach((participant) => {
        participant.audioTrackPublications.forEach((publication) => {
          if (newMutedState) {
            publication.setSubscribed(false);
          } else {
            publication.setSubscribed(true);
          }
        });
      });
      setIsMuted(newMutedState);
    }
  };

  // Handle leave
  const handleLeave = () => {
    if (room) {
      room.disconnect();
    }
    onLeave();
  };

  const eventName = event?.name || session.event?.name || "Live Event";
  const entityName = session.entity?.name || "Unknown Artist";
  const thumbnail = event?.thumbnail || session.event?.thumbnail || null;
  const hasVideo = videoTracks.length > 0;

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-gray-800">
        <button
          onClick={handleLeave}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Back"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          PLAYING NOW
        </span>
        <button
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Media Container - Circular */}
        <div className="relative mb-8">
          <div className="w-80 h-80 rounded-full overflow-hidden bg-gray-900 border-4 border-gray-800 shadow-2xl">
            {hasVideo ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isMuted}
                className="w-full h-full object-cover"
              />
            ) : thumbnail ? (
              <img
                src={thumbnail}
                alt={eventName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                <svg
                  className="w-24 h-24 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}
          </div>
          
          {/* LIVE Indicator */}
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-[#CD000E] px-3 py-1 rounded-full">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              LIVE
            </span>
          </div>
        </div>

        {/* Metadata */}
        <div className="text-center mb-8 max-w-md">
          <h1 className="text-2xl font-bold mb-2 text-white">{eventName}</h1>
          <h2 className="text-lg text-gray-400">{entityName}</h2>
          
          {/* Viewers count if available */}
          {session.viewers !== undefined && (
            <p className="text-sm text-gray-500 mt-2">
              {session.viewers.toLocaleString()} watching
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6">
          <button
            onClick={handleMuteToggle}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isMuted
                ? "bg-red-600 hover:bg-red-700"
                : "bg-gray-800 hover:bg-gray-700"
            }`}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
              </svg>
            )}
          </button>

          <button
            onClick={handleLeave}
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-full font-medium transition-colors"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
