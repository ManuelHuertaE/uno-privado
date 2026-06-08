/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

function App() {
  const [playerName, setPlayerName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [game, setGame] = useState<any>(null);
  const [room, setRoom] = useState<any>(null);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Conectado:", socket.id);
    });

    socket.on("room:created", (room) => {
      console.log("Sala creada:", room);
      setRoom(room);
      setRoomId(room.id);
    });

    socket.on("room:updated", (updatedRoom) => {
      console.log("Sala actualizada:", updatedRoom);
      setRoom(updatedRoom);
    });

    socket.on("game:updated", (updatedGame) => {
      console.log("Game actualizado:", updatedGame);
      setGame(updatedGame);
    });

    socket.on("game:error", (error) => {
      console.error("Error:", error);
    });

    return () => {
      socket.off("connect");
      socket.off("room:created");
      socket.off("room:updated");
      socket.off("game:updated");
      socket.off("game:error");
    };
  }, []);

  const currentPlayer = game?.players?.[game.currentPlayerIndex];
  const topCard = game?.discardPile?.[game.discardPile.length - 1];
  const winner = game?.players?.find(
    (player: any) => player.id === game.winnerId,
  );

  return (
    <>
      <h1>UNO Socket Test</h1>

      {room?.paused && (
        <div>
          <h2>⏸️ Partida pausada</h2>
          <p>
            Un jugador se desconectó. La partida continuará cuando se reconecte.
          </p>
        </div>
      )}

      <input
        placeholder="Nombre"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
      />

      <input
        placeholder="ID de sala"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value.toUpperCase())}
      />

      <button
        onClick={() => {
          socket.emit("room:create", {
            playerName: playerName || "Jugador 1",
          });
        }}
      >
        Crear sala
      </button>

      <button
        onClick={() => {
          socket.emit("room:join", {
            roomId,
            playerName: playerName || "Jugador 2",
          });
        }}
      >
        Unirse a sala
      </button>

      <button
        onClick={() => {
          socket.emit("game:start", {
            roomId,
          });
        }}
      >
        Iniciar partida
      </button>

      <button
        onClick={() => {
          socket.emit("room:reconnect", {
            roomId,
            playerName,
          });
        }}
      >
        Reconectar a sala
      </button>

      {game && (
        <div>
          <h2>Partida</h2>

          {game.status === "finished" && (
            <p>🏆 Partida finalizada. El ganador es: {winner?.name}</p>
          )}

          <p>Turno de: {currentPlayer?.name}</p>

          <p>Color actual: {game.currentColor}</p>

          <p>Draw stack: {game.drawStack}</p>

          <p>
            Carta superior: {topCard?.color} {topCard?.value}
          </p>

          {game.drawStack > 0 ? (
            <button
              disabled={game.status === "finished" || room?.paused}
              onClick={() => {
                socket.emit("game:resolveDrawStack", {
                  roomId,
                });
              }}
            >
              Robar acumulación ({game.drawStack})
            </button>
          ) : (
            <button
              disabled={game.status === "finished" || room?.paused}
              onClick={() => {
                socket.emit("game:drawForTurn", {
                  roomId,
                });
              }}
            >
              Robar carta
            </button>
          )}

          {currentPlayer?.hand?.length === 2 && (
            <button
              disabled={game.status === "finished" || room?.paused}
              onClick={() => {
                socket.emit("game:sayUno", {
                  roomId,
                });
              }}
            >
              Decir UNO
            </button>
          )}

          <h3>Jugadores</h3>

          {game.players.map((player: any) => (
            <div key={player.id}>
              <span>
                {player.name} - cartas:{" "}
                {player.handCount ?? player.hand?.length}
              </span>

              {player.handCount === 1 && (
                <button
                  disabled={game.status === "finished" || room?.paused}
                  onClick={() => {
                    socket.emit("game:challengeUno", {
                      roomId,
                      targetPlayerId: player.id,
                    });
                  }}
                >
                  Retar UNO
                </button>
              )}
            </div>
          ))}

          <h3>Cartas del jugador actual</h3>

          {currentPlayer?.hand.map((card: any) => (
            <button
              key={card.id}
              onClick={() => {
                const chosenColor =
                  card.color === "wild"
                    ? prompt("Elige color: red, blue, green, yellow") ||
                      undefined
                    : undefined;

                socket.emit("game:playCard", {
                  roomId,
                  cardId: card.id,
                  chosenColor,
                });
              }}
            >
              {card.color} {card.value}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export default App;
