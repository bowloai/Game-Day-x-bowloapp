type GameTypeFields = {
  type?: string | null;
  singlesType?: string | null;
};

export const ROLL_UP_SINGLES_TYPE = "roll_up";

export function isRollUpGame(game?: GameTypeFields | null): boolean {
  return game?.type === "Roll Up"
    || (game?.type === "Practice" && game?.singlesType === ROLL_UP_SINGLES_TYPE);
}

export function matchesGameType(game: GameTypeFields, filterType: string): boolean {
  if (filterType === "All") return true;
  if (filterType === "Roll Up") return isRollUpGame(game);
  return game.type === filterType;
}