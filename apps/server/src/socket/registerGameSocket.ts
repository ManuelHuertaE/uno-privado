import type { Server, Socket } from "socket.io";
import { roomManager } from "../rooms/RoomManager";

function readRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} es requerido.`);
  }

  return value.trim();
}

function readPayloadField(payload: unknown, fieldName: string): unknown {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  return (payload as Record<string, unknown>)[fieldName];
}

function emitGameError(socket: Socket, error: unknown): void {
  socket.emit("game:error", {
    message: error instanceof Error ? error.message : "Error inesperado.",
  });
}

export function registerGameSocket(io: Server): void {
  io.on("connection", (socket) => {
    console.log("Cliente conectado:", socket.id);

    socket.on("room:create", (payload: unknown) => {
      try {
        const playerName = readRequiredString(
          readPayloadField(payload, "playerName"),
          "playerName"
        );

        const room = roomManager.createRoom(playerName, socket.id);
        console.log(room);

        console.log(
          `[ROOM CREATE] ${playerName} creó la sala ${room.id}`
        );

        socket.join(room.id);
        socket.emit("room:created", room);
      } catch (error) {
        emitGameError(socket, error);
      }
    });

    socket.on("room:join", (payload: unknown) => {
      try {
        const roomId = readRequiredString(
          readPayloadField(payload, "roomId"),
          "roomId"
        );

        const playerName = readRequiredString(
          readPayloadField(payload, "playerName"),
          "playerName"
        );

        const room = roomManager.joinRoom(
          roomId,
          playerName,
          socket.id
        );

        console.log(room);

        console.log(
          `[ROOM JOIN] ${playerName} entró a la sala ${room.id}`
        );

        socket.join(room.id);
        io.to(room.id).emit("room:updated", room);
      } catch (error) {
        emitGameError(socket, error);
      }
    });

    socket.on("disconnect", () => {
      console.log("Cliente desconectado:", socket.id);

      const updatedRoom = roomManager.removePlayerBySocket(socket.id);

      console.log("Sala después de desconectar:", updatedRoom);

      if (updatedRoom) {
        io.to(updatedRoom.id).emit("room:updated", updatedRoom);
      }
    });
  });
}
