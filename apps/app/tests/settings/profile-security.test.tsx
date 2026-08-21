import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  openUserProfile: vi.fn(),
}));

vi.mock("@/lib/adapters/auth/ui", () => ({
  useUser: () => ({
    isLoaded: true,
    user: {
      id: "user-1",
      primaryEmailAddress: { emailAddress: "operator@example.com" },
    },
  }),
  useClerk: () => ({ openUserProfile: mocks.openUserProfile }),
}));

import ProfilePage from "@/app/(app)/settings/profile/page";

describe("profile security settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.openUserProfile.mockResolvedValue(undefined);
  });

  it("opens the authenticated Clerk user profile", async () => {
    render(<ProfilePage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Open Security Settings" }),
    );

    await waitFor(() => {
      expect(mocks.openUserProfile).toHaveBeenCalledTimes(1);
    });
  });
});
