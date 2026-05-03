// Delegates to the NestJS backend socket (port 3000, /events namespace).
// All legacy callers of getSharedSocket now connect to the correct server.
export { getBackendEventSocket as getSharedSocket } from "./backend-socket";
