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

function emitPrivateGameState(io: Server, roomId: string): void {
  const room = roomManager.getRoom(roomId);

  if (!room?.game) {
    return;
  }

  for (const roomPlayer of room.players) {
    const socket = io.sockets.sockets.get(roomPlayer.socketId);

    if (!socket) {
      continue;
    }

    const privateGame = {
      ...room.game,
      players: room.game.players.map((gamePlayer) => ({
        id: gamePlayer.id,
        name: gamePlayer.name,
        hand: gamePlayer.id === roomPlayer.id ? gamePlayer.hand : [],
        handCount: gamePlayer.hand.length,
      })),
    };

    socket.emit("game:updated", privateGame);
  }
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

    socket.on("game:start", (payload: unknown) => {
      try {
        const roomId = readRequiredString(
          readPayloadField(payload, "roomId"),
          "roomId"
        );

        const room = roomManager.getRoom(roomId);

        if (!room) {
          throw new Error("La sala no existe.");
        }

        const player = room.players.find(
          (player) => player.socketId === socket.id
        );

        if (!player) {
          throw new Error("No perteneces a esta sala.");
        }

        const updatedRoom = roomManager.startGame(roomId, player.id);

        console.log(`[GAME START] Sala ${updatedRoom.id} iniciada por ${player.name}`);

        console.log("Game creado:", {
          id: updatedRoom.game?.id,
          players: updatedRoom.game?.players.map((player:any) => ({
            id: player.id,
            name: player.name,
            cards: player.hand.length,
          })),
          drawPile: updatedRoom.game?.drawPile.length,
          discardPile: updatedRoom.game?.discardPile.length,
          currentColor: updatedRoom.game?.currentColor,
          currentPlayerIndex: updatedRoom.game?.currentPlayerIndex,
        });

        io.to(updatedRoom.id).emit("room:updated", {
          ...updatedRoom,
          game: null,
        });
        emitPrivateGameState(io, updatedRoom.id);
      } catch (error) {
        emitGameError(socket, error);
      }
    });

    socket.on("game:playCard", (payload: unknown) => {
      try {
        const roomId = readRequiredString(
          readPayloadField(payload, "roomId"),
          "roomId"
        );

        const cardId = readRequiredString(
          readPayloadField(payload, "cardId"),
          "cardId"
        );

        const chosenColorValue = readPayloadField(payload, "chosenColor");

        const chosenColor =
          typeof chosenColorValue === "string"
            ? chosenColorValue
            : undefined;

        const room = roomManager.getRoom(roomId);

        if (!room) {
          throw new Error("La sala no existe.");
        }

        const player = room.players.find(
          (player) => player.socketId === socket.id
        );

        if (!player) {
          throw new Error("No perteneces a esta sala.");
        }

        const updatedRoom = roomManager.playCard(
          roomId,
          player.id,
          cardId,
          chosenColor as never
        );

        console.log(
          `[PLAY CARD] ${player.name} jugó ${cardId} en sala ${updatedRoom.id}`
        );

        io.to(updatedRoom.id).emit("room:updated", {
          ...updatedRoom,
          game: null,
        });
        emitPrivateGameState(io, updatedRoom.id);
      } catch (error) {
        emitGameError(socket, error);
      }
    });

    socket.on("game:drawForTurn", (payload: unknown) => {
      try {
        const roomId = readRequiredString(
          readPayloadField(payload, "roomId"),
          "roomId"
        );

        const room = roomManager.getRoom(roomId);

        if (!room) {
          throw new Error("La sala no existe.");
        }

        const player = room.players.find(
          (player) => player.socketId === socket.id
        );

        if (!player) {
          throw new Error("No perteneces a esta sala.");
        }

        const updatedRoom = roomManager.drawForTurn(roomId, player.id);

        console.log(
          `[DRAW FOR TURN] ${player.name} robó una carta en sala ${updatedRoom.id}`
        );

        io.to(updatedRoom.id).emit("room:updated", {
          ...updatedRoom,
          game: null,
        });

        emitPrivateGameState(io, updatedRoom.id);
      } catch (error) {
        emitGameError(socket, error);
      }
    });

    socket.on("game:resolveDrawStack", (payload: unknown) => {
      try {
        const roomId = readRequiredString(
          readPayloadField(payload, "roomId"),
          "roomId"
        );

        const room = roomManager.getRoom(roomId);

        if (!room) {
          throw new Error("La sala no existe.");
        }

        const player = room.players.find(
          (player) => player.socketId === socket.id
        );

        if (!player) {
          throw new Error("No perteneces a esta sala.");
        }

        const updatedRoom = roomManager.resolveDrawStack(roomId, player.id);

        console.log(
          `[RESOLVE DRAW STACK] ${player.name} robó acumulación en sala ${updatedRoom.id}`
        );

        io.to(updatedRoom.id).emit("room:updated", {
          ...updatedRoom,
          game: null,
        });

        emitPrivateGameState(io, updatedRoom.id);
      } catch (error) {
        emitGameError(socket, error);
      }
  });

    socket.on("disconnect", () => {
      console.log("Cliente desconectado:", socket.id);

      const updatedRoom = roomManager.removePlayerBySocket(socket.id);

      console.log("Sala después de desconectar:", updatedRoom);

      if (updatedRoom) {
        io.to(updatedRoom.id).emit("room:updated", {
          ...updatedRoom,
          game: null,
        });
      }
    });
  });
}
