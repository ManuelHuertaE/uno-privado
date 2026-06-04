import express from "express";
import { createGame, nextTurn } from "@uno/game-core";

const app = express();

app.get("/", (_req, res) => {
  let game = createGame({
    players: [
      { id: "player-1", name: "Manuel" },
      { id: "player-2", name: "Jugador 2" },
      { id: "player-3", name: "Jugador 3" },
      { id: "player-4", name: "Jugador 4" },
    ],
  });

  const beforeTurn = {
    index: game.currentPlayerIndex,
    player: game.players[game.currentPlayerIndex].name,
  };

game = {
  ...game,
  direction: 1,
};

game = nextTurn({ game });

  const afterTurn = {
    index: game.currentPlayerIndex,
    player: game.players[game.currentPlayerIndex].name,
  };

  res.json({
    message: "Prueba de nextTurn",
    beforeTurn,
    afterTurn,
  });
});

app.listen(3000, () => {
  console.log("Servidor iniciado en puerto 3000");
});