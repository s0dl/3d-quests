import { beforeEach, describe, expect, test, vi } from 'vitest'
import { mockPrisma, resetMockPrisma } from '../helpers/mockPrisma';
import { mockGetSession, mockNoSession, mockSession, resetMockAuth } from '../helpers/mockAuth';
import { callApi } from '../helpers/apiRequest';
import { CampaignRole } from '@prisma/client';
import { generateInviteCode } from '@/lib/nanoid';
import handler from '@/pages/api/campaign/[id]/invite';

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

vi.mock("@/lib/nanoid", () => ({
    generateInviteCode: vi.fn(),
}));

const mockGenerateInviteCode = vi.mocked(generateInviteCode);
const resetMockGenerateInviteCode = () =>  mockGenerateInviteCode.mockReset();

describe("Invite Regenerate API", () => {

    beforeEach(() => {
        resetMockPrisma();
        resetMockAuth();
        resetMockGenerateInviteCode();
    });

    describe("Error handling", () => {
        test("Returns 400 if no campaign id present in query", async () => {
            mockSession("user-1");

            const res = await callApi(handler, { method: "PUT", query: {} });
            expect(res.status).toBe(400);
            expect(mockPrisma.campaign.update).not.toHaveBeenCalled();
        });


        test("Unauthenticated user should receive 401", async () => {
            mockNoSession();

            const res = await callApi(handler, { method: "PUT", query: { id: "campaign-1" } });
            expect(res.status).toBe(401);

            expect(mockPrisma.campaign.findUnique).not.toHaveBeenCalled();
            expect(mockPrisma.campaignMember.findUnique).not.toHaveBeenCalled();
            expect(mockGenerateInviteCode).not.toHaveBeenCalled()
        });

        test("Unauthorized campaign member should receive 403", async () => {
            mockSession("user-1");

            mockPrisma.campaign.findUnique.mockResolvedValue({
                id: "campaign-1"
            });

            mockPrisma.campaignMember.findUnique.mockResolvedValue({
                role: CampaignRole.PLAYER
            });

            const res = await callApi(handler, { method: "PUT", query: { id: "campaign-1" } });
            expect(res.status).toBe(403);

            expect(mockGenerateInviteCode).not.toHaveBeenCalled()
        });

        test("Campaign not found should receive 404", async () => {
            mockSession("user-1");
            mockPrisma.campaign.findUnique.mockResolvedValue(null);

            const res = await callApi(handler, { method: "PUT", query: { id: "campaign-1" } });
            expect(res.status).toBe(404);
            expect(mockPrisma.campaign.findUnique).toHaveBeenCalledWith({
                where: { id: "campaign-1" }
            });
            expect(mockGenerateInviteCode).not.toHaveBeenCalled()
        });
    });

    describe("PUT /api/campaign/[id]/invite", () => {

        test("GM should be able to regenerate inviteCode", async () => {
            mockSession("user-1");

            mockGenerateInviteCode.mockReturnValue("new-invite-code");

            mockPrisma.campaign.findUnique.mockResolvedValue({
                id: "campaign-1",
            });

            mockPrisma.campaignMember.findUnique.mockResolvedValue({
                role: CampaignRole.GM,
            });

            mockPrisma.campaign.update.mockResolvedValue({
                id: "campaign-1",
                inviteCode: "new-invite-code",
            });

            const res = await callApi(handler, { method: "PUT", query: { id: "campaign-1" } });
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data).toEqual({
                inviteUrl: "/api/campaign/join/new-invite-code"
            });
            expect(mockPrisma.campaign.update).toHaveBeenCalledWith({
                where: { id: "campaign-1" },
                data: { inviteCode: "new-invite-code" }
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

        test("POST should receive 405", async () => {
            mockSession("user-1");

            const res = await callApi(handler, { method: "POST", query: { id: "campaign-1" } });
            expect(res.status).toBe(405);
        });

        test("DELETE should receive 405", async () => {
            mockSession("user-1");

            const res = await callApi(handler, { method: "DELETE", query: { id: "campaign-1" } });
            expect(res.status).toBe(405);
        });

    });

});