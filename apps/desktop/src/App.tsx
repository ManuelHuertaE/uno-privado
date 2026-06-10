import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import { FinalGameScreen } from "./components/FinalGameScreen";
import { GameTable } from "./components/GameTable";
import type {
  Card,
  GameEvent,
  GamePlayer,
  GameState,
  PlayableColor,
  Room,
} from "./components/gameTypes";
import {
  DEFAULT_SERVER_URL,
  getStoredServerUrl,
  saveServerUrl,
} from "./lib/serverConfig";
import "./App.css";

type ServerError = {
  message?: string;
};

type PauseEvent = {
  roomId?: string;
  reason?: string;
  pauseType?: "manual" | "disconnect";
};

const MAX_ROOM_PLAYERS = 4;
type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

function isWildCard(card: Card): boolean {
  return card.value === "wild" || card.value === "wildDraw4";
}

function App() {
  const [serverUrl, setServerUrl] = useState(getStoredServerUrl);
  const [serverUrlInput, setServerUrlInput] = useState(serverUrl);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [socket, setSocket] = useState<Socket>(() => io(serverUrl));
  const [playerName, setPlayerName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [message, setMessage] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [socketId, setSocketId] = useState<string | undefined>(socket.id);
  const [pendingWildCard, setPendingWildCard] = useState<Card | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [gameEvents, setGameEvents] = useState<GameEvent[]>([]);
  const [unoAlert, setUnoAlert] = useState<GameEvent | null>(null);

  const trimmedPlayerName = playerName.trim();
  const trimmedRoomId = roomId.trim();
  const isSocketConnected = connectionStatus === "connected";
  const canCreateRoom = trimmedPlayerName.length > 0 && isSocketConnected;
  const canJoinRoom =
    trimmedPlayerName.length > 0 &&
    trimmedRoomId.length > 0 &&
    isSocketConnected;
  const canReconnectRoom = canJoinRoom && !isReconnecting;
  const currentPlayer = room?.players.find(
    (player) => player.socketId === socketId,
  );
  const isHost = Boolean(currentPlayer && currentPlayer.id === room?.hostId);
  const canStartGame = Boolean(isHost && room && room.players.length >= 2);
  const isLobbyFull = Boolean(room && room.players.length >= MAX_ROOM_PLAYERS);
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
      ? "Esperando reconexion de jugadores"
      : "Pausada por el anfitrion");
  const currentGamePlayer = gameState?.players[gameState.currentPlayerIndex];
  const localGamePlayer: GamePlayer | undefined = gameState?.players.find(
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

  useEffect(() => {
    setConnectionStatus(socket.connected ? "connected" : "connecting");
    setSocketId(socket.id);

    const handleConnect = () => {
      setSocketId(socket.id);
      setConnectionStatus("connected");
    };

    const handleDisconnect = () => {
      setSocketId(undefined);
      setConnectionStatus("disconnected");
    };

    const handleConnectError = () => {
      setSocketId(undefined);
      setConnectionStatus("error");
      setMessage("No se pudo conectar al servidor.");
    };

    const handleRoomCreated = (createdRoom: Room) => {
      setRoom(createdRoom);
      setRoomId(createdRoom.id);
      setGameState(null);
      setPendingWildCard(null);
      setGameEvents([]);
      setUnoAlert(null);
      setIsReconnecting(false);
      setMessage("");
    };

    const handleRoomJoined = (joinedRoom: Room) => {
      setRoom(joinedRoom);
      setRoomId(joinedRoom.id);
      setGameState(null);
      setPendingWildCard(null);
      setGameEvents([]);
      setUnoAlert(null);
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

    const handleRoomLeft = () => {
      setRoom(null);
      setGameState(null);
      setPendingWildCard(null);
      setGameEvents([]);
      setUnoAlert(null);
      setIsReconnecting(false);
      setMessage("");
    };

    const handleGameStarted = (startedGame: GameState) => {
      setGameState(startedGame);
      setPendingWildCard(null);
      setGameEvents([]);
      setUnoAlert(null);
      setMessage("");
    };

    const handleGameUpdated = (updatedGame: GameState) => {
      setGameState(updatedGame);
      setPendingWildCard(null);
      setIsReconnecting(false);
      setMessage("");
    };

    const handleGameFinished = (finishedGame: GameState) => {
      setGameState(finishedGame);
      setPendingWildCard(null);
      setUnoAlert(null);
      setMessage("");
    };

    const handleReturnedToLobby = () => {
      setGameState(null);
      setPendingWildCard(null);
      setGameEvents([]);
      setUnoAlert(null);
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

    const handleGameEvent = (event: GameEvent) => {
      setGameEvents((currentEvents) => [...currentEvents, event].slice(-30));

      if (event.type === "uno" && event.message.includes("dijo UNO")) {
        setUnoAlert(event);
      }
    };

    const handleGameEvents = (events: GameEvent[]) => {
      setGameEvents(events.slice(-30));
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("room:created", handleRoomCreated);
    socket.on("room:joined", handleRoomJoined);
    socket.on("room:updated", handleRoomUpdated);
    socket.on("room:reconnected", handleRoomReconnected);
    socket.on("room:left", handleRoomLeft);
    socket.on("game:started", handleGameStarted);
    socket.on("game:updated", handleGameUpdated);
    socket.on("game:finished", handleGameFinished);
    socket.on("game:returned-to-lobby", handleReturnedToLobby);
    socket.on("game:paused", handleGamePaused);
    socket.on("game:resumed", handleGameResumed);
    socket.on("game:event", handleGameEvent);
    socket.on("game:events", handleGameEvents);
    socket.on("game:error", handleGameError);
    socket.on("room:error", handleGameError);

    if (socket.connected) {
      setSocketId(socket.id);
      setConnectionStatus("connected");
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("room:created", handleRoomCreated);
      socket.off("room:joined", handleRoomJoined);
      socket.off("room:updated", handleRoomUpdated);
      socket.off("room:reconnected", handleRoomReconnected);
      socket.off("room:left", handleRoomLeft);
      socket.off("game:started", handleGameStarted);
      socket.off("game:updated", handleGameUpdated);
      socket.off("game:finished", handleGameFinished);
      socket.off("game:returned-to-lobby", handleReturnedToLobby);
      socket.off("game:paused", handleGamePaused);
      socket.off("game:resumed", handleGameResumed);
      socket.off("game:event", handleGameEvent);
      socket.off("game:events", handleGameEvents);
      socket.off("game:error", handleGameError);
      socket.off("room:error", handleGameError);
    };
  }, [socket]);

  useEffect(() => {
    if (!unoAlert) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setUnoAlert(null);
    }, 2600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [unoAlert]);

  const handleCreateRoom = () => {
    if (!isSocketConnected) {
      setMessage(
        "No hay conexión con el servidor. Configura o inicia el servidor antes de continuar.",
      );
      return;
    }

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
    if (!isSocketConnected) {
      setMessage(
        "No hay conexión con el servidor. Configura o inicia el servidor antes de continuar.",
      );
      return;
    }

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
    if (!isSocketConnected) {
      setMessage(
        "No hay conexión con el servidor. Configura o inicia el servidor antes de continuar.",
      );
      return;
    }

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

  const handleSaveServerUrl = () => {
    try {
      const normalizedUrl = saveServerUrl(serverUrlInput);
      const nextSocket = io(normalizedUrl, { autoConnect: false });

      socket.disconnect();
      nextSocket.connect();
      setRoom(null);
      setGameState(null);
      setPendingWildCard(null);
      setGameEvents([]);
      setUnoAlert(null);
      setIsReconnecting(false);
      setSocketId(undefined);
      setServerUrl(normalizedUrl);
      setServerUrlInput(normalizedUrl);
      setConnectionStatus("connecting");
      setSocket(nextSocket);
      setMessage("Servidor guardado correctamente.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "La URL del servidor no es válida.",
      );
    }
  };

  const getConnectionStatusLabel = (): string => {
    if (connectionStatus === "connecting") {
      return "Conectando...";
    }

    if (connectionStatus === "connected") {
      return "Conectado";
    }

    if (connectionStatus === "error") {
      return "Error de conexión";
    }

    return "Desconectado";
  };

  const handleLeaveRoom = () => {
    if (!room) {
      return;
    }

    if (room.started || (gameState && !isGameFinished)) {
      const shouldLeave = window.confirm(
        "Si sales durante la partida, quedarás como desconectado y la partida se pausará. Podrás reconectarte usando tu nombre exacto y el código de sala. ¿Quieres salir?",
      );

      if (!shouldLeave) {
        return;
      }
    }

    setMessage("");
    socket.emit("room:leave", {
      roomId: room.id,
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

    if (isWildCard(card)) {
      setPendingWildCard(card);
      return;
    }

    setMessage("");
    socket.emit("game:play-card", {
      roomId: room.id,
      cardId: card.id,
    });
  };

  const handleChooseWildColor = (color: PlayableColor) => {
    if (!room || !pendingWildCard || isGameFinished || isRoomPaused) {
      return;
    }

    setMessage("");
    socket.emit("game:play-card", {
      roomId: room.id,
      cardId: pendingWildCard.id,
      chosenColor: color,
    });
    setPendingWildCard(null);
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
    <main className={room && gameState && !isGameFinished ? "game-app-shell" : "app-shell"}>
      <section
        className={room && gameState && !isGameFinished ? "game-view" : "welcome-panel"}
        aria-labelledby="app-title"
      >
        {(!room || !gameState || isGameFinished) && (
          <header className="welcome-header">
            <h1 id="app-title">UNO Privado</h1>
            <p>Crea una partida o unete a una sala existente</p>
          </header>
        )}

        <div className={room && gameState && !isGameFinished ? "game-table-card" : "game-card"}>
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
              <GameTable
                room={room}
                gameState={gameState}
                currentPlayer={currentPlayer}
                localGamePlayer={localGamePlayer}
                gameEvents={gameEvents}
                isHost={isHost}
                isRoomPaused={isRoomPaused}
                canDrawCard={canDrawCard}
                canResumeGame={canResumeGame}
                pauseReason={pauseReason}
                disconnectedPlayers={disconnectedPlayers}
                onPlayCard={handlePlayCard}
                onDrawCard={handleDrawCard}
                onResolveDrawStack={handleResolveDrawStack}
                onSayUno={handleSayUno}
                onChallengeUno={handleChallengeUno}
                onPauseGame={handlePauseGame}
                onResumeGame={handleResumeGame}
                onLeaveRoom={handleLeaveRoom}
              />
            )
          ) : room ? (
            <section className="lobby-section" aria-labelledby="lobby-title">
              <div className="room-code">
                <span>Codigo de sala</span>
                <strong>{room.id}</strong>
              </div>

              <div>
                <h2 id="lobby-title">Lobby</h2>
                <p
                  className={
                    isLobbyFull ? "lobby-capacity is-full" : "lobby-capacity"
                  }
                >
                  {isLobbyFull
                    ? `Sala llena (${room.players.length}/${MAX_ROOM_PLAYERS})`
                    : `Jugadores en la sala (${room.players.length}/${MAX_ROOM_PLAYERS})`}
                </p>
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

              <button
                className="secondary-button"
                type="button"
                onClick={handleLeaveRoom}
              >
                Salir de sala
              </button>
            </section>
          ) : (
            <>
              <section className="lan-config-section" aria-labelledby="lan-title">
                <div>
                  <h2 id="lan-title">Configuración LAN</h2>
                  <p>
                    Para jugar en LAN, una computadora debe ejecutar el servidor.
                    Los demás jugadores deben escribir la IP de esa computadora,
                    por ejemplo http://192.168.1.100:3000.
                  </p>
                </div>

                <label className="field">
                  <span>Servidor</span>
                  <input
                    type="text"
                    value={serverUrlInput}
                    onChange={(event) => {
                      setServerUrlInput(event.target.value);
                      setMessage("");
                    }}
                    placeholder={DEFAULT_SERVER_URL}
                  />
                </label>

                <button
                  className="secondary-button"
                  type="button"
                  onClick={handleSaveServerUrl}
                >
                  Guardar servidor
                </button>

                <div className="server-status-panel">
                  <div>
                    <span>Servidor actual</span>
                    <strong>{serverUrl}</strong>
                  </div>
                  <div>
                    <span>Estado</span>
                    <strong className={`connection-status ${connectionStatus}`}>
                      {getConnectionStatusLabel()}
                    </strong>
                  </div>
                </div>
              </section>

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
                title={
                  isSocketConnected
                    ? undefined
                    : "No hay conexión con el servidor."
                }
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

                <button
                  type="submit"
                  disabled={!canJoinRoom}
                  title={
                    isSocketConnected
                      ? undefined
                      : "No hay conexión con el servidor."
                  }
                >
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
                  title={
                    isSocketConnected
                      ? undefined
                      : "No hay conexión con el servidor."
                  }
                >
                  {isReconnecting ? "Reconectando..." : "Reconectar a partida"}
                </button>
              </section>
            </>
          )}

          {message && <p className="form-message">{message}</p>}
          {unoAlert && room && gameState && !isGameFinished && (
            <div className="uno-alert" role="status" aria-live="polite">
              <strong>UNO!</strong>
              <span>{unoAlert.message}</span>
            </div>
          )}
          {pendingWildCard && room && gameState && !isGameFinished && (
            <div className="wild-color-modal" role="dialog" aria-modal="true">
              <div className="wild-color-dialog">
                <h2>Elegir color</h2>
                <p>Selecciona el color para jugar esta carta comodin.</p>
                <div className="wild-color-options">
                  {(["red", "blue", "green", "yellow"] as PlayableColor[]).map(
                    (color) => (
                      <button
                        className={`wild-color-option wild-color-${color}`}
                        key={color}
                        type="button"
                        onClick={() => handleChooseWildColor(color)}
                      >
                        {color}
                      </button>
                    ),
                  )}
                </div>
                <button
                  className="wild-color-cancel"
                  type="button"
                  onClick={() => setPendingWildCard(null)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
