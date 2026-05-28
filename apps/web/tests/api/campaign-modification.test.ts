import { beforeEach, describe, expect, test, vi } from 'vitest'
import { mockPrisma, resetMockPrisma } from '../helpers/mockPrisma';
import { mockGetSession, mockNoSession, mockSession, resetMockAuth } from '../helpers/mockAuth';
import { callApi } from '../helpers/apiRequest';
import { CampaignRole } from '@prisma/client';
import handler from '@/pages/api/campaign/[id]/index';

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

describe("Campaign Modification API", () => {

    beforeEach(() => {
        resetMockPrisma();
        resetMockAuth();
    });

    describe("Error handling", () => {

        test("Unauthenticated user should receive 401", async () => {
            mockNoSession();

            let res = await callApi(handler, { method: "GET", query: { id: "campaign-1" } });
            expect(res.status).toBe(401);

            res = await callApi(handler, { method: "PUT", query: { id: "campaign-1" }, body: { name: "Updated Campaign" } });
            expect(res.status).toBe(401);

            res = await callApi(handler, { method: "DELETE", query: { id: "campaign-1" } });
            expect(res.status).toBe(401);

            expect(mockPrisma.campaign.findUnique).not.toHaveBeenCalled();
            expect(mockPrisma.campaign.update).not.toHaveBeenCalled();
            expect(mockPrisma.campaign.delete).not.toHaveBeenCalled();
        });

        test("Unauthorized campaign member should receive 403", async () => {
            mockSession("user-1");

            mockPrisma.campaign.findUnique.mockResolvedValue({
                id: "campaign-1"
            });

            mockPrisma.campaignMember.findUnique.mockResolvedValue({
                role: CampaignRole.PLAYER
            });

            let res = await callApi(handler, { method: "PUT", query: { id: "campaign-1" }, body: { name: "Updated Campaign" } });
            expect(res.status).toBe(403);

            res = await callApi(handler, { method: "DELETE", query: { id: "campaign-1" } });
            expect(res.status).toBe(403);

            expect(mockPrisma.campaign.update).not.toHaveBeenCalled();
            expect(mockPrisma.campaign.delete).not.toHaveBeenCalled();
        });

        test("Campaign not found should receive 404", async () => {
            mockSession("user-1");
            mockPrisma.campaign.findUnique.mockResolvedValue(null);

            let res = await callApi(handler, { method: "GET", query: { id: "campaign-1" } });
            expect(res.status).toBe(404);

            res = await callApi(handler, { method: "PUT", query: { id: "campaign-1" }, body: { name: "Updated Campaign" } });
            expect(res.status).toBe(404);

            res = await callApi(handler, { method: "DELETE", query: { id: "campaign-1" } });
            expect(res.status).toBe(404);

            expect(mockPrisma.campaign.update).not.toHaveBeenCalled();
            expect(mockPrisma.campaign.delete).not.toHaveBeenCalled();
        });

    });


    describe("GET /api/campaign/[id]", () => {

        test("GM should receive their campaign", async () => {
            mockSession("user-1");

            mockPrisma.campaign.findUnique.mockResolvedValue({
                id: "campaign-1",
                name: "Test Campaign 1",
                description: "A test campaign",
                inviteCode: "invite-123",
                members: [{ userId: "user-1", role: CampaignRole.GM }],
                maps: []
            });

            mockPrisma.campaignMember.findUnique.mockResolvedValue({
                userId: "user-1",
                campaignId: "campaign-1",
                role: CampaignRole.GM
            });

            const res = await callApi(handler, { method: "GET", query: { id: "campaign-1" } });
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data).toEqual({
                id: "campaign-1",
                name: "Test Campaign 1",
                description: "A test campaign",
                inviteUrl: "/api/campaign/join/invite-123",
                members: [{ userId: "user-1", role: CampaignRole.GM }],
                maps: []
            });
        });

        test("Player should receive their campaign", async () => {
            mockSession("user-1");

            mockPrisma.campaign.findUnique.mockResolvedValue({
                id: "campaign-1",
                name: "Test Campaign 1",
                description: "A test campaign",
                inviteCode: "invite-123",
                members: [{ userId: "user-1", role: CampaignRole.PLAYER }],
                maps: []
            });

            mockPrisma.campaignMember.findUnique.mockResolvedValue({
                userId: "user-1",
                campaignId: "campaign-1",
                role: CampaignRole.PLAYER
            });

            const res = await callApi(handler, { method: "GET", query: { id: "campaign-1" } });
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data).toEqual({
                id: "campaign-1",
                name: "Test Campaign 1",
                description: "A test campaign",
                inviteUrl: "/api/campaign/join/invite-123",
                members: [{ userId: "user-1", role: CampaignRole.PLAYER }],
                maps: []
            });
        });

    });

    describe("PUT /api/campaign/[id]", () => {

        test("Invalid request should receive 400", async () => {
            mockSession("user-1");

            mockPrisma.campaign.findUnique.mockResolvedValue({
                id: "campaign-1"
            });

            mockPrisma.campaignMember.findUnique.mockResolvedValue({
                userId: "user-1",
                campaignId: "campaign-1",
                role: CampaignRole.GM
            });

            const res = await callApi(handler, { method: "PUT", query: { id: "campaign-1" }, body: {} });
            expect(res.status).toBe(400);
            expect(mockPrisma.campaign.update).not.toHaveBeenCalled();
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

        test("Authenticated user should be able to modify their campaign", async () => {
            mockSession("user-1");

            mockPrisma.campaign.findUnique.mockResolvedValue({
                id: "campaign-1"
            });

            mockPrisma.campaignMember.findUnique.mockResolvedValue({
                userId: "user-1",
                campaignId: "campaign-1",
                role: CampaignRole.GM
            });

            mockPrisma.campaign.update.mockResolvedValue({
                id: "campaign-1",
                name: "Updated Campaign",
                description: "A test campaign",
                inviteCode: "invite-123",
                members: [{ userId: "user-1", role: CampaignRole.GM }, { userId: "user-2", role: CampaignRole.PLAYER }],
                maps: []
            });

            const res = await callApi(handler, {
                method: "PUT", query: { id: "campaign-1" }, body: {
                    name: "Updated Campaign",
                    description: "An updated test campaign",
                    removeMemberId: "user-2"
                }
            });
            expect(res.status).toBe(204);
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
            expect(mockPrisma.campaign.update).toHaveBeenCalledWith({
                where: { id: "campaign-1" },
                data: {
                    name: "Updated Campaign",
                    description: "An updated test campaign",
                    members: {
                        delete: {
                            campaignId_userId: {
                                campaignId: "campaign-1",
                                userId: "user-2"
                            }
                        }
                    }
                }
            });
        });

        test("Authenticated user should be able to modify just name", async () => {
            mockSession("user-1");

            mockPrisma.campaign.findUnique.mockResolvedValue({
                id: "campaign-1"
            });

            mockPrisma.campaignMember.findUnique.mockResolvedValue({
                userId: "user-1",
                campaignId: "campaign-1",
                role: CampaignRole.GM
            });

            mockPrisma.campaign.update.mockResolvedValue({
                id: "campaign-1",
                name: "Updated Campaign",
                description: "A test campaign",
                inviteCode: "invite-123",
                members: [{ userId: "user-1", role: CampaignRole.GM }, { userId: "user-2", role: CampaignRole.PLAYER }],
                maps: []
            });

            const res = await callApi(handler, {
                method: "PUT", query: { id: "campaign-1" }, body: {
                    name: "Updated Campaign",
                }
            });
            expect(res.status).toBe(204);

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
            expect(mockPrisma.campaign.update).toHaveBeenCalledWith({
                where: { id: "campaign-1" },
                data: {
                    name: "Updated Campaign",
                }
            });
        });

        test("Authenticated user should be able to modify just description", async () => {
            mockSession("user-1");

            mockPrisma.campaign.findUnique.mockResolvedValue({
                id: "campaign-1"
            });

            mockPrisma.campaignMember.findUnique.mockResolvedValue({
                userId: "user-1",
                campaignId: "campaign-1",
                role: CampaignRole.GM
            });

            mockPrisma.campaign.update.mockResolvedValue({
                id: "campaign-1",
                name: "Test Campaign 1",
                description: "An updated test campaign",
                inviteCode: "invite-123",
                members: [{ userId: "user-1", role: CampaignRole.GM }, { userId: "user-2", role: CampaignRole.PLAYER }],
                maps: []
            });

            const res = await callApi(handler, {
                method: "PUT", query: { id: "campaign-1" }, body: {
                    description: "An updated test campaign",
                }
            });
            expect(res.status).toBe(204);
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
            expect(mockPrisma.campaign.update).toHaveBeenCalledWith({
                where: { id: "campaign-1" },
                data: {
                    description: "An updated test campaign",
                }
            });
        });

        test("Authenticated user should be able to remove just member", async () => {
            mockSession("user-1");

            mockPrisma.campaign.findUnique.mockResolvedValue({
                id: "campaign-1"
            });

            mockPrisma.campaignMember.findUnique.mockResolvedValue({
                userId: "user-1",
                campaignId: "campaign-1",
                role: CampaignRole.GM
            });

            mockPrisma.campaign.update.mockResolvedValue({
                id: "campaign-1",
                name: "Test Campaign 1",
                description: "A test campaign",
                inviteCode: "invite-123",
                members: [{ userId: "user-1", role: CampaignRole.GM }],
                maps: []
            });

            const res = await callApi(handler, {
                method: "PUT", query: { id: "campaign-1" }, body: {
                    removeMemberId: "user-2"
                }
            });
            expect(res.status).toBe(204);
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
            expect(mockPrisma.campaign.update).toHaveBeenCalledWith({
                where: { id: "campaign-1" },
                data: {
                    members: {
                        delete: {
                            campaignId_userId: {
                                campaignId: "campaign-1",
                                userId: "user-2"
                            }
                        }
                    }
                }
            });
        });

    });

    describe("DELETE /api/campaign/[id]", () => {

        test("Authenticated user should be able to delete their campaign", async () => {
            mockSession("user-1");

            mockPrisma.campaign.findUnique.mockResolvedValue({
                id: "campaign-1"
            });

            mockPrisma.campaignMember.findUnique.mockResolvedValue({
                userId: "user-1",
                campaignId: "campaign-1",
                role: CampaignRole.GM
            });

            mockPrisma.campaign.delete.mockResolvedValue({
                id: "campaign-1",
                name: "Test Campaign 1",
                description: "A test campaign",
                inviteCode: "invite-123",
                members: [{ userId: "user-1", role: CampaignRole.GM }],
                maps: []
            });

            const res = await callApi(handler, { method: "DELETE", query: { id: "campaign-1" } });
            expect(res.status).toBe(204);
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
            expect(mockPrisma.campaign.delete).toHaveBeenCalledWith({
                where: { id: "campaign-1" }
            });
        });
    });

    describe("Unsupported methods", () => {

        test("POST should receive 405", async () => {
            mockSession("user-1");

            const res = await callApi(handler, { method: "POST", query: { id: "campaign-1" }, body: { name: "New Campaign" } });
            expect(res.status).toBe(405);
        });

    });

});