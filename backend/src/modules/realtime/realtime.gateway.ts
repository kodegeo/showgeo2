import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
  } from "@nestjs/websockets";
  import { Server, Socket } from "socket.io";
  
  @WebSocketGateway({
    cors: {
      origin: [
        "http://localhost:5173",
        "https://showgeo.vercel.app",
      ],
      credentials: true,
    },
  })
  export class RealtimeGateway
    implements OnGatewayConnection, OnGatewayDisconnect
  {
    @WebSocketServer()
    server: Server;
  
    handleConnection(client: Socket) {
      console.log("Client connected:", client.id);
    }
  
    handleDisconnect(client: Socket) {
      console.log("Client disconnected:", client.id);
    }
  }