import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { io } from "socket.io-client";
import { FinalGameScreen } from "./components/FinalGameScreen";
import "./App.css";

type CardColor = "red" | "blue" | "green" | "yellow" | "wild";
type PlayableColor = Exclude<CardColor, "wild">;

type Card = {
  id: string;
  color: CardColor;
  value: string;
};

type GamePlayer = {
  id: string;
  name: string;
  hand: Card[];
  handCount?: number;
};

type GameState = {
  id: string;
  players: GamePlayer[];
  drawPile: Card[];
  discardPile: Card[];
  currentPlayerIndex: number;
  direction: 1 | -1;
  currentColor: CardColor;
  status: "waiting" | "playing" | "finished";
  drawStack: number;
  unoDeclaredPlayerIds: string[];
  unoPenaltyPlayerIds: string[];
  winnerId?: string;
};

type RoomPlayer = {
  id: string;
  name: string;
  socketId?: string;
};

type Room = {
  id: string;
  hostId: string;
  players: RoomPlayer[];
  started?: boolean;
  paused?: boolean;
  pauseReason?: string;
  pauseType?: "manual" | "disconnect";
  disconnectedPlayerIds?: string[];
};

type ServerError = {
  message?: string;
};

type PauseEvent = {
  roomId?: string;
  reason?: string;
  pauseType?: "manual" | "disconnect";
};

const socket = io("http://localhost:3000");

function formatCard(card: Card | undefined): string {
  if (!card) {
    return "Sin carta";
  }

  return card.color === "wild" ? card.value : `${card.color} ${card.value}`;
}

function isWildCard(card: Card): boolean {
  return card.value === "wild" || card.value === "wildDraw4";
}

function App() {
  const [playerName, setPlayerName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [message, setMessage] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [socketId, setSocketId] = useState(socket.id);
  const [selectedColor, setSelectedColor] = useState<PlayableColor | "">("");
  const [isReconnecting, setIsReconnecting] = useState(false);

  const trimmedPlayerName = playerName.trim();
  const trimmedRoomId = roomId.trim();
  const canCreateRoom = trimmedPlayerName.length > 0;
  const canJoinRoom = canCreateRoom && trimmedRoomId.length > 0;
  const canReconnectRoom = canJoinRoom && !isReconnecting;
  const currentPlayer = room?.players.find(
    (player) => player.socketId === socketId,
  );
  const isHost = Boolean(currentPlayer && currentPlayer.id === room?.hostId);
  const canStartGame = Boolean(isHost && room && room.players.length >= 2);
  const isRoomPaused = Boolean(room?.paused);
  const disconnectedPlayerIds = room?.disconnectedPlayerIds ?? [];
  const disconnectedPlayers =
    room?.players.filter((player) =>
      disconnectedPlayerIds.includes(player.id),
    ) ?? [];
  const canResumeGame = isRoomPaused && disconnectedPlayerIds.length === 0;
  const pauseReason =
    room?.pauseReason ??
    (room?.pauseType === "disconnect"
      ? "Esperando reconexión de jugadores"
      : "Pausada por el anfitrión");
  const currentGamePlayer = gameState?.players[gameState.currentPlayerIndex];
  const localGamePlayer = gameState?.players.find(
    (player) => player.id === currentPlayer?.id,
  );
  const isLocalTurn = Boolean(
    currentGamePlayer && currentGamePlayer.id === localGamePlayer?.id,
  );
  const isGameFinished = gameState?.status === "finished";
  const canDrawCard = Boolean(
    gameState &&
      !isGameFinished &&
      !isRoomPaused &&
      isLocalTurn &&
      gameState.drawStack === 0,
  );
  const topDiscard = gameState?.discardPile.at(-1);
  const getCardCount = (player: GamePlayer) =>
    player.handCount ?? player.hand.length;

  useEffect(() => {
    const handleConnect = () => {
      setSocketId(socket.id);
    };

    const handleDisconnect = () => {
      setSocketId(undefined);
    };

    const handleRoomCreated = (createdRoom: Room) => {
      setRoom(createdRoom);
      setRoomId(createdRoom.id);
      setGameState(null);
      setIsReconnecting(false);
      setMessage("");
    };

    const handleRoomJoined = (joinedRoom: Room) => {
      setRoom(joinedRoom);
      setRoomId(joinedRoom.id);
      setGameState(null);
      setIsReconnecting(false);
      setMessage("");
    };

    const handleRoomUpdated = (updatedRoom: Room) => {
      setRoom(updatedRoom);
      setRoomId(updatedRoom.id);
      setIsReconnecting(false);
      setMessage("");
    };

    const handleRoomReconnected = (reconnectedRoom: Room) => {
      setRoom(reconnectedRoom);
      setRoomId(reconnectedRoom.id);
      setIsReconnecting(false);
      setMessage("");
    };

    const handleGameStarted = (startedGame: GameState) => {
      setGameState(startedGame);
      setMessage("");
    };

    const handleGameUpdated = (updatedGame: GameState) => {
      setGameState(updatedGame);
      setIsReconnecting(false);
      setMessage("");
    };

    const handleGameFinished = (finishedGame: GameState) => {
      setGameState(finishedGame);
      setMessage("");
    };

    const handleReturnedToLobby = () => {
      setGameState(null);
      setMessage("");
    };

    const handleGamePaused = (event: PauseEvent | undefined) => {
      setRoom((currentRoom) => {
        if (!currentRoom || (event?.roomId && event.roomId !== currentRoom.id)) {
          return currentRoom;
        }

        return {
          ...currentRoom,
          paused: true,
          pauseReason: event?.reason ?? currentRoom.pauseReason,
          pauseType: event?.pauseType ?? currentRoom.pauseType,
        };
      });
      setIsReconnecting(false);
      setMessage("");
    };

    const handleGameResumed = (event: { roomId?: string } | undefined) => {
      setRoom((currentRoom) => {
        if (!currentRoom || (event?.roomId && event.roomId !== currentRoom.id)) {
          return currentRoom;
        }

        return {
          ...currentRoom,
          paused: false,
          pauseReason: undefined,
          pauseType: undefined,
        };
      });
      setIsReconnecting(false);
      setMessage("");
    };

    const handleGameError = (error: ServerError | string) => {
      setIsReconnecting(false);
      setMessage(
        typeof error === "string"
          ? error
          : error.message || "Ocurrio un error en el servidor.",
      );
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("room:created", handleRoomCreated);
    socket.on("room:joined", handleRoomJoined);
    socket.on("room:updated", handleRoomUpdated);
    socket.on("room:reconnected", handleRoomReconnected);
    socket.on("game:started", handleGameStarted);
    socket.on("game:updated", handleGameUpdated);
    socket.on("game:finished", handleGameFinished);
    socket.on("game:returned-to-lobby", handleReturnedToLobby);
    socket.on("game:paused", handleGamePaused);
    socket.on("game:resumed", handleGameResumed);
    socket.on("game:error", handleGameError);
    socket.on("room:error", handleGameError);

    if (socket.connected) {
      setSocketId(socket.id);
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("room:created", handleRoomCreated);
      socket.off("room:joined", handleRoomJoined);
      socket.off("room:updated", handleRoomUpdated);
      socket.off("room:reconnected", handleRoomReconnected);
      socket.off("game:started", handleGameStarted);
      socket.off("game:updated", handleGameUpdated);
      socket.off("game:finished", handleGameFinished);
      socket.off("game:returned-to-lobby", handleReturnedToLobby);
      socket.off("game:paused", handleGamePaused);
      socket.off("game:resumed", handleGameResumed);
      socket.off("game:error", handleGameError);
      socket.off("room:error", handleGameError);
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

  const handleReconnectRoom = () => {
    if (!canJoinRoom) {
      setMessage("Escribe tu nombre y el codigo de sala para reconectar.");
      return;
    }

    setMessage("Reconectando...");
    setIsReconnecting(true);
    socket.emit("room:reconnect", {
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

  const handlePauseGame = () => {
    if (!room || !isHost || isRoomPaused || isGameFinished) {
      return;
    }

    setMessage("");
    socket.emit("game:pause", {
      roomId: room.id,
    });
  };

  const handleResumeGame = () => {
    if (!room || !isHost || !isRoomPaused || !canResumeGame || isGameFinished) {
      return;
    }

    setMessage("");
    socket.emit("game:resume", {
      roomId: room.id,
    });
  };

  const handlePlayCard = (card: Card) => {
    if (!room || isGameFinished || isRoomPaused) {
      return;
    }

    if (isWildCard(card) && !selectedColor) {
      setMessage("Elige un color antes de jugar un comodin.");
      return;
    }

    setMessage("");
    socket.emit("game:play-card", {
      roomId: room.id,
      cardId: card.id,
      chosenColor: isWildCard(card) ? selectedColor : undefined,
    });
  };

  const handleDrawCard = () => {
    if (!room || isGameFinished || isRoomPaused || !canDrawCard) {
      return;
    }

    setMessage("");
    socket.emit("game:draw-card", {
      roomId: room.id,
    });
  };

  const handleResolveDrawStack = () => {
    if (
      !room ||
      !gameState ||
      isGameFinished ||
      isRoomPaused ||
      gameState.drawStack <= 0
    ) {
      return;
    }

    setMessage("");
    socket.emit("game:resolve-draw-stack", {
      roomId: room.id,
    });
  };

  const handleSayUno = () => {
    if (!room || isGameFinished || isRoomPaused) {
      return;
    }

    setMessage("");
    socket.emit("game:say-uno", {
      roomId: room.id,
    });
  };

  const handleChallengeUno = (targetPlayerId: string) => {
    if (!room || isGameFinished || isRoomPaused) {
      return;
    }

    setMessage("");
    socket.emit("game:challenge-uno", {
      roomId: room.id,
      targetPlayerId,
    });
  };

  const handleBackToLobby = () => {
    if (!room || !isGameFinished) {
      return;
    }

    setMessage("");
    socket.emit("game:back-to-lobby", {
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
          {room && gameState ? (
            isGameFinished ? (
              <FinalGameScreen
                roomId={room.id}
                gameState={gameState}
                roomPlayers={room.players}
                localPlayerId={currentPlayer?.id}
                canBackToLobby={isHost}
                onBackToLobby={handleBackToLobby}
              />
            ) : (
            <section className="game-section" aria-labelledby="game-title">
              <div className="room-code">
                <span>Codigo de sala</span>
                <strong>{room.id}</strong>
              </div>

              <div>
                <h2 id="game-title">Partida</h2>
                <p>Estado temporal de juego</p>
              </div>

              {isHost && (
                <div className="pause-actions">
                  {isRoomPaused ? (
                    <button
                      type="button"
                      onClick={handleResumeGame}
                      disabled={!canResumeGame}
                    >
                      Reanudar partida
                    </button>
                  ) : (
                    <button type="button" onClick={handlePauseGame}>
                      Pausar partida
                    </button>
                  )}
                </div>
              )}

              <dl className="game-facts">
                <div>
                  <dt>Jugador actual</dt>
                  <dd>{currentGamePlayer?.name ?? "Sin jugador"}</dd>
                </div>
                <div>
                  <dt>Direccion</dt>
                  <dd>{gameState.direction === 1 ? "Horario" : "Antihorario"}</dd>
                </div>
                <div>
                  <dt>Color actual</dt>
                  <dd>{gameState.currentColor}</dd>
                </div>
                <div>
                  <dt>Carta superior</dt>
                  <dd>{formatCard(topDiscard)}</dd>
                </div>
              </dl>

              {isRoomPaused && (
                <section className="pause-panel" aria-labelledby="pause-title">
                  <h3 id="pause-title">Partida pausada</h3>
                  <p>{pauseReason}</p>
                  {disconnectedPlayers.length > 0 && (
                    <div className="disconnected-players">
                      <span>Jugadores desconectados</span>
                      <ul>
                        {disconnectedPlayers.map((player) => (
                          <li key={player.id}>{player.name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!isHost && (
                    <p>Esperando a que el anfitrión reanude la partida.</p>
                  )}
                  {isHost && !canResumeGame && (
                    <p>
                      La partida no puede reanudarse hasta que todos los
                      jugadores estén conectados.
                    </p>
                  )}
                </section>
              )}

              {gameState.drawStack > 0 && (
                <section
                  className="draw-stack-panel"
                  aria-labelledby="draw-stack-title"
                >
                  <h3 id="draw-stack-title">Robo acumulado</h3>
                  {isLocalTurn ? (
                    <>
                      <p>
                        Debes robar {gameState.drawStack} cartas o acumular con
                        otra carta valida.
                      </p>
                      <button
                        type="button"
                        onClick={handleResolveDrawStack}
                        disabled={isRoomPaused}
                      >
                        Robar {gameState.drawStack} cartas
                      </button>
                    </>
                  ) : (
                    <p>
                      Esperando a que el jugador actual responda al +2/+4.
                    </p>
                  )}
                </section>
              )}

              <div>
                <h3>Jugadores</h3>
                <ul className="player-list">
                  {gameState.players.map((player) => (
                    <li key={player.id}>
                      <span>{player.name}</span>
                      <div className="player-meta">
                        <small>{getCardCount(player)} cartas</small>
                        {player.id !== localGamePlayer?.id && (
                          <button
                            type="button"
                            onClick={() => handleChallengeUno(player.id)}
                            disabled={isRoomPaused}
                          >
                            Retar UNO
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <label className="field">
                <span>Color para comodines</span>
                <select
                  value={selectedColor}
                  onChange={(event) =>
                    setSelectedColor(event.target.value as PlayableColor | "")
                  }
                >
                  <option value="">Elegir color</option>
                  <option value="red">red</option>
                  <option value="blue">blue</option>
                  <option value="green">green</option>
                  <option value="yellow">yellow</option>
                </select>
              </label>

              <div>
                <h3>Tu mano</h3>
                <div className="hand-actions">
                  {localGamePlayer?.hand.length ? (
                    localGamePlayer.hand.map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => handlePlayCard(card)}
                        disabled={!isLocalTurn || isRoomPaused}
                      >
                        {formatCard(card)}
                      </button>
                    ))
                  ) : (
                    <p className="empty-state">No hay cartas para mostrar.</p>
                  )}
                </div>
              </div>

              <div className="game-actions">
                {gameState.drawStack === 0 && (
                  <button
                    type="button"
                    onClick={handleDrawCard}
                    disabled={!canDrawCard}
                  >
                    Robar carta
                  </button>
                )}
                <button type="button" onClick={handleSayUno} disabled={isRoomPaused}>
                  Decir UNO
                </button>
              </div>
            </section>
            )
          ) : room ? (
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
                  disabled={!canStartGame}
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

              <section
                className="reconnect-section"
                aria-labelledby="reconnect-title"
              >
                <div>
                  <h2 id="reconnect-title">¿Te desconectaste?</h2>
                  <p>
                    Usa esta opcion si perdiste conexion durante una partida.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleReconnectRoom}
                  disabled={!canReconnectRoom}
                >
                  {isReconnecting ? "Reconectando..." : "Reconectar a partida"}
                </button>
              </section>
            </>
          )}

          {message && <p className="form-message">{message}</p>}
        </div>
      </section>
    </main>
  );
}

export default App;
