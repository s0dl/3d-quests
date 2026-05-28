import { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, sendError } from "@/lib/helpers/api";
import { requireCampaignAccess } from "@/lib/helpers/auth";
import { ApiErrorCode } from "@3d-quests/shared/constants";
import { prisma } from "@/lib/prisma";
import logger from "@/lib/pino";
import { CampaignRole } from "@prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        if (!allowMethods(req.method, ["GET", "PUT", "DELETE"], res)) {
            logger.warn({ method: req.method, path: "/api/campaign/[id]" }, "Method not allowed");
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

        const { userId, member } = await requireCampaignAccess(req, res, id);

        if (!userId) {
            logger.info(`Unauthorized access attempt to /api/campaign`);
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

        if (!member) {
            logger.info({ userId, campaignId: id }, "User does not have access to campaign");
            return;
        }

        if (req.method === "GET") {
            logger.debug({ campaignId: id, userId }, "Fetching campaign details");

            const fullCampaign = await prisma.campaign.findUnique({
                where: { id },
                include: {
                    members: true,
                    maps: true
                }
            });

            logger.info(
                { userId, fullCampaign },
                "Fetched user campaigns"
            );

            return res.status(200).json({
                id: fullCampaign?.id,
                name: fullCampaign?.name,
                description: fullCampaign?.description,
                inviteUrl: `/api/campaign/join/${fullCampaign?.inviteCode}`,
                members: fullCampaign?.members,
                maps: fullCampaign?.maps
            });
        }

        if (req.method === "PUT") {
            logger.debug({ userId }, "Updating campaign");

            if (member.role !== CampaignRole.GM) {
                logger.info({ userId, campaignId: id }, "User is not a GM of the campaign");
                return sendError(
                    res,
                    403,
                    ApiErrorCode.FORBIDDEN,
                    "You do not have permission to modify this campaign"
                );
            }

            const { name, description, removeMemberId } = req.body;

            if (!name && !description && !removeMemberId) {
                return sendError(
                    res,
                    400,
                    ApiErrorCode.BAD_REQUEST,
                    "No update fields provided"
                );
            }

            await prisma.campaign.update({
                where: { id },
                data: {
                    ...(name ? { name } : {}),
                    ...(description ? { description } : {}),
                    ...(removeMemberId
                        ? {
                            members: {
                                delete: {
                                    campaignId_userId: {
                                        campaignId: id,
                                        userId: removeMemberId
                                    }
                                }
                            }
                        }
                        : {})

                }
            });

            logger.info(
                { userId, campaignId: id, updatedFields: { name, description, removeMemberId } },
                "Successfully updated campaign"
            )

            return res.status(204).end();
        }

        if (req.method === "DELETE") {
            logger.debug({ userId }, "Deleting campaign");

            if (member.role !== CampaignRole.GM) {
                logger.info({ userId, campaignId: id }, "User is not a GM of the campaign");
                return sendError(
                    res,
                    403,
                    ApiErrorCode.FORBIDDEN,
                    "You do not have permission to delete this campaign"
                );
            }

            await prisma.campaign.delete({
                where: { id }
            });

            logger.info(
                { userId, campaignId: id },
                "Successfully deleted campaign"
            )

            return res.status(204).end();
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