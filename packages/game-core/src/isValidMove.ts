import type { Card } from "@uno/shared";

interface IsValidMoveParams {
  card: Card;
  topCard: Card;
  currentColor: Card["color"];
  drawStack: number;
}

// function isDrawCard(card: Card): boolean {
//   return card.value === "draw2" || card.value === "wildDraw4";
// }

export function isValidMove({
  card,
  topCard,
  currentColor,
  drawStack,
}: IsValidMoveParams): boolean {
  // Si hay acumulación de robo activa,
  // solo se puede responder con otra carta de robo.
  if (drawStack > 0) {
    return (
      card.value === "wildDraw4" ||
      (card.value === "draw2" && card.color === currentColor)
    );
  }

  // Los comodines siempre se pueden jugar.
  if (card.value === "wild" || card.value === "wildDraw4") {
    return true;
  }

  // Coincide con el color actual.
  if (card.color === currentColor) {
    return true;
  }

  // Coincide con el valor de la carta superior.
  if (card.value === topCard.value) {
    return true;
  }

  return false;
}