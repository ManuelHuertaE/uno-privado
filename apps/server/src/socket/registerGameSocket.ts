import type { Server, Socket } from "socket.io";
import type { Card, CardColor } from "@uno/shared";
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

function formatCard(card: Card): string {
  const value =
    card.value === "draw2"
      ? "+2"
      : card.value === "wildDraw4"
        ? "+4"
        : card.value;

  return card.color === "wild" ? value : `${card.color} ${value}`;
}

function emitGameEvent(
  io: Server,
  roomId: string,
  type: string,
  message: string,
): void {
  const event = roomManager.addGameEvent(roomId, type, message);
  io.to(roomId).emit("game:event", event);
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
        emitGameEvent(
          io,
          updatedRoom.id,
          "connection",
          `${playerName} se reconectó.`,
        );

        const roomWithEvents = roomManager.getRoom(updatedRoom.id);
        socket.emit("game:events", roomWithEvents?.events ?? []);

        if (!updatedRoom.paused) {
          io.to(updatedRoom.id).emit("game:resumed", {
            roomId: updatedRoom.id,
          });
          emitGameEvent(
            io,
            updatedRoom.id,
            "pause",
            "La partida fue reanudada.",
          );
        }
      } catch (error) {
        emitGameError(socket, error);
      }
    });

    socket.on("room:leave", (payload: unknown) => {
      try {
        const roomId = readRequiredString(
          readPayloadField(payload, "roomId"),
          "roomId",
        );

        const result = roomManager.leaveRoom(roomId, socket.id);

        socket.leave(roomId);
        socket.emit("room:left", { roomId });

        if (!result.room) {
          console.log(
            `[ROOM LEAVE] ${result.player.name} salió de la sala ${roomId}. Sala eliminada.`,
          );
          return;
        }

        console.log(
          `[ROOM LEAVE] ${result.player.name} salió de la sala ${result.room.id}`,
        );

        io.to(result.room.id).emit("room:updated", {
          ...result.room,
          game: null,
        });

        if (result.started && result.room.paused) {
          io.to(result.room.id).emit("game:paused", {
            roomId: result.room.id,
            reason: result.room.pauseReason,
            pauseType: result.room.pauseType,
          });

          emitGameEvent(
            io,
            result.room.id,
            "connection",
            `${result.player.name} se desconectÃ³. La partida fue pausada.`,
          );
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
        emitGameEvent(io, updatedRoom.id, "game-started", "La partida ha iniciado.");
      } catch (error) {
        emitGameError(socket, error);
      }
    });

    socket.on("game:pause", (payload: unknown) => {
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

        const updatedRoom = roomManager.pauseGame(roomId, player.id);

        io.to(updatedRoom.id).emit("room:updated", {
          ...updatedRoom,
          game: null,
        });
        io.to(updatedRoom.id).emit("game:paused", {
          roomId: updatedRoom.id,
          reason: updatedRoom.pauseReason,
          pauseType: updatedRoom.pauseType,
        });
        emitGameEvent(io, updatedRoom.id, "pause", "La partida fue pausada.");
      } catch (error) {
        emitGameError(socket, error);
      }
    });

    socket.on("game:resume", (payload: unknown) => {
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

        const updatedRoom = roomManager.resumeGame(roomId, player.id);

        io.to(updatedRoom.id).emit("room:updated", {
          ...updatedRoom,
          game: null,
        });
        io.to(updatedRoom.id).emit("game:resumed", {
          roomId: updatedRoom.id,
        });
        emitGameEvent(io, updatedRoom.id, "pause", "La partida fue reanudada.");
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

        const cardToPlay = room.game.players
          .find((gamePlayer) => gamePlayer.id === player.id)
          ?.hand.find((card) => card.id === cardId);

        if (!cardToPlay) {
          throw new Error("El jugador no tiene esa carta.");
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

        if (cardToPlay.value === "draw2") {
          emitGameEvent(
            io,
            updatedRoom.id,
            "draw-stack",
            `${player.name} jugó +2. El acumulado es de ${updatedRoom.game?.drawStack ?? 0} cartas.`,
          );
        } else if (cardToPlay.value === "wildDraw4") {
          emitGameEvent(
            io,
            updatedRoom.id,
            "draw-stack",
            `${player.name} jugó +4. El acumulado es de ${updatedRoom.game?.drawStack ?? 0} cartas.`,
          );
        } else {
          emitGameEvent(
            io,
            updatedRoom.id,
            "card-played",
            `${player.name} jugó ${formatCard(cardToPlay)}.`,
          );
        }

        if (updatedRoom.game?.status === "finished") {
          emitGameEvent(
            io,
            updatedRoom.id,
            "game-finished",
            `${player.name} ganó la partida.`,
          );
        }
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
        emitGameEvent(
          io,
          updatedRoom.id,
          "card-drawn",
          `${player.name} robó una carta.`,
        );
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

        const drawStackAmount = room.game.drawStack;
        const updatedRoom = roomManager.resolveDrawStack(roomId, player.id);

        console.log(
          `[RESOLVE DRAW STACK] ${player.name} robó acumulación en sala ${updatedRoom.id}`,
        );

        io.to(updatedRoom.id).emit("room:updated", {
          ...updatedRoom,
          game: null,
        });

        emitPrivateGameState(io, updatedRoom.id);
        emitGameEvent(
          io,
          updatedRoom.id,
          "draw-stack",
          `${player.name} robó ${drawStackAmount} cartas acumuladas.`,
        );
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
        emitGameEvent(io, updatedRoom.id, "uno", `${player.name} dijo UNO.`);
      } catch (error) {
        emitGameError(socket, error);
      }
    };

    socket.on("game:say-uno", handleSayUno);
    socket.on("game:sayUno", handleSayUno);

    const handleChallengeUno = (payload: unknown) => {
      let failedChallengeRoomId: string | undefined;

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

        failedChallengeRoomId = roomId;
        const targetPlayerName =
          room.game.players.find((player) => player.id === targetPlayerId)
            ?.name ?? targetPlayerId;

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
        emitGameEvent(
          io,
          updatedRoom.id,
          "uno",
          `${targetPlayerName} fue penalizado por no decir UNO.`,
        );
      } catch (error) {
        if (failedChallengeRoomId) {
          emitGameEvent(
            io,
            failedChallengeRoomId,
            "uno",
            "El reto UNO no procedió.",
          );
        }
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
        const disconnectedPlayer = updatedRoom.players.find(
          (player) => player.socketId === socket.id,
        );

        io.to(updatedRoom.id).emit("room:updated", {
          ...updatedRoom,
          game: null,
        });

        if (updatedRoom.paused) {
          io.to(updatedRoom.id).emit("game:paused", {
            roomId: updatedRoom.id,
            reason: updatedRoom.pauseReason,
            pauseType: updatedRoom.pauseType,
          });
        }

        if (disconnectedPlayer && updatedRoom.started) {
          emitGameEvent(
            io,
            updatedRoom.id,
            "connection",
            `${disconnectedPlayer.name} se desconectó. La partida fue pausada.`,
          );
        }
      }
    });
  });
}
