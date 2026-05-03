/** Shared Socket.IO CORS for all gateways (default `/` namespace, `/socket.io` path). */
export const SOCKET_CORS = {
  origin: ["http://localhost:5173", "https://showgeo.vercel.app"],
  credentials: true,
};
