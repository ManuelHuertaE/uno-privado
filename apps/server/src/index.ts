import express from "express";
import { createGame, drawCards } from "@uno/game-core";

const app = express();

app.get("/", (_req, res) => {
  let game = createGame({
    players: [
      { id: "player-1", name: "Manuel" },
      { id: "player-2", name: "Jugador 2" },
    ],
  });

  const before = {
    playerCards: game.players[0].hand.length,
    drawPile: game.drawPile.length,
  };

  game = drawCards({
    game,
    playerId: "player-1",
    amount: 2,
  });

  const after = {
    playerCards: game.players[0].hand.length,
    drawPile: game.drawPile.length,
  };

  res.json({
    message: "Prueba de drawCards",
    before,
    after,
  });
});

app.listen(3000, () => {
  console.log("Servidor iniciado en puerto 3000");
});