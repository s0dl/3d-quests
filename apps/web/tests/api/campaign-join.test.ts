import { beforeEach, describe, expect, test, vi } from 'vitest'
import { mockPrisma, resetMockPrisma } from '../helpers/mockPrisma';
import { mockGetSession, mockNoSession, mockSession, resetMockAuth } from '../helpers/mockAuth';
import { callApi } from '../helpers/apiRequest';
import { CampaignRole } from '@prisma/client';
import handler from '@/pages/api/campaign/join/[inviteCode]';

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

describe("Campaign Join API", () => {

    beforeEach(() => {
        resetMockPrisma();
        resetMockAuth();
    });

    describe("Error handling", () => {

        test("Unauthenticated user should receive 401", async () => {
            mockNoSession();

            const res = await callApi(handler, { method: "POST", query: { inviteCode: "invite-123" } });
            expect(res.status).toBe(401);

            expect(mockPrisma.campaign.findUnique).not.toHaveBeenCalled();
            expect(mockPrisma.campaignMember.create).not.toHaveBeenCalled();
        });

        test("Campaign not found should receive 404", async () => {
            mockSession("user-1");
            mockPrisma.campaign.findUnique.mockResolvedValue(null);

            const res = await callApi(handler, { method: "POST", query: { inviteCode: "invite-123" } });
            expect(res.status).toBe(404);
            expect(mockPrisma.campaign.findUnique).toHaveBeenCalledWith({
                where: { inviteCode: "invite-123" },
                include: { members: true }
            });
            expect(mockPrisma.campaignMember.create).not.toHaveBeenCalled();
        });

        test("User already a member should receive 409", async () => {
            mockSession("user-1");

            mockPrisma.campaign.findUnique.mockResolvedValue({
                id: "campaign-1",
                inviteCode: "invite-123",
                members: [{ userId: "user-1", role: CampaignRole.GM }]
            });

            const res = await callApi(handler, { method: "POST", query: { inviteCode: "invite-123" } });
            expect(res.status).toBe(409);
            expect(mockPrisma.campaign.findUnique).toHaveBeenCalledWith({
                where: { inviteCode: "invite-123" },
                include: { members: true }
            });
            expect(mockPrisma.campaignMember.create).not.toHaveBeenCalled();
        });

    });

    describe("POST /api/campaign/join/[inviteCode]", () => {

        test("Authenticated user should be able to join a campaign", async () => {
            mockSession("user-1");

            mockPrisma.campaign.findUnique.mockResolvedValue({
                id: "campaign-1",
                inviteCode: "invite-123",
                members: [{ userId: "user-2", role: CampaignRole.GM }],
            });

            mockPrisma.campaignMember.create.mockResolvedValue({
                userId: "user-1",
                campaignId: "campaign-1",
                role: CampaignRole.PLAYER,
            });

            const res = await callApi(handler, { method: "POST", query: { inviteCode: "invite-123" } });
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data).toEqual({
                campaignId: "campaign-1"
            });
            expect(mockPrisma.campaign.findUnique).toHaveBeenCalledWith({
                where: { inviteCode: "invite-123" },
                include: { members: true }
            });
            expect(mockPrisma.campaignMember.create).toHaveBeenCalledWith({
                data: {
                    campaignId: "campaign-1",
                    userId: "user-1",
                    role: CampaignRole.PLAYER,
                }
            });
        });

    });

    describe("Unsupported methods", () => {

        test("GET should receive 405", async () => {
            mockSession("user-1");

            const res = await callApi(handler, { method: "GET", query: { inviteCode: "invite-123" } });
            expect(res.status).toBe(405);
        });

        test("PUT should receive 405", async () => {
            mockSession("user-1");

            const res = await callApi(handler, { method: "PUT", query: { inviteCode: "invite-123" } });
            expect(res.status).toBe(405);
        });

        test("DELETE should receive 405", async () => {
            mockSession("user-1");

            const res = await callApi(handler, { method: "DELETE", query: { inviteCode: "invite-123" } });
            expect(res.status).toBe(405);
        });

    });

});