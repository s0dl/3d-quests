import { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, sendError } from "@/lib/helpers/api";
import { requireUser } from "@/lib/helpers/auth";
import { ApiErrorCode } from "@3d-quests/shared/constants";
import { prisma } from "@/lib/prisma";
import logger from "@/lib/pino";
import { CampaignRole } from "@prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        if (!allowMethods(req.method, ["POST"], res)) {
            logger.warn({ method: req.method, path: "/api/campaign/[id]" }, "Method not allowed");
            return;
        }

        const { inviteCode } = req.query;

        if (typeof inviteCode !== "string" || !inviteCode) {
            logger.warn("Invalid invite code");
            return sendError(
                res,
                400,
                ApiErrorCode.BAD_REQUEST,
                "Invalid invite code"
            );
        }

        const userId = await requireUser(req, res);

        if (!userId) {
            logger.info(`Unauthorized access attempt to /api/campaign/join/${inviteCode}`);
            return;
        }

        const campaign = await prisma.campaign.findUnique({
            where: { inviteCode },
            include: { members: true }
        });

        if (!campaign) {
            logger.warn({ inviteCode: inviteCode }, "Campaign not found from invite code");
            return sendError(
                res,
                404,
                ApiErrorCode.NOT_FOUND,
                "Campaign not found from invite code"
            );
        }

        const member = campaign.members.find((m) => m.userId === userId);

        if (member) {
            logger.info({ userId, campaignId: campaign.id }, "User is already a member of the campaign");
            return sendError(
                res,
                409,
                ApiErrorCode.CONFLICT,
                "You are already a member of this campaign"
            );
        }

        if (req.method === "POST") {
            logger.debug({ campaignId: campaign.id, userId }, "Joining campaign");

            await prisma.campaignMember.create({
                data: {
                    campaignId: campaign.id,
                    userId,
                    role: CampaignRole.PLAYER,
                }
            });

            logger.info(
                { userId, campaignId: campaign.id},
                "User successfully joined campaign"
            );

            return res.status(200).json({
                campaignId: campaign.id
            });
        }

    } catch (error) {
        logger.error({ err: error, method: req.method, path: "/api/campaign/[id]" }, "Campaign modification route failed");
        return sendError(
            res,
            500,
            ApiErrorCode.INTERNAL_ERROR,
            `An unexpected error occurred`
        )
    }

}