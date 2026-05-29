import { beforeEach, describe, expect, test, vi } from 'vitest'
import { mockPrisma, resetMockPrisma } from '../helpers/mockPrisma';
import { mockGetSession, mockNoSession, mockSession, resetMockAuth } from '../helpers/mockAuth';
import { callApi } from '../helpers/apiRequest';
import { CampaignRole } from '@prisma/client';
import handler from '@/pages/api/campaign/[id]/map/index';

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

describe("Map Creation API", () => {

    beforeEach(() => {
        resetMockPrisma();
        resetMockAuth();
    });

    describe("Error handling", () => {

        test("Returns 400 if no campaign id present in query", async () => {
            mockSession("user-1");

            const res = await callApi(handler, { method: "POST", query: {} });
            expect(res.status).toBe(400);
            expect(mockPrisma.map.create).not.toHaveBeenCalled();
            expect(mockPrisma.campaign.findUnique).not.toHaveBeenCalled();
            expect(mockPrisma.campaignMember.findUnique).not.toHaveBeenCalled();
            expect(mockPrisma.campaign.update).not.toHaveBeenCalled();
        });

        test("Returns 400 if no name provided in body", async () => {
            mockSession("user-1");

            const res = await callApi(handler, { method: "POST", query: { id: "campaign-1" }, body: {} });
            expect(res.status).toBe(400);
            expect(mockPrisma.map.create).not.toHaveBeenCalled();
            expect(mockPrisma.campaign.findUnique).not.toHaveBeenCalled();
            expect(mockPrisma.campaignMember.findUnique).not.toHaveBeenCalled();
            expect(mockPrisma.campaign.update).not.toHaveBeenCalled();
        });

        test("Unauthenticated user should receive 401", async () => {
            mockNoSession();

            const res = await callApi(handler, { method: "POST", query: { id: "campaign-1" }, body: { name: "Test Map" } });
            expect(res.status).toBe(401);

            expect(mockPrisma.map.create).not.toHaveBeenCalled();
            expect(mockPrisma.campaign.findUnique).not.toHaveBeenCalled();
            expect(mockPrisma.campaignMember.findUnique).not.toHaveBeenCalled();
            expect(mockPrisma.campaign.update).not.toHaveBeenCalled();
        });

        test("Unauthorized campaign member should receive 403", async () => {
            mockSession("user-1");

            mockPrisma.campaign.findUnique.mockResolvedValue({
                id: "campaign-1"
            });

            mockPrisma.campaignMember.findUnique.mockResolvedValue({
                role: CampaignRole.PLAYER
            });

            const res = await callApi(handler, { method: "POST", query: { id: "campaign-1" }, body: { name: "Test Map" } });
            expect(res.status).toBe(403);

            expect(mockPrisma.map.create).not.toHaveBeenCalled();
            expect(mockPrisma.campaign.update).not.toHaveBeenCalled();
        });

        test("Campaign not found should receive 404", async () => {
            mockSession("user-1");
            mockPrisma.campaign.findUnique.mockResolvedValue(null);

            const res = await callApi(handler, { method: "POST", query: { id: "campaign-1" }, body: { name: "Test Map" } });
            expect(res.status).toBe(404);
            expect(mockPrisma.campaign.findUnique).toHaveBeenCalledWith({
                where: { id: "campaign-1" }
            });

            expect(mockPrisma.map.create).not.toHaveBeenCalled();
            expect(mockPrisma.campaign.update).not.toHaveBeenCalled();
        });
    });

    describe("POST /api/campaign/[id]/map", () => {

        test("GM should be able to create a map", async () => {
            mockSession("user-1");

            mockPrisma.campaign.findUnique.mockResolvedValue({
                id: "campaign-1",
            });

            mockPrisma.campaignMember.findUnique.mockResolvedValue({
                role: CampaignRole.GM,
            });

            mockPrisma.map.create.mockResolvedValue({
                id: "map-1",
                ownerId: "user-1",
                campaignId: "campaign-1",
                name: "Test Map",
                description: "A test map",
                data: {},
            });

            mockPrisma.campaign.update.mockResolvedValue({
                id: "campaign-1",
                inviteCode: "invite-code",
                lastMapId: "map-1"
            });

            const res = await callApi(handler, { 
                method: "POST", 
                query: { id: "campaign-1" }, 
                body: { name: "Test Map", description: "A test map" } });
            expect(res.status).toBe(201);
            const data = await res.json();
            expect(data).toEqual({
                mapId: "map-1",
            });
            expect(mockPrisma.map.create).toHaveBeenCalledWith({
                data: { 
                    ownerId: "user-1",
                    campaignId: "campaign-1", 
                    name: "Test Map",
                    description: "A test map",
                    data: {}
                }
            });
            expect(mockPrisma.campaign.update).toHaveBeenCalledWith({
                where: { id: "campaign-1" },
                data: { lastMapId: "map-1" }
            });
            expect(mockPrisma.campaign.findUnique).toHaveBeenCalledWith({
                where: { id: "campaign-1" }
            });
            expect(mockPrisma.campaignMember.findUnique).toHaveBeenCalledWith({
                where: {
                    campaignId_userId: {
                        campaignId: "campaign-1",
                        userId: "user-1",
                    },
                },
                select: { role: true },
            });
        });
    });

    describe("Unsupported methods", () => {

        test("GET should receive 405", async () => {
            mockSession("user-1");

            const res = await callApi(handler, { method: "GET", query: { id: "campaign-1" } });
            expect(res.status).toBe(405);
        });

        test("PUT should receive 405", async () => {
            mockSession("user-1");

            const res = await callApi(handler, { method: "PUT", query: { id: "campaign-1" } });
            expect(res.status).toBe(405);
        });

        test("DELETE should receive 405", async () => {
            mockSession("user-1");

            const res = await callApi(handler, { method: "DELETE", query: { id: "campaign-1" } });
            expect(res.status).toBe(405);
        });

    });

});