import { beforeEach, describe, expect, test, vi } from 'vitest'
import { mockPrisma, resetMockPrisma } from '../helpers/mockPrisma';
import { mockGetSession, mockNoSession, mockSession, resetMockAuth } from '../helpers/mockAuth';
import { callApi } from '../helpers/apiRequest';
import handler from '@/pages/api/campaign/index';

vi.mock("@/lib/prisma", () => ({
    prisma: mockPrisma,
}));

vi.mock("@/lib/auth", () => ({
    auth: {
        api: {
            getSession: mockGetSession,
        },
    },
}));

describe("Campaign List API", () => {

    beforeEach(() => {
        resetMockPrisma();
        resetMockAuth();
    });

    describe("GET /api/campaign", () => {

        test("Unauthenticated user should receive 401", async () => {
            mockNoSession();

            const res = await callApi(handler, { method: "GET" });
            expect(res.status).toBe(401);
        });

        test("Authenticated user with no campaigns should receive 404", async () => {
            mockSession("user-1");
            mockPrisma.campaign.findMany.mockResolvedValue([]);

            const res = await callApi(handler, { method: "GET" });
            expect(res.status).toBe(404);
        });

        test("Authenticated user should receive their campaigns", async () => {
            mockSession("user-1");

            mockPrisma.campaign.findMany.mockResolvedValue([
                { id: "campaign-1", name: "Test Campaign 1" },
                { id: "campaign-2", name: "Test Campaign 2" },
            ]);

            const res = await callApi(handler, { method: "GET" });
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data).toEqual([
                { id: "campaign-1", name: "Test Campaign 1" },
                { id: "campaign-2", name: "Test Campaign 2" },
            ]);
        });

    });

    describe("POST /api/campaign", () => {

        test("Unauthenticated user should receive 401", async () => {
            mockNoSession();

            const res = await callApi(handler, { method: "POST", body: { name: "New Campaign" } });
            expect(res.status).toBe(401);
        });

        test("Invalid request should receive 400", async () => {
            mockSession("user-1");

            const res = await callApi(handler, { method: "POST", body: {} });
            expect(res.status).toBe(400);
        })

        test("Authenticated user should be able to create a campaign", async () => {
            mockSession("user-1");

            mockPrisma.campaign.create.mockResolvedValue({ id: "campaign-1", name: "New Campaign" });

            const res = await callApi(handler, { method: "POST", body: { name: "New Campaign" } });
            expect(res.status).toBe(201);
            const data = await res.json();
            expect(data).toEqual({ campaignId: "campaign-1" });
        });

    });

    describe("Unsupported methods", () => {

        test("PUT should receive 405", async () => {
            mockSession("user-1");

            const res = await callApi(handler, { method: "PUT" });
            expect(res.status).toBe(405);
        });

        test("DELETE should receive 405", async () => {
            mockSession("user-1");

            const res = await callApi(handler, { method: "DELETE" });
            expect(res.status).toBe(405);
        });

    });

});