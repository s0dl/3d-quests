import { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, sendError } from "@/lib/helpers/api";
import { requireUser, requireCampaignAccess } from "@/lib/helpers/auth";
import { ApiErrorCode } from "@3d-quests/shared/constants";
import { prisma } from "@/lib/prisma";
import logger from "@/lib/pino";
import { CampaignRole } from "@prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        if (!allowMethods(req.method, ["POST"], res)) {
            logger.warn({ method: req.method, path: "/api/campaign/[id]/map" }, "Method not allowed");
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

        const { name, description } = req.body;

        if (!name || typeof name !== "string") {
            logger.warn("Invalid map name");
            return sendError(
                res,
                400,
                ApiErrorCode.BAD_REQUEST,
                "Map name is required and must be a string"
            );
        }

        const userId = await requireUser(req, res);

        if (!userId) {
            logger.info({ campaignId: id }, `Unauthorized access attempt to campaign`);
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
            logger.info({ userId, campaignId: id }, "User does not have access to campaign");
            return;
        }

        if (member.role !== CampaignRole.GM) {
            logger.info({ userId, campaignId: id }, "User is not a GM of the campaign");
            return sendError(
                res,
                403,
                ApiErrorCode.FORBIDDEN,
                "You do not have permission to create maps for this campaign"
            );
        }

        if (req.method === "POST") {
            logger.debug({ campaignId: id, userId }, "Making new map");

            const map = await prisma.$transaction(async (tx) => {
                const createdMap = await tx.map.create({
                    data: {
                        name,
                        ...(description ? { description } : {}),
                        ownerId: userId,
                        campaignId: id,
                        data: {}
                    }
                })

                await tx.campaign.update({
                    where: { id },
                    data: {
                        lastMapId: createdMap.id
                    }
                })

                return createdMap;
            });

            logger.info(
                { userId, campaignId: id, mapId: map.id },
                "New map made for campaign"
            );

            return res.status(201).json({
                mapId: map.id,
            });
        }

    } catch (error) {
        logger.error({ err: error, method: req.method, path: "/api/campaign/[id]/map" }, "Campaign modification route failed");
        return sendError(
            res,
            500,
            ApiErrorCode.INTERNAL_ERROR,
            `An unexpected error occurred`
        )
    }

}