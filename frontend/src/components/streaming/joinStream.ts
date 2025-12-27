// frontend/src/components/streaming/joinStream.ts
import {
  Room,
  RoomConnectOptions,
  VideoPresets,
} from "livekit-client";

type JoinStreamArgs = {
  token: string;
  serverUrl: string;
  connectTimeoutMs?: number;
  connectOptions?: RoomConnectOptions;
};

function normalizeLiveKitUrl(url: string) {
  // LiveKit JS client expects ws/wss URLs.
  // If backend gives https, convert it.
  if (url.startsWith("https://")) return url.replace("https://", "wss://");
  if (url.startsWith("http://")) return url.replace("http://", "ws://");
  return url;
}

function timeout(ms: number, label: string) {
  return new Promise<never>((_, reject) => {
    const t = setTimeout(() => {
      clearTimeout(t);
      reject(new Error(label));
    }, ms);
  });
}

export async function joinStream({
  token,
  serverUrl,
  connectTimeoutMs = 15000,
  connectOptions,
}: JoinStreamArgs): Promise<Room> {
  if (typeof token !== "string" || token.length < 10) {
    throw new Error("Invalid LiveKit token");
  }
  if (typeof serverUrl !== "string" || !serverUrl.length) {
    throw new Error("Missing LiveKit serverUrl");
  }

  const url = normalizeLiveKitUrl(serverUrl);

  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
    videoCaptureDefaults: {
      resolution: VideoPresets.h720.resolution,
    },
  });

  const opts: RoomConnectOptions = {
    autoSubscribe: true,
    ...connectOptions,
  };

  try {
    // If connect hangs, this will throw and you’ll get your Retry UI.
    await Promise.race([
      room.connect(url, token, opts),
      timeout(connectTimeoutMs, `LiveKit connect timeout after ${connectTimeoutMs}ms (${url})`),
    ]);

    return room;
  } catch (e) {
    try {
      room.disconnect();
    } catch {
      // ignore
    }
    throw e;
  }
}
