import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GameRecording from "./game-recording";

const updateEndMutate = vi.fn();
const refetch = vi.fn();
let bowlCount = 1;
let opponentBowlCount = 0;
let bowlsPerEnd = 4;
let gameType = "Roll Up";
let singlesType: string | null = null;
let trackOpponent = false;

const bowlsFor = (count: number, isOpponent: boolean) =>
  Array.from({ length: count }, (_, index) => ({
    id: `${isOpponent ? "opponent-" : ""}bowl-${index + 1}`,
    endId: "end-1",
    bowlNumber: index + 1,
    hand: "Forehand",
    result: "effective_online",
    gridRow: 4,
    gridCol: 4,
    weightDistanceFeet: null,
    lineDistanceFeet: null,
    totalDistanceFeet: null,
    locationSource: null,
    isOpponent,
  }));

const bowls = () => [
  ...bowlsFor(bowlCount, false),
  ...bowlsFor(opponentBowlCount, true),
];

const game = () => ({
  id: "game-1",
  userId: "user-1",
  opponent: "Solo practice",
  venue: "Test Club",
  surface: "Grass",
  rink: "4",
  type: gameType,
  totalEnds: 12,
  gameEndType: "ends",
  targetScore: null,
  gameFormat: "singles",
  pairsType: null,
  singlesType,
  bowlsPerEnd,
  position: null,
  status: "IN_PROGRESS",
  createdAt: new Date(),
  greenSpeed: null,
  greenComparable: null,
  mentalFeeling: null,
  performanceRating: null,
  notes: null,
  ourMat: true,
  trackOpponent,
  category: "game",
  ends: [{
    id: "end-1",
    gameId: "game-1",
    endNumber: 1,
    jackEffective: true,
    length: "Medium",
    scoreFor: 0,
    scoreAgainst: 0,
    isDead: false,
    isCompleted: false,
    bowls: bowls(),
  }],
});

vi.mock("@/lib/hooks", () => ({
  useGameFull: () => ({ data: game(), isLoading: false, refetch }),
  useCreateEnd: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateBowl: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateEnd: () => ({ mutate: updateEndMutate, isPending: false }),
  useUpdateGame: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateBowl: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("wouter", () => ({
  useParams: () => ({ id: "game-1" }),
  useLocation: () => ["/play/game-1", vi.fn()],
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

beforeEach(() => {
  bowlCount = 1;
  opponentBowlCount = 0;
  bowlsPerEnd = 4;
  gameType = "Roll Up";
  singlesType = null;
  trackOpponent = false;
  updateEndMutate.mockReset();
  refetch.mockReset();
});

describe("Roll Up resume flow", () => {
  it("recognises the Practice singles subtype", async () => {
    gameType = "Practice";
    singlesType = "roll_up";
    bowlCount = 2;
    render(<GameRecording />);

    expect(await screen.findByTestId("text-bowl-number")).toHaveTextContent("Bowl 3 of 4");
    expect(screen.queryByText("Record End Score")).not.toBeInTheDocument();
  });

  it.each([1, 2, 3])("resumes after bowl %i at the next bowl without score entry", async (savedBowls) => {
    bowlCount = savedBowls;
    render(<GameRecording />);

    expect(await screen.findByTestId("text-bowl-number")).toHaveTextContent(`Bowl ${savedBowls + 1} of 4`);
    expect(screen.queryByText("Record End Score")).not.toBeInTheDocument();
    expect(updateEndMutate).not.toHaveBeenCalled();
  });

  it("completes a reopened four-bowl end with zero scores and shows its summary", async () => {
    bowlCount = 4;
    updateEndMutate.mockImplementation((_variables, options) => options.onSuccess());
    render(<GameRecording />);

    await waitFor(() => expect(updateEndMutate).toHaveBeenCalledOnce());
    expect(updateEndMutate.mock.calls[0][0]).toEqual({
      id: "end-1",
      gameId: "game-1",
      updates: { scoreFor: 0, scoreAgainst: 0, isDead: false, isCompleted: true },
    });
    expect(screen.queryByText("Record End Score")).not.toBeInTheDocument();
    expect(await screen.findByTestId("text-end-number")).toHaveTextContent("End 1 Summary");
  });
});

describe("standard game resume flow", () => {
  it.each([
    { bowls: 1, savedBowls: 0 },
    { bowls: 2, savedBowls: 1 },
    { bowls: 3, savedBowls: 2 },
    { bowls: 4, savedBowls: 3 },
  ])(
    "resumes a partial $bowls-bowl set after bowl $savedBowls at the next bowl",
    async ({ bowls, savedBowls }) => {
      gameType = "Competition";
      bowlsPerEnd = bowls;
      bowlCount = savedBowls;
      render(<GameRecording />);

      expect(await screen.findByTestId("text-bowl-number")).toHaveTextContent(`Bowl ${savedBowls + 1} of ${bowls}`);
      expect(screen.queryByText("Record End Score")).not.toBeInTheDocument();
      expect(updateEndMutate).not.toHaveBeenCalled();
    },
  );

  it.each([
    { myBowls: 2, opponentBowls: 1, expectedBowl: 2, expectedTurn: "opponent" },
    { myBowls: 2, opponentBowls: 2, expectedBowl: 3, expectedTurn: "player" },
  ])(
    "resumes an opponent-tracked game on the $expectedTurn turn",
    async ({ myBowls, opponentBowls, expectedBowl, expectedTurn }) => {
      gameType = "Competition";
      trackOpponent = true;
      bowlCount = myBowls;
      opponentBowlCount = opponentBowls;
      render(<GameRecording />);

      const bowlHeading = await screen.findByText(`Bowl ${expectedBowl} of 4`);
      if (expectedTurn === "opponent") {
        expect(screen.getByTestId("text-opp-bowl-number")).toBe(bowlHeading);
        expect(screen.queryByTestId("text-bowl-number")).not.toBeInTheDocument();
      } else {
        expect(screen.getByTestId("text-bowl-number")).toBe(bowlHeading);
        expect(screen.queryByTestId("text-opp-bowl-number")).not.toBeInTheDocument();
      }
      expect(screen.queryByText("Record End Score")).not.toBeInTheDocument();
    },
  );

  it.each([
    { bowls: 1, tracksOpponent: false },
    { bowls: 2, tracksOpponent: false },
    { bowls: 3, tracksOpponent: false },
    { bowls: 4, tracksOpponent: false },
    { bowls: 1, tracksOpponent: true },
    { bowls: 2, tracksOpponent: true },
    { bowls: 3, tracksOpponent: true },
    { bowls: 4, tracksOpponent: true },
  ])("resumes a completed $bowls-bowl non-Roll-Up set at score entry", async ({ bowls, tracksOpponent }) => {
    gameType = "Competition";
    bowlsPerEnd = bowls;
    trackOpponent = tracksOpponent;
    bowlCount = bowls;
    opponentBowlCount = tracksOpponent ? bowls : 0;
    render(<GameRecording />);

    expect(await screen.findByText("Record End Score")).toBeInTheDocument();
    expect(screen.queryByTestId("text-bowl-number")).not.toBeInTheDocument();
    expect(screen.queryByTestId("text-opp-bowl-number")).not.toBeInTheDocument();
    expect(updateEndMutate).not.toHaveBeenCalled();
  });
});
