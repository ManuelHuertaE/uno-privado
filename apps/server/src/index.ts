import express from "express";
import { isValidMove } from "@uno/game-core";

const app = express();



app.get("/", (_req, res) => {
  const valid = isValidMove({
    card: {
      id: "red-5",
      color: "red",
      value: "4",
    },
    topCard: {
      id: "blue-5",
      color: "blue",
      value: "5",
    },
    currentColor: "blue",
    drawStack: 0,
  });

  res.json({ valid });
});

app.listen(3000, () => {
  console.log("Servidor iniciado en puerto 3000");
});