import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

function App() {
  const [playerName, setPlayerName] = useState("");
  const [roomId, setRoomId] = useState("");

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Conectado:", socket.id);
    });

    socket.on("room:created", (room) => {
      console.log("Sala creada:", room);
      setRoomId(room.id);
    });

    socket.on("room:updated", (room) => {
      console.log("Sala actualizada:", room);
    });

    socket.on("game:error", (message) => {
      console.error("Error:", message);
    });

    return () => {
      socket.off("connect");
      socket.off("room:created");
      socket.off("room:updated");
      socket.off("game:error");
    };
  }, []);

  return (
    <>
      <h1>UNO Socket Test</h1>

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
    </>
  );
}

export default App;