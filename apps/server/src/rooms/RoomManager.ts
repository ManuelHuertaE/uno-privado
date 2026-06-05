// import { randomUUID } from "node:crypto";
import type { Room, RoomPlayer } from "./types";

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

export class RoomManager {
  private readonly rooms = new Map<string, Room>();

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
    };

    this.rooms.set(room.id, room);

    return room;
  }

  joinRoom(roomId: string, playerName: string, socketId: string): Room {
    const room = this.rooms.get(roomId);

    if (!room) {
      throw new Error("La sala no existe.");
    }

    if (room.started) {
      throw new Error("La sala ya inicio.");
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

  removePlayerBySocket(socketId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      const playerIndex = room.players.findIndex(
        (player) => player.socketId === socketId
      );

      if (playerIndex === -1) {
        continue;
      }

      const players = room.players.filter(
        (player) => player.socketId !== socketId
      );

      if (players.length === 0) {
        this.rooms.delete(room.id);
        return undefined;
      }

      const updatedRoom: Room = {
        ...room,
        hostId:
          room.hostId === room.players[playerIndex].id
            ? players[0].id
            : room.hostId,
        players,
      };

      this.rooms.set(room.id, updatedRoom);

      return updatedRoom;
    }

    return undefined;
  }
}

export const roomManager = new RoomManager();
