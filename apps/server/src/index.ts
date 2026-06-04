import express from "express";
import { createGame } from "@uno/game-core";

const app = express();

app.get("/", (_req, res) => {
  const game = createGame({
    players: [
      { id: "player-1", name: "Manuel" },
      { id: "player-2", name: "Jugador 2" },
    ],
  });

  res.json({
    message: "Partida creada",
    players: game.players.map((player) => ({
      id: player.id,
      name: player.name,
      cards: player.hand.length,
    })),
    drawPile: game.drawPile.length,
    discardPile: game.discardPile.length,
    firstDiscard: game.discardPile[0],
    currentPlayer: game.players[game.currentPlayerIndex],
    currentColor: game.currentColor,
  });
});

app.listen(3000, () => {
  console.log("Servidor iniciado en puerto 3000");
});