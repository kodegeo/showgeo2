import { io } from "socket.io-client";

function env(name: string): string | undefined {
  const proc = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } })
    .process;
  return proc?.env?.[name];
}

/** Set `WS_URL` or `VITE_WS_URL` when running with `tsx` (this file is not Vite-bundled). */
const URL = env("VITE_WS_URL") ?? env("WS_URL") ?? "http://localhost:3001";
const eventId = "test-event";

function createClient(name: string, role: "audience" | "creator" | "coordinator") {
  const socket = io(URL, {
    transports: ["websocket"],
  });

  socket.on("connect", () => {
    console.log(`${name} connected`, socket.id);

    socket.emit("event:join", { eventId, role });
  });

  socket.on("connect_error", (err) => {
    console.log(`${name} connection error:`, err.message);
  });

  socket.on("disconnect", () => {
    console.log(`${name} disconnected`);
  });

  socket.onAny((event, payload) => {
    console.log(`${name} <-`, event, payload);
  });

  return socket;
}

const a1 = createClient("A1", "audience");
const a2 = createClient("A2", "audience");
const creator = createClient("Creator", "creator");
const coord = createClient("Coord", "coordinator");

setTimeout(() => {
  console.log("\n--- SIMULATING ACTIONS ---\n");

  a1.emit("event:tap", { eventId });
  a2.emit("event:tap", { eventId });

  a1.emit("event:chat", { eventId, text: "🔥🔥🔥" });
  a2.emit("event:typing", { eventId });

}, 2000);