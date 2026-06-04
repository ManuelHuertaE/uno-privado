import express from "express";
import { createDeck } from "@uno/game-core";

const app = express();

app.get("/", (_req, res) => {
  const deck = createDeck();

  res.json({
    message: "Servidor UNO funcionando",
    totalCards: deck.length,
    firstCards: deck.slice(0, 5),
  });
});

app.listen(3000, () => {
  console.log("Servidor iniciado en puerto 3000");
});