// import { randomUUID } from "node:crypto";
import {
  createGame,
  drawCards,
  drawForTurn as drawForTurnCore,
  playCard as playCardCore,
  resolveDrawStack as resolveDrawStackCore,
} from "@uno/game-core";
import type { Room, RoomPlayer } from "./types";
import type { CardColor, GameEvent } from "@uno/shared";

const MAX_GAME_EVENTS = 30;
const MAX_ROOM_PLAYERS = 4;

type LeaveRoomResult = {
  player: RoomPlayer;
  room?: Room;
  started: boolean;
};

function createShortId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function createPlayerId(): string {
  return `player_${Math.random().toString(36).slice(2, 12)}`;
}

function createPlayer(name: string, socketId: string): RoomPlayer {
  return {
    id: createPlayerId(),
    name,
    socketId,
  };
}

function createGameEventId(): string {
  return `event_${Math.random().toString(36).slice(2, 12)}`;
}

export class RoomManager {
  private readonly rooms = new Map<string, Room>();

  private removePlayerFromRoom(
    room: Room,
    socketId: string,
    clearSocketId = false,
  ): LeaveRoomResult {
    const playerIndex = room.players.findIndex(
      (player) => player.socketId === socketId,
    );

    if (playerIndex === -1) {
      throw new Error("No perteneces a esta sala.");
    }

    const leavingPlayer = room.players[playerIndex];

    if (room.started) {
      const players = clearSocketId
        ? room.players.map((player) =>
            player.id === leavingPlayer.id
              ? { ...player, socketId: "" }
              : player,
          )
        : room.players;

      const disconnectedPlayerIds = room.disconnectedPlayerIds.includes(
        leavingPlayer.id,
      )
        ? room.disconnectedPlayerIds
        : [...room.disconnectedPlayerIds, leavingPlayer.id];

      const updatedRoom: Room = {
        ...room,
        players,
        paused: true,
        pauseReason: "Jugador desconectado",
        pauseType: "disconnect",
        disconnectedPlayerIds,
      };

      this.rooms.set(room.id, updatedRoom);

      return {
        player: leavingPlayer,
        room: updatedRoom,
        started: true,
      };
    }

    const players = room.players.filter(
      (player) => player.socketId !== socketId,
    );

    if (players.length === 0) {
      this.rooms.delete(room.id);

      return {
        player: leavingPlayer,
        started: false,
      };
    }

    const updatedRoom: Room = {
      ...room,
      hostId: room.hostId === leavingPlayer.id ? players[0].id : room.hostId,
      players,
    };

    this.rooms.set(room.id, updatedRoom);

    return {
      player: leavingPlayer,
      room: updatedRoom,
      started: false,
    };
  }

  private hasPlayerWithSocket(socketId: string): boolean {
    for (const room of this.rooms.values()) {
      if (room.players.some((player) => player.socketId === socketId)) {
        return true;
      }
    }

    return false;
  }

  createRoom(hostName: string, socketId: string): Room {
    if (this.hasPlayerWithSocket(socketId)) {
      throw new Error("Este socket ya esta en una sala.");
    }

    let roomId = createShortId();

    while (this.rooms.has(roomId)) {
      roomId = createShortId();
    }

    const host = createPlayer(hostName, socketId);
    const room: Room = {
      id: roomId,
      hostId: host.id,
      players: [host],
      started: false,
      game: null,
      paused: false,
      pauseReason: undefined,
      pauseType: undefined,
      disconnectedPlayerIds: [],
      events: [],
    };

    this.rooms.set(room.id, room);

    return room;
  }

  joinRoom(roomId: string, playerName: string, socketId: string): Room {
    const room = this.rooms.get(roomId);

    if (!room) {
      throw new Error("La sala no existe.");
    }

    if (room.paused) {
      throw new Error("La partida está pausada.");
    }

    if (room.started) {
      throw new Error("La sala ya inicio.");
    }

    if (room.players.length >= MAX_ROOM_PLAYERS) {
      throw new Error("La sala ya alcanzó el máximo de 4 jugadores.");
    }

    if (this.hasPlayerWithSocket(socketId)) {
      throw new Error("Este socket ya esta en una sala.");
    }

    const updatedRoom: Room = {
      ...room,
      players: [...room.players, createPlayer(playerName, socketId)],
    };

    this.rooms.set(room.id, updatedRoom);

    return updatedRoom;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  leaveRoom(roomId: string, socketId: string): LeaveRoomResult {
    const room = this.rooms.get(roomId);

    if (!room) {
      throw new Error("La sala no existe.");
    }

    return this.removePlayerFromRoom(room, socketId, true);
  }

  removePlayerBySocket(socketId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      const hasPlayer = room.players.some(
        (player) => player.socketId === socketId,
      );

      if (hasPlayer) {
        const result = this.removePlayerFromRoom(room, socketId);
        return result.room;
      }
    }

    return undefined;
  }

  startGame(roomId: string, playerId: string): Room {
    const room = this.rooms.get(roomId);

    if (!room) {
      throw new Error("La sala no existe.");
    }

    if (room.paused) {
      throw new Error("La partida está pausada.");
    }

    if (room.started) {
      throw new Error("La partida ya inició.");
    }

    if (room.hostId !== playerId) {
      throw new Error("Solo el host puede iniciar la partida.");
    }

    if (room.players.length < 2) {
      throw new Error("Se necesitan al menos 2 jugadores para iniciar.");
    }

    const game = createGame({
      players: room.players.map((player) => ({
        id: player.id,
        name: player.name,
      })),
    });

    const updatedRoom: Room = {
      ...room,
      started: true,
      game,
      paused: false,
      pauseReason: undefined,
      pauseType: undefined,
      disconnectedPlayerIds: [],
      events: [],
    };

    this.rooms.set(room.id, updatedRoom);

    return updatedRoom;
  }

  drawForTurn(roomId: string, playerId: string): Room {
    const room = this.rooms.get(roomId);

    if (!room) {
      throw new Error("La sala no existe.");
    }

    if (room.paused) {
      throw new Error("La partida está pausada.");
    }

    if (!room.started || !room.game) {
      throw new Error("La partida no ha iniciado.");
    }

    if (room.game.status !== "playing") {
      throw new Error("La partida no está en curso.");
    }

    const currentPlayer = room.game.players[room.game.currentPlayerIndex];

    if (!currentPlayer) {
      throw new Error("No hay jugador actual.");
    }

    if (currentPlayer.id !== playerId) {
      throw new Error("No es el turno de este jugador.");
    }

    if (room.game.drawStack > 0) {
      throw new Error(
        "Hay una acumulación de robo activa. Debes responder con una carta de robo o resolver la acumulación.",
      );
    }

    const updatedGame = drawForTurnCore({
      game: room.game,
      playerId,
    });

    const updatedRoom: Room = {
      ...room,
      game: updatedGame,
    };

    this.rooms.set(room.id, updatedRoom);

    return updatedRoom;
  }

  resolveDrawStack(roomId: string, playerId: string): Room {
    const room = this.rooms.get(roomId);

    if (!room) {
      throw new Error("La sala no existe.");
    }

    if (room.paused) {
      throw new Error("La partida está pausada.");
    }

    if (!room.started || !room.game) {
      throw new Error("La partida no ha iniciado.");
    }

    if (room.game.status !== "playing") {
      throw new Error("La partida no está en curso.");
    }

    const currentPlayer = room.game.players[room.game.currentPlayerIndex];

    if (!currentPlayer) {
      throw new Error("No hay jugador actual.");
    }

    if (currentPlayer.id !== playerId) {
      throw new Error("No es el turno de este jugador.");
    }

    if (room.game.drawStack <= 0) {
      throw new Error("No hay acumulación de robo activa.");
    }

    const updatedGame = resolveDrawStackCore({
      game: room.game,
      playerId,
    });

    const updatedRoom: Room = {
      ...room,
      game: updatedGame,
    };

    this.rooms.set(room.id, updatedRoom);

    return updatedRoom;
  }

  playCard(
    roomId: string,
    playerId: string,
    cardId: string,
    chosenColor?: Exclude<CardColor, "wild">,
  ): Room {
    const room = this.rooms.get(roomId);

    if (!room) {
      throw new Error("La sala no existe.");
    }

    if (room.paused) {
      throw new Error("La partida está pausada.");
    }

    if (!room.started || !room.game) {
      throw new Error("La partida no ha iniciado.");
    }

    if (room.game.status === "finished") {
      throw new Error("La partida ya finalizó.");
    }

    const updatedGame = playCardCore({
      game: room.game,
      playerId,
      cardId,
      chosenColor,
    });

    const updatedRoom: Room = {
      ...room,
      game: updatedGame,
    };

    this.rooms.set(room.id, updatedRoom);

    return updatedRoom;
  }

  sayUno(roomId: string, playerId: string): Room {
    const room = this.rooms.get(roomId);

    if (!room) {
      throw new Error("La sala no existe.");
    }

    if (room.paused) {
      throw new Error("La partida está pausada.");
    }

    if (!room.started || !room.game) {
      throw new Error("La partida no ha iniciado.");
    }

    if (room.game.status !== "playing") {
      throw new Error("La partida no está en curso.");
    }

    const player = room.game.players.find((player) => player.id === playerId);

    if (!player) {
      throw new Error("El jugador no existe en la partida.");
    }

    if (player.hand.length !== 2) {
      throw new Error(
        "Solo puedes decir UNO cuando tienes exactamente 2 cartas.",
      );
    }

    const unoDeclaredPlayerIds = room.game.unoDeclaredPlayerIds.includes(
      playerId,
    )
      ? room.game.unoDeclaredPlayerIds
      : [...room.game.unoDeclaredPlayerIds, playerId];

    const updatedRoom: Room = {
      ...room,
      game: {
        ...room.game,
        unoDeclaredPlayerIds,
        unoPenaltyPlayerIds: room.game.unoPenaltyPlayerIds.filter(
          (penaltyPlayerId) => penaltyPlayerId !== playerId,
        ),
      },
    };

    this.rooms.set(room.id, updatedRoom);

    return updatedRoom;
  }

  challengeUno(
    roomId: string,
    challengerId: string,
    targetPlayerId: string,
  ): Room {
    const room = this.rooms.get(roomId);

    if (!room) {
      throw new Error("La sala no existe.");
    }

    if (room.paused) {
      throw new Error("La partida está pausada.");
    }

    if (!room.started || !room.game) {
      throw new Error("La partida no ha iniciado.");
    }

    if (room.game.status !== "playing") {
      throw new Error("La partida no está en curso.");
    }

    const challenger = room.game.players.find(
      (player) => player.id === challengerId,
    );

    if (!challenger) {
      throw new Error("El jugador que reta no existe en la partida.");
    }

    const targetPlayer = room.game.players.find(
      (player) => player.id === targetPlayerId,
    );

    if (!targetPlayer) {
      throw new Error("El jugador retado no existe en la partida.");
    }

    if (challengerId === targetPlayerId) {
      throw new Error("No puedes retarte a ti mismo.");
    }

    if (targetPlayer.hand.length !== 1) {
      throw new Error("Solo puedes retar a un jugador que tenga una carta.");
    }

    if (!room.game.unoPenaltyPlayerIds.includes(targetPlayerId)) {
      throw new Error("Ese jugador no puede ser penalizado por UNO.");
    }

    const gameAfterPenalty = drawCards({
      game: room.game,
      playerId: targetPlayerId,
      amount: 2,
      clearDrawStack: false,
      advanceTurn: false,
    });

    const updatedRoom: Room = {
      ...room,
      game: {
        ...gameAfterPenalty,
        unoDeclaredPlayerIds: gameAfterPenalty.unoDeclaredPlayerIds.filter(
          (declaredPlayerId) => declaredPlayerId !== targetPlayerId,
        ),
        unoPenaltyPlayerIds: gameAfterPenalty.unoPenaltyPlayerIds.filter(
          (penaltyPlayerId) => penaltyPlayerId !== targetPlayerId,
        ),
      },
    };

    this.rooms.set(room.id, updatedRoom);

    return updatedRoom;
  }

  backToLobby(roomId: string, playerId: string): Room {
    const room = this.rooms.get(roomId);

    if (!room) {
      throw new Error("La sala no existe.");
    }

    if (!room.started || !room.game) {
      throw new Error("La partida no ha iniciado.");
    }

    if (room.hostId !== playerId) {
      throw new Error("Solo el anfitrion puede volver al lobby.");
    }

    if (room.game.status !== "finished") {
      throw new Error("La partida todavia no ha finalizado.");
    }

    const updatedRoom: Room = {
      ...room,
      started: false,
      game: null,
      paused: false,
      pauseReason: undefined,
      pauseType: undefined,
      disconnectedPlayerIds: [],
      events: [],
    };

    this.rooms.set(room.id, updatedRoom);

    return updatedRoom;
  }

  pauseGame(roomId: string, playerId: string): Room {
    const room = this.rooms.get(roomId);

    if (!room) {
      throw new Error("La sala no existe.");
    }

    if (!room.started || !room.game) {
      throw new Error("La partida no ha iniciado.");
    }

    if (room.game.status === "finished") {
      throw new Error("La partida ya finalizó.");
    }

    if (room.hostId !== playerId) {
      throw new Error("Solo el anfitrión puede pausar la partida.");
    }

    if (room.paused) {
      throw new Error("La partida ya está pausada.");
    }

    const updatedRoom: Room = {
      ...room,
      paused: true,
      pauseReason: "Pausada por el anfitrión",
      pauseType: "manual",
    };

    this.rooms.set(room.id, updatedRoom);

    return updatedRoom;
  }

  resumeGame(roomId: string, playerId: string): Room {
    const room = this.rooms.get(roomId);

    if (!room) {
      throw new Error("La sala no existe.");
    }

    if (!room.started || !room.game) {
      throw new Error("La partida no ha iniciado.");
    }

    if (room.game.status === "finished") {
      throw new Error("La partida ya finalizó.");
    }

    if (room.hostId !== playerId) {
      throw new Error("Solo el anfitrión puede reanudar la partida.");
    }

    if (!room.paused) {
      throw new Error("La partida no está pausada.");
    }

    if (room.disconnectedPlayerIds.length > 0 || room.pauseType === "disconnect") {
      throw new Error(
        "La partida no puede reanudarse hasta que todos los jugadores estén conectados.",
      );
    }

    const updatedRoom: Room = {
      ...room,
      paused: false,
      pauseReason: undefined,
      pauseType: undefined,
    };

    this.rooms.set(room.id, updatedRoom);

    return updatedRoom;
  }

  reconnectPlayer(roomId: string, playerName: string, socketId: string): Room {
    const room = this.rooms.get(roomId);

    if (!room) {
      throw new Error("La sala no existe.");
    }

    if (!room.started || !room.game) {
      throw new Error("No hay una partida pausada para reconectar.");
    }

    if (!room.paused) {
      throw new Error("No hay una partida pausada para reconectar.");
    }

    const connectedPlayerWithSameName = room.players.find(
      (player) =>
        player.name === playerName &&
        !room.disconnectedPlayerIds.includes(player.id),
    );

    if (connectedPlayerWithSameName) {
      throw new Error("Ese jugador ya está conectado.");
    }

    const player = room.players.find(
      (player) =>
        player.name === playerName &&
        room.disconnectedPlayerIds.includes(player.id),
    );

    if (!player) {
      throw new Error("No se encontró un jugador desconectado con ese nombre.");
    }

    const players = room.players.map((roomPlayer) =>
      roomPlayer.id === player.id ? { ...roomPlayer, socketId } : roomPlayer,
    );

    const disconnectedPlayerIds = room.disconnectedPlayerIds.filter(
      (playerId) => playerId !== player.id,
    );

    const updatedRoom: Room = {
      ...room,
      players,
      disconnectedPlayerIds,
      paused: disconnectedPlayerIds.length > 0,
      pauseReason:
        disconnectedPlayerIds.length > 0 ? "Jugador desconectado" : undefined,
      pauseType: disconnectedPlayerIds.length > 0 ? "disconnect" : undefined,
    };

    this.rooms.set(room.id, updatedRoom);

    return updatedRoom;
  }

  addGameEvent(roomId: string, type: string, message: string): GameEvent {
    const room = this.rooms.get(roomId);

    if (!room) {
      throw new Error("La sala no existe.");
    }

    const event: GameEvent = {
      id: createGameEventId(),
      type,
      message,
      createdAt: new Date().toISOString(),
    };

    const updatedRoom: Room = {
      ...room,
      events: [...room.events, event].slice(-MAX_GAME_EVENTS),
    };

    this.rooms.set(room.id, updatedRoom);

    return event;
  }
}

export const roomManager = new RoomManager();
