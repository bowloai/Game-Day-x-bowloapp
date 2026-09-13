import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GameSetup from "./game-setup";

const mutate = vi.fn();

vi.mock("@/lib/hooks", () => ({
  useCreateGame: () => ({ mutate, isPending: false }),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/new", vi.fn()],
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe("Roll Up game setup", () => {
  beforeEach(() => mutate.mockReset());

  it("locks solo defaults, leaves total ends editable, and creates the expected game", async () => {
    const user = userEvent.setup();
    render(<GameSetup />);

    await user.click(screen.getByTestId("select-type"));
    await user.click(screen.getByRole("option", { name: "Roll Up" }));

    await waitFor(() => {
      expect(screen.queryByTestId("input-opponent")).not.toBeInTheDocument();
      expect(screen.queryByTestId("select-format")).not.toBeInTheDocument();
      expect(screen.queryByTestId("input-bowls-per-end")).not.toBeInTheDocument();
      expect(screen.queryByTestId("select-game-end-type")).not.toBeInTheDocument();
      expect(screen.queryByTestId("switch-track-opponent")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("input-total-ends")).toBeInTheDocument();

    await user.type(screen.getByTestId("input-venue"), "Test Club");
    await user.type(screen.getByTestId("input-rink"), "4");
    await user.clear(screen.getByTestId("input-total-ends"));
    await user.type(screen.getByTestId("input-total-ends"), "12");
    await user.click(screen.getByTestId("button-start-game"));

    await waitFor(() => expect(mutate).toHaveBeenCalledOnce());
    expect(mutate.mock.calls[0][0]).toMatchObject({
      type: "Roll Up",
      opponent: "Solo practice",
      gameFormat: "singles",
      bowlsPerEnd: 4,
      gameEndType: "ends",
      totalEnds: 12,
      targetScore: null,
      trackOpponent: false,
    });
  });
});