import express from "express";
import { createGame, drawCards, playCard } from "@uno/game-core";

const app = express();

app.get("/", (_req, res) => {
  let game = createGame({
    players: [
      { id: "player-1", name: "Manuel" },
      { id: "player-2", name: "Jugador 2" },
    ],
  });

  const player1 = game.players[0];
  const player2 = game.players[1];

  const draw2Card = player1.hand.find((card) => card.value === "draw2");

  if (!draw2Card) {
    res.json({
      message:
        "Jugador 1 no tiene una carta +2. Refresca la página para generar otra partida.",
      player1Hand: player1.hand,
    });

    return;
  }

  game = {
    ...game,
    currentColor: draw2Card.color,
  };

  const beforePlayCard = {
    currentPlayerIndex: game.currentPlayerIndex,
    currentPlayer: game.players[game.currentPlayerIndex].name,
    player1Cards: game.players[0].hand.length,
    player2Cards: game.players[1].hand.length,
    drawPile: game.drawPile.length,
    drawStack: game.drawStack,
    cardToPlay: draw2Card,
  };

  game = playCard({
    game,
    playerId: player1.id,
    cardId: draw2Card.id,
  });

  const afterPlayCard = {
    currentPlayerIndex: game.currentPlayerIndex,
    currentPlayer: game.players[game.currentPlayerIndex].name,
    player1Cards: game.players[0].hand.length,
    player2Cards: game.players[1].hand.length,
    drawPile: game.drawPile.length,
    drawStack: game.drawStack,
    topCard: game.discardPile.at(-1),
  };

  game = drawCards({
    game,
    playerId: player2.id,
    amount: game.drawStack,
    clearDrawStack: true,
    advanceTurn: true,
  });

  const afterDrawCards = {
    currentPlayerIndex: game.currentPlayerIndex,
    currentPlayer: game.players[game.currentPlayerIndex].name,
    player1Cards: game.players[0].hand.length,
    player2Cards: game.players[1].hand.length,
    drawPile: game.drawPile.length,
    drawStack: game.drawStack,
  };

  res.json({
    message: "Prueba completa: jugador 1 tira +2 y jugador 2 roba",
    beforePlayCard,
    afterPlayCard,
    afterDrawCards,
  });
});

app.listen(3000, () => {
  console.log("Servidor iniciado en puerto 3000");
});