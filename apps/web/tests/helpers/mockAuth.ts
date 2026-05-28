import { vi } from "vitest";

export const mockGetSession = vi.fn();

export function mockSession(userId = "test-user-id") {
    mockGetSession.mockResolvedValue({
        user: {
            id: userId,
            email: `${userId}@test.com`,
            name: "Test User"
        }
    })
}

export function mockNoSession() {
    mockGetSession.mockResolvedValue(null);
}

export function resetMockAuth() {
    mockGetSession.mockReset();
}