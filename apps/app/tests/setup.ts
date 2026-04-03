/**
 * Vitest Setup File
 * Global test configuration and mocks
 */

import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return "/";
  },
}));

// Mock Supabase
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        gte: vi.fn(() => Promise.resolve({ data: [], error: null })),
        lte: vi.fn(() => Promise.resolve({ data: [], error: null })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
      order: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  })),
  auth: {
    getUser: vi.fn(() =>
      Promise.resolve({ data: { user: null }, error: null }),
    ),
  },
};

vi.mock("@/lib/data/client/supabase-client", () => ({
  createAppClient: vi.fn(() => mockSupabaseClient),
}));

// Mock use-business hook
vi.mock("@/lib/hooks/use-business", () => ({
  useBusiness: vi.fn(() => ({
    business: { id: "test-business-id" },
    loading: false,
  })),
}));

// Mock Next.js cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock console methods in test environment
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};
