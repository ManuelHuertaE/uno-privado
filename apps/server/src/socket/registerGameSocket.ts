import type { Server, Socket } from "socket.io";
import type { CardColor } from "@uno/shared";
import { roomManager } from "../rooms/RoomManager";

type PlayCardPayload = {
  roomId: string;
  cardId: string;
  chosenColor?: Exclude<CardColor, "wild">;
};

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

function readChosenColor(value: unknown): Exclude<CardColor, "wild"> | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    value === "red" ||
    value === "blue" ||
    value === "green" ||
    value === "yellow"
  ) {
    return value;
  }

  throw new Error("chosenColor debe ser red, blue, green o yellow.");
}

function readPlayCardPayload(payload: unknown): PlayCardPayload {
  return {
    roomId: readRequiredString(readPayloadField(payload, "roomId"), "roomId"),
    cardId: readRequiredString(readPayloadField(payload, "cardId"), "cardId"),
    chosenColor: readChosenColor(readPayloadField(payload, "chosenColor")),
  };
}

function emitPrivateGameState(
  io: Server,
  roomId: string,
  eventName = "game:updated",
): void {
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

    socket.emit(eventName, privateGame);
  }
}

function emitGameError(socket: Socket, error: unknown): void {
  socket.emit("game:error", {
    message: error instanceof Error ? error.message : "Error inesperado.",
  });
}

function assertGameIsActive(status: string): void {
  if (status === "finished") {
    throw new Error("La partida ya finalizó.");
  }
}

export function registerGameSocket(io: Server): void {
  io.on("connection", (socket) => {
    console.log("Cliente conectado:", socket.id);

    socket.on("room:create", (payload: unknown) => {
      try {
        const playerName = readRequiredString(
          readPayloadField(payload, "playerName"),
          "playerName",
        );

        const room = roomManager.createRoom(playerName, socket.id);
        console.log(room);

        console.log(`[ROOM CREATE] ${playerName} creó la sala ${room.id}`);

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
          "roomId",
        );

        const playerName = readRequiredString(
          readPayloadField(payload, "playerName"),
          "playerName",
        );

        const room = roomManager.joinRoom(roomId, playerName, socket.id);

        console.log(room);

        console.log(`[ROOM JOIN] ${playerName} entró a la sala ${room.id}`);

        socket.join(room.id);
        io.to(room.id).emit("room:updated", room);
      } catch (error) {
        emitGameError(socket, error);
      }
    });

    socket.on("room:reconnect", (payload: unknown) => {
      try {
        const roomId = readRequiredString(
          readPayloadField(payload, "roomId"),
          "roomId",
        );

        const playerName = readRequiredString(
          readPayloadField(payload, "playerName"),
          "playerName",
        );

        const updatedRoom = roomManager.reconnectPlayer(
          roomId,
          playerName,
          socket.id,
        );

        console.log(
          `[ROOM RECONNECT] ${playerName} se reconectó a la sala ${updatedRoom.id}`,
        );

        socket.join(updatedRoom.id);

        socket.emit("room:reconnected", {
          ...updatedRoom,
          game: null,
        });

        io.to(updatedRoom.id).emit("room:updated", {
          ...updatedRoom,
          game: null,
        });

        emitPrivateGameState(io, updatedRoom.id);

        if (!updatedRoom.paused) {
          io.to(updatedRoom.id).emit("game:resumed");
        }
      } catch (error) {
        emitGameError(socket, error);
      }
    });

    socket.on("game:start", (payload: unknown) => {
      try {
        const roomId = readRequiredString(
          readPayloadField(payload, "roomId"),
          "roomId",
        );

        const room = roomManager.getRoom(roomId);

        if (!room) {
          throw new Error("La sala no existe.");
        }

        const player = room.players.find(
          (player) => player.socketId === socket.id,
        );

        if (!player) {
          throw new Error("No perteneces a esta sala.");
        }

        const updatedRoom = roomManager.startGame(roomId, player.id);

        console.log(
          `[GAME START] Sala ${updatedRoom.id} iniciada por ${player.name}`,
        );

        console.log("Game creado:", {
          id: updatedRoom.game?.id,
          players: updatedRoom.game?.players.map((player: any) => ({
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
        io.to(updatedRoom.id).emit("game:started", updatedRoom.game);
        emitPrivateGameState(io, updatedRoom.id);
      } catch (error) {
        emitGameError(socket, error);
      }
    });

    const handlePlayCard = (payload: unknown) => {
      try {
        const { roomId, cardId, chosenColor } = readPlayCardPayload(payload);

        const room = roomManager.getRoom(roomId);

        if (!room) {
          throw new Error("La sala no existe.");
        }

        if (!room.started) {
          throw new Error("La partida no ha iniciado.");
        }

        if (!room.game) {
          throw new Error("No hay estado de partida para esta sala.");
        }

        assertGameIsActive(room.game.status);

        const player = room.players.find(
          (player) => player.socketId === socket.id,
        );

        if (!player) {
          throw new Error("No perteneces a esta sala.");
        }

        const updatedRoom = roomManager.playCard(
          roomId,
          player.id,
          cardId,
          chosenColor,
        );

        console.log(
          `[PLAY CARD] ${player.name} jugó ${cardId} en sala ${updatedRoom.id}`,
        );

        io.to(updatedRoom.id).emit("room:updated", {
          ...updatedRoom,
          game: null,
        });

        const playerAfterMove = updatedRoom.game?.players.find(
          (gamePlayer) => gamePlayer.id === player.id,
        );

        if (
          updatedRoom.game?.status === "finished" &&
          updatedRoom.game.winnerId === player.id &&
          playerAfterMove?.hand.length === 0
        ) {
          emitPrivateGameState(io, updatedRoom.id, "game:finished");
        }

        emitPrivateGameState(io, updatedRoom.id);
      } catch (error) {
        emitGameError(socket, error);
      }
    };

    socket.on("game:play-card", handlePlayCard);
    socket.on("game:playCard", handlePlayCard);

    const handleDrawCard = (payload: unknown) => {
      try {
        const roomId = readRequiredString(
          readPayloadField(payload, "roomId"),
          "roomId",
        );

        const room = roomManager.getRoom(roomId);

        if (!room) {
          throw new Error("La sala no existe.");
        }

        if (!room.started) {
          throw new Error("La partida no ha iniciado.");
        }

        if (!room.game) {
          throw new Error("No hay estado de partida para esta sala.");
        }

        assertGameIsActive(room.game.status);

        const player = room.players.find(
          (player) => player.socketId === socket.id,
        );

        if (!player) {
          throw new Error("No perteneces a esta sala.");
        }

        const currentPlayer = room.game.players[room.game.currentPlayerIndex];

        if (!currentPlayer) {
          throw new Error("No hay jugador actual.");
        }

        if (currentPlayer.id !== player.id) {
          throw new Error("No es el turno de este jugador.");
        }

        if (room.game.drawStack > 0) {
          throw new Error(
            "Primero debes resolver el acumulado de robo activo.",
          );
        }

        const updatedRoom = roomManager.drawForTurn(roomId, player.id);

        console.log(
          `[DRAW FOR TURN] ${player.name} robó una carta en sala ${updatedRoom.id}`,
        );

        io.to(updatedRoom.id).emit("room:updated", {
          ...updatedRoom,
          game: null,
        });

        emitPrivateGameState(io, updatedRoom.id);
      } catch (error) {
        emitGameError(socket, error);
      }
    };

    socket.on("game:draw-card", handleDrawCard);
    socket.on("game:drawForTurn", handleDrawCard);

    const handleResolveDrawStack = (payload: unknown) => {
      try {
        const roomId = readRequiredString(
          readPayloadField(payload, "roomId"),
          "roomId",
        );

        const room = roomManager.getRoom(roomId);

        if (!room) {
          throw new Error("La sala no existe.");
        }

        if (!room.started) {
          throw new Error("La partida no ha iniciado.");
        }

        if (!room.game) {
          throw new Error("No hay estado de partida para esta sala.");
        }

        assertGameIsActive(room.game.status);

        const player = room.players.find(
          (player) => player.socketId === socket.id,
        );

        if (!player) {
          throw new Error("No perteneces a esta sala.");
        }

        const currentPlayer = room.game.players[room.game.currentPlayerIndex];

        if (!currentPlayer) {
          throw new Error("No hay jugador actual.");
        }

        if (currentPlayer.id !== player.id) {
          throw new Error("No es el turno de este jugador.");
        }

        if (room.game.drawStack <= 0) {
          throw new Error("No hay acumulacion de robo activa.");
        }

        const updatedRoom = roomManager.resolveDrawStack(roomId, player.id);

        console.log(
          `[RESOLVE DRAW STACK] ${player.name} robó acumulación en sala ${updatedRoom.id}`,
        );

        io.to(updatedRoom.id).emit("room:updated", {
          ...updatedRoom,
          game: null,
        });

        emitPrivateGameState(io, updatedRoom.id);
      } catch (error) {
        emitGameError(socket, error);
      }
    };

    socket.on("game:resolve-draw-stack", handleResolveDrawStack);
    socket.on("game:resolveDrawStack", handleResolveDrawStack);

    const handleSayUno = (payload: unknown) => {
      try {
        const roomId = readRequiredString(
          readPayloadField(payload, "roomId"),
          "roomId",
        );

        const room = roomManager.getRoom(roomId);

        if (!room) {
          throw new Error("La sala no existe.");
        }

        if (!room.game) {
          throw new Error("No hay estado de partida para esta sala.");
        }

        assertGameIsActive(room.game.status);

        const player = room.players.find(
          (player) => player.socketId === socket.id,
        );

        if (!player) {
          throw new Error("No perteneces a esta sala.");
        }

        const updatedRoom = roomManager.sayUno(roomId, player.id);

        console.log(
          `[SAY UNO] ${player.name} dijo UNO en sala ${updatedRoom.id}`,
        );

        io.to(updatedRoom.id).emit("room:updated", {
          ...updatedRoom,
          game: null,
        });

        emitPrivateGameState(io, updatedRoom.id);
      } catch (error) {
        emitGameError(socket, error);
      }
    };

    socket.on("game:say-uno", handleSayUno);
    socket.on("game:sayUno", handleSayUno);

    const handleChallengeUno = (payload: unknown) => {
      try {
        const roomId = readRequiredString(
          readPayloadField(payload, "roomId"),
          "roomId",
        );

        const targetPlayerId = readRequiredString(
          readPayloadField(payload, "targetPlayerId"),
          "targetPlayerId",
        );

        const room = roomManager.getRoom(roomId);

        if (!room) {
          throw new Error("La sala no existe.");
        }

        if (!room.game) {
          throw new Error("No hay estado de partida para esta sala.");
        }

        assertGameIsActive(room.game.status);

        const challenger = room.players.find(
          (player) => player.socketId === socket.id,
        );

        if (!challenger) {
          throw new Error("No perteneces a esta sala.");
        }

        const updatedRoom = roomManager.challengeUno(
          roomId,
          challenger.id,
          targetPlayerId,
        );

        console.log(
          `[CHALLENGE UNO] ${challenger.name} retó a ${targetPlayerId} en sala ${updatedRoom.id}`,
        );

        io.to(updatedRoom.id).emit("room:updated", {
          ...updatedRoom,
          game: null,
        });

        emitPrivateGameState(io, updatedRoom.id);
      } catch (error) {
        emitGameError(socket, error);
      }
    };

    socket.on("game:challenge-uno", handleChallengeUno);
    socket.on("game:challengeUno", handleChallengeUno);

    socket.on("game:back-to-lobby", (payload: unknown) => {
      try {
        const roomId = readRequiredString(
          readPayloadField(payload, "roomId"),
          "roomId",
        );

        const room = roomManager.getRoom(roomId);

        if (!room) {
          throw new Error("La sala no existe.");
        }

        const player = room.players.find(
          (player) => player.socketId === socket.id,
        );

        if (!player) {
          throw new Error("No perteneces a esta sala.");
        }

        const updatedRoom = roomManager.backToLobby(roomId, player.id);

        console.log(
          `[BACK TO LOBBY] Sala ${updatedRoom.id} regreso al lobby por ${player.name}`,
        );

        io.to(updatedRoom.id).emit("room:updated", {
          ...updatedRoom,
          game: null,
        });
        io.to(updatedRoom.id).emit("game:returned-to-lobby");
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
