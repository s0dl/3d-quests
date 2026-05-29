import { vi } from "vitest";

export const mockPrisma = {
    $transaction: vi.fn(async (callback) => callback(mockPrisma)),
    campaign: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    campaignMember: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    map: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    assets: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    }
}

export function resetMockPrisma() {
    Object.values(mockPrisma).forEach((modelOrFn) => {
        if (typeof modelOrFn === "function" && "mockReset" in modelOrFn) {
            modelOrFn.mockReset();
            return;
        }
        
        Object.values(modelOrFn).forEach((fn) => fn.mockReset());
    });
}