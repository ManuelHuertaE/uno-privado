import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { io } from "socket.io-client";
import "./App.css";

type RoomPlayer = {
  id: string;
  name: string;
  socketId?: string;
};

type Room = {
  id: string;
  hostId: string;
  players: RoomPlayer[];
};

type ServerError = {
  message?: string;
};

const socket = io("http://localhost:3000");

function App() {
  const [playerName, setPlayerName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [message, setMessage] = useState("");
  const [room, setRoom] = useState<Room | null>(null);

  const trimmedPlayerName = playerName.trim();
  const trimmedRoomId = roomId.trim();
  const canCreateRoom = trimmedPlayerName.length > 0;
  const canJoinRoom = canCreateRoom && trimmedRoomId.length > 0;
  const currentPlayer = room?.players.find(
    (player) => player.socketId === socket.id,
  );
  const isHost = Boolean(currentPlayer && currentPlayer.id === room?.hostId);

  useEffect(() => {
    const handleRoomCreated = (createdRoom: Room) => {
      setRoom(createdRoom);
      setRoomId(createdRoom.id);
      setMessage("");
    };

    const handleRoomJoined = (joinedRoom: Room) => {
      setRoom(joinedRoom);
      setRoomId(joinedRoom.id);
      setMessage("");
    };

    const handleRoomUpdated = (updatedRoom: Room) => {
      setRoom(updatedRoom);
      setRoomId(updatedRoom.id);
      setMessage("");
    };

    const handleGameError = (error: ServerError | string) => {
      setMessage(
        typeof error === "string"
          ? error
          : error.message || "Ocurrio un error en el servidor.",
      );
    };

    socket.on("room:created", handleRoomCreated);
    socket.on("room:joined", handleRoomJoined);
    socket.on("room:updated", handleRoomUpdated);
    socket.on("game:error", handleGameError);

    return () => {
      socket.off("room:created", handleRoomCreated);
      socket.off("room:joined", handleRoomJoined);
      socket.off("room:updated", handleRoomUpdated);
      socket.off("game:error", handleGameError);
    };
  }, []);

  const handleCreateRoom = () => {
    if (!canCreateRoom) {
      setMessage("Escribe tu nombre para crear una partida.");
      return;
    }

    setMessage("");
    socket.emit("room:create", {
      playerName: trimmedPlayerName,
    });
  };

  const handleJoinRoom = () => {
    if (!canJoinRoom) {
      setMessage("Escribe tu nombre y el codigo de sala para unirte.");
      return;
    }

    setMessage("");
    socket.emit("room:join", {
      playerName: trimmedPlayerName,
      roomId: trimmedRoomId,
    });
  };

  const handleJoinSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleJoinRoom();
  };

  const handleStartGame = () => {
    if (!room || !isHost) {
      return;
    }

    socket.emit("game:start", {
      roomId: room.id,
    });
  };

  return (
    <main className="app-shell">
      <section className="welcome-panel" aria-labelledby="app-title">
        <header className="welcome-header">
          <h1 id="app-title">UNO Privado</h1>
          <p>Crea una partida o unete a una sala existente</p>
        </header>

        <div className="game-card">
          {room ? (
            <section className="lobby-section" aria-labelledby="lobby-title">
              <div className="room-code">
                <span>Codigo de sala</span>
                <strong>{room.id}</strong>
              </div>

              <div>
                <h2 id="lobby-title">Lobby</h2>
                <p>Jugadores en la sala</p>
              </div>

              <ul className="player-list">
                {room.players.map((player) => (
                  <li key={player.id}>
                    <span>{player.name}</span>
                    {player.id === room.hostId && <small>Anfitrion</small>}
                  </li>
                ))}
              </ul>

              {isHost && (
                <button
                  className="primary-button"
                  type="button"
                  onClick={handleStartGame}
                >
                  Iniciar partida
                </button>
              )}
            </section>
          ) : (
            <>
              <label className="field">
                <span>Nombre del jugador</span>
                <input
                  type="text"
                  value={playerName}
                  onChange={(event) => {
                    setPlayerName(event.target.value);
                    setMessage("");
                  }}
                  placeholder="Tu nombre"
                  autoComplete="name"
                  required
                />
              </label>

              <button
                className="primary-button"
                type="button"
                onClick={handleCreateRoom}
                disabled={!canCreateRoom}
              >
                Crear partida
              </button>

              <form className="join-section" onSubmit={handleJoinSubmit}>
                <div>
                  <h2>Unirse a partida</h2>
                  <p>Ingresa el ID o codigo de la sala.</p>
                </div>

                <label className="field">
                  <span>ID/codigo de sala</span>
                  <input
                    type="text"
                    value={roomId}
                    onChange={(event) => {
                      setRoomId(event.target.value.toUpperCase());
                      setMessage("");
                    }}
                    placeholder="Ej. ABC123"
                    required
                  />
                </label>

                <button type="submit" disabled={!canJoinRoom}>
                  Unirse a partida
                </button>
              </form>
            </>
          )}

          {message && <p className="form-message">{message}</p>}
        </div>
      </section>
    </main>
  );
}

export default App;
