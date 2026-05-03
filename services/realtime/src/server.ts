import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { EngineManager } from "./engines/engine-manager.js";
import { registerLobbyGateway } from "./gateways/lobby.gateway.js";
import { registerEventsGateway } from "./gateways/events.gateway.js";
import { registerStreamGateway } from "./gateways/stream.gateway.js";
import { registerEventInteractionGateway } from "./gateways/event-interaction.gateway.js";

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const engineManager = new EngineManager(io);

registerLobbyGateway(io, engineManager);
registerEventsGateway(io, engineManager);
registerStreamGateway(io, engineManager);
registerEventInteractionGateway(io, engineManager);

const PORT = Number(process.env.PORT) || 3001;
server.listen(PORT, () => {
  console.log("Realtime server running on port", PORT);
});
