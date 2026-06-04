import express from "express";
import { createGame, playCard } from "@uno/game-core";

const app = express();

app.get("/", (_req, res) => {
  let game = createGame({
    players: [
      { id: "player-1", name: "Manuel" },
      { id: "player-2", name: "Jugador 2" },
    ],
  });

  const currentPlayer = game.players[game.currentPlayerIndex];
  const topCard = game.discardPile.at(-1);

  if (!topCard) {
    throw new Error("No hay carta inicial.");
  }

  const playableCard = currentPlayer.hand.find(
    (card) =>
      card.color === game.currentColor ||
      card.value === topCard.value ||
      card.color === "wild"
  );

  if (!playableCard) {
    res.json({
      message: "El jugador no tiene cartas válidas para tirar.",
      currentColor: game.currentColor,
      topCard,
      hand: currentPlayer.hand,
    });

    return;
  }

  const before = {
    player: currentPlayer.name,
    cards: currentPlayer.hand.length,
    currentColor: game.currentColor,
    topCard,
    cardToPlay: playableCard,
  };

  game = playCard({
    game,
    playerId: currentPlayer.id,
    cardId: playableCard.id,
    chosenColor: playableCard.color === "wild" ? "red" : undefined,
  });

  const afterCurrentPlayer = game.players.find(
    (player) => player.id === currentPlayer.id
  );

  res.json({
    message: "Prueba de playCard",
    before,
    after: {
      playerCards: afterCurrentPlayer?.hand.length,
      discardPile: game.discardPile.length,
      topCard: game.discardPile.at(-1),
      currentColor: game.currentColor,
      currentPlayerIndex: game.currentPlayerIndex,
      currentPlayer: game.players[game.currentPlayerIndex]?.name,
      status: game.status,
    },
  });
});

app.listen(3000, () => {
  console.log("Servidor iniciado en puerto 3000");
});