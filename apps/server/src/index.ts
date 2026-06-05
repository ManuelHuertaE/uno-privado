import express from "express";
import { createGame, getPlayerView, playCard } from "@uno/game-core";

const app = express();

function createTestGame() {
  return createGame({
    players: [
      { id: "player-1", name: "Manuel" },
      { id: "player-2", name: "Jugador 2" },
      { id: "player-3", name: "Jugador 3" },
    ],
  });
}

app.get("/test-skip", (_req, res) => {
  let game = createTestGame();

  const card = {
    id: "test-skip",
    color: "red",
    value: "skip",
  } as const;

  game = {
    ...game,
    currentPlayerIndex: 0,
    currentColor: "red",
    players: game.players.map((player, index) =>
      index === 0 ? { ...player, hand: [card, ...player.hand] } : player
    ),
  };

  const before = {
    currentPlayer: game.players[game.currentPlayerIndex].name,
  };

  game = playCard({
    game,
    playerId: "player-1",
    cardId: card.id,
  });

  res.json({
    message: "Prueba de skip",
    before,
    after: {
      currentPlayer: game.players[game.currentPlayerIndex].name,
      currentColor: game.currentColor,
      topCard: game.discardPile[game.discardPile.length - 1],
    },
  });
});

app.get("/test-reverse", (_req, res) => {
  let game = createTestGame();

  const card = {
    id: "test-reverse",
    color: "blue",
    value: "reverse",
  } as const;

  game = {
    ...game,
    currentPlayerIndex: 0,
    currentColor: "blue",
    players: game.players.map((player, index) =>
      index === 0 ? { ...player, hand: [card, ...player.hand] } : player
    ),
  };

  const before = {
    currentPlayer: game.players[game.currentPlayerIndex].name,
    direction: game.direction,
  };

  game = playCard({
    game,
    playerId: "player-1",
    cardId: card.id,
  });

  res.json({
    message: "Prueba de reverse",
    before,
    after: {
      currentPlayer: game.players[game.currentPlayerIndex].name,
      direction: game.direction,
      currentColor: game.currentColor,
      topCard: game.discardPile[game.discardPile.length - 1],
    },
  });
});

app.get("/test-wild", (_req, res) => {
  let game = createTestGame();

  const card = {
    id: "test-wild",
    color: "wild",
    value: "wild",
  } as const;

  game = {
    ...game,
    currentPlayerIndex: 0,
    currentColor: "red",
    players: game.players.map((player, index) =>
      index === 0 ? { ...player, hand: [card, ...player.hand] } : player
    ),
  };

  const before = {
    currentPlayer: game.players[game.currentPlayerIndex].name,
    currentColor: game.currentColor,
  };

  game = playCard({
    game,
    playerId: "player-1",
    cardId: card.id,
    chosenColor: "yellow",
  });

  res.json({
    message: "Prueba de wild con chosenColor",
    before,
    after: {
      currentPlayer: game.players[game.currentPlayerIndex].name,
      currentColor: game.currentColor,
      topCard: game.discardPile[game.discardPile.length - 1],
    },
  });
});

app.get("/test-wild-draw4", (_req, res) => {
  let game = createTestGame();

  const card = {
    id: "test-wild-draw4",
    color: "wild",
    value: "wildDraw4",
  } as const;

  game = {
    ...game,
    currentPlayerIndex: 0,
    currentColor: "red",
    drawStack: 0,
    players: game.players.map((player, index) =>
      index === 0 ? { ...player, hand: [card, ...player.hand] } : player
    ),
  };

  const before = {
    currentPlayer: game.players[game.currentPlayerIndex].name,
    currentColor: game.currentColor,
    drawStack: game.drawStack,
  };

  game = playCard({
    game,
    playerId: "player-1",
    cardId: card.id,
    chosenColor: "green",
  });

  res.json({
    message: "Prueba de wildDraw4 con chosenColor",
    before,
    after: {
      currentPlayer: game.players[game.currentPlayerIndex].name,
      currentColor: game.currentColor,
      drawStack: game.drawStack,
      topCard: game.discardPile[game.discardPile.length - 1],
    },
  });
});

app.get("/test-player-view", (_req, res) => {
  const game = createTestGame();

  const player1View = getPlayerView({
    game,
    playerId: "player-1",
  });

  const player2View = getPlayerView({
    game,
    playerId: "player-2",
  });

  res.json({
    player1View,
    player2View,
  });
});

app.get("/test-game-state", (_req, res) => {
  const game = createTestGame();

  res.json({
    currentPlayer:
      game.players[game.currentPlayerIndex].name,
    currentColor: game.currentColor,
    drawStack: game.drawStack,
    direction: game.direction,
    drawPile: game.drawPile.length,
    discardPile: game.discardPile.length,
    players: game.players.map((player) => ({
      id: player.id,
      name: player.name,
      cards: player.hand.length,
    })),
  });
});

app.listen(3000, () => {
  console.log("Servidor iniciado en puerto 3000");
});