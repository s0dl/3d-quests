import { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, sendError } from "@/lib/helpers/api";
import { requireUser, requireCampaignAccess } from "@/lib/helpers/auth";
import { ApiErrorCode } from "@3d-quests/shared/constants";
import { prisma } from "@/lib/prisma";
import logger from "@/lib/pino";
import { CampaignRole } from "@prisma/client";
import { generateInviteCode } from "@/lib/nanoid";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        if (!allowMethods(req.method, ["PUT"], res)) {
            logger.warn({ method: req.method, path: "/api/campaign/[id]/invite" }, "Method not allowed");
            return;
        }

        const { id } = req.query;

        if (typeof id !== "string" || !id) {
            logger.warn("Invalid campaign ID");
            return sendError(
                res,
                400,
                ApiErrorCode.BAD_REQUEST,
                "Invalid campaign ID"
            );
        }

        const userId = await requireUser(req, res);

        if (!userId) {
            logger.info(`Unauthorized access attempt to /api/campaign/${id}/invite`);
            return;
        }

        const campaign = await prisma.campaign.findUnique({
            where: { id }
        });

        if (!campaign) {
            logger.warn({ campaignId: id }, "Campaign not found");
            return sendError(
                res,
                404,
                ApiErrorCode.NOT_FOUND,
                "Campaign not found"
            );
        }

        const member = await requireCampaignAccess(res, id, userId);

        if (!member) {
            logger.info({ userId, campaignId: campaign.id }, "User is not a member of the campaign");
            return sendError(
                res,
                409,
                ApiErrorCode.CONFLICT,
                "You are not a member of this campaign"
            );
        }

        if (member.role !== CampaignRole.GM) {
            logger.info({ userId, campaignId: campaign.id }, "User is not a GM of the campaign");
            return sendError(
                res,
                403,
                ApiErrorCode.FORBIDDEN,
                "Only the GM can regenerate the invite code"
            );
        }

        if (req.method === "PUT") {
            logger.debug({ campaignId: campaign.id, userId }, "Regenerating campaign invite code");

            const inviteCode = generateInviteCode(8);

            await prisma.campaign.update({
                where: { id },
                data: {
                    inviteCode
                }
            });

            logger.info(
                { userId, campaignId: campaign.id },
                "Successfully regenerated campaign invite code"
            );

            return res.status(200).json({
                inviteUrl: `/api/campaign/join/${inviteCode}`
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