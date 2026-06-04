import express from "express";

const app = express();

app.get("/", (_req, res) => {
  res.send("Servidor UNO funcionando");
});

app.listen(3000, () => {
  console.log("Servidor iniciado en puerto 3000");
});