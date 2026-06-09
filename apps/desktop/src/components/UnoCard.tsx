import type { Card } from "./gameTypes";

type UnoCardProps = {
  card?: Card;
  hidden?: boolean;
  playable?: boolean;
  selected?: boolean;
  compact?: boolean;
  onClick?: () => void;
};

function formatCardValue(value: string): string {
  if (value === "skip") {
    return "SKIP";
  }

  if (value === "reverse") {
    return "REV";
  }

  if (value === "draw2") {
    return "+2";
  }

  if (value === "wild") {
    return "WILD";
  }

  if (value === "wildDraw4") {
    return "+4";
  }

  return value;
}

export function UnoCard({
  card,
  hidden = false,
  playable = false,
  selected = false,
  compact = false,
  onClick,
}: UnoCardProps) {
  const color = hidden ? "back" : card?.color ?? "wild";
  const value = hidden ? "" : formatCardValue(card?.value ?? "");
  const canClick = Boolean(playable && onClick);

  return (
    <button
      className={[
        "uno-card",
        `uno-card-${color}`,
        hidden ? "is-hidden" : "",
        playable ? "is-playable" : "",
        selected ? "is-selected" : "",
        compact ? "is-compact" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={!canClick}
      type="button"
      onClick={onClick}
      aria-label={hidden ? "Carta boca abajo" : `Carta ${value}`}
    >
      {hidden ? (
        <span className="uno-card-back">UNO</span>
      ) : (
        <>
          <span className="uno-card-corner">{value}</span>
          <span className="uno-card-face">{value}</span>
          <span className="uno-card-corner bottom">{value}</span>
        </>
      )}
    </button>
  );
}
