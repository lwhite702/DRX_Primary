import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { NotificationsPopover } from "@/components/layout/notifications-popover";

describe("NotificationsPopover", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("renders the notification bell button", () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ notifications: [] }),
    });

    render(<NotificationsPopover />);
    expect(screen.getByLabelText("Notifications")).toBeDefined();
  });

  it("surfaces error state and retry button when GET /api/notifications returns non-ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<NotificationsPopover />);

    // Open popover
    fireEvent.click(screen.getByLabelText("Notifications"));

    await waitFor(() => {
      expect(screen.getByText("Unable to load notifications")).toBeDefined();
    });

    const retryBtn = screen.getByRole("button", { name: "Retry" });
    expect(retryBtn).toBeDefined();

    // Now mock a successful retry
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        notifications: [
          {
            id: "notif-1",
            title: "Stock Alert",
            message: "Batch nearing expiration",
            type: "alert",
            isRead: false,
            createdAt: new Date().toISOString(),
          },
        ],
      }),
    });

    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("Stock Alert")).toBeDefined();
      expect(screen.getByText("Batch nearing expiration")).toBeDefined();
    });
  });

  it("surfaces error state when fetch throws a network exception", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network connection dropped"));

    render(<NotificationsPopover />);
    fireEvent.click(screen.getByLabelText("Notifications"));

    await waitFor(() => {
      expect(screen.getByText("Unable to load notifications")).toBeDefined();
    });
  });

  it("renders notifications and allows marking them as read", async () => {
    const mockNotifications = [
      {
        id: "notif-1",
        title: "Test Notification",
        message: "Hello world",
        type: "system",
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    ];

    global.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === "PUT") {
        return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ notifications: mockNotifications }),
      });
    });

    render(<NotificationsPopover />);
    fireEvent.click(screen.getByLabelText("Notifications"));

    await waitFor(() => {
      expect(screen.getByText("Test Notification")).toBeDefined();
    });

    // Click "Mark all read"
    const markAllBtn = screen.getByText("Mark all read");
    fireEvent.click(markAllBtn);

    await waitFor(() => {
      expect(screen.getByText("No new notifications")).toBeDefined();
    });
  });
});
