import { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, sendError } from "@/lib/helpers/api";
import { requireUser } from "@/lib/helpers/auth";
import { ApiErrorCode } from "@3d-quests/shared/constants";
import { generateInviteCode } from "@/lib/nanoid";
import { prisma } from "@/lib/prisma";
import logger from "@/lib/pino";
import { CampaignRole } from "@prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        if (!allowMethods(req.method, ["GET", "POST"], res)) {
            logger.warn({ method: req.method, path: "/api/campaign" }, "Method not allowed");
            return;
        }

        const userId = await requireUser(req, res);

        if (!userId) {
            logger.info(`Unauthorized access attempt to /api/campaign`);
            return;
        }

        if (req.method === "GET") {
            logger.debug({ userId }, "Fetching user campaigns");

            const campaigns = await prisma.campaign.findMany({
                where: {
                    members: {
                        some: {
                            userId
                        }
                    }
                }
            });

            logger.info(
                { userId, campaignCount: campaigns.length },
                "Fetched user campaigns"
            );

            if (campaigns.length === 0) {
                return sendError(
                    res,
                    404,
                    ApiErrorCode.NOT_FOUND,
                    "No campaigns found for this user"
                );
            }

            return res.status(200).json(campaigns);
        }

        if (req.method === "POST") {
            logger.debug({ userId }, "Creating new campaign");

            const { name, description } = req.body;

            if (!name) {
                logger.warn({ userId }, "Campaign creation missing name");
                return sendError(
                    res,
                    400,
                    ApiErrorCode.BAD_REQUEST,
                    "Name is required"
                );
            }

            const campaign = await prisma.campaign.create({
                data: {
                    name,
                    description,
                    members: {
                        create: {
                            userId,
                            role: CampaignRole.GM
                        }
                    },
                    inviteCode: generateInviteCode(8)
                }
            });

            logger.info(
                { userId, campaignId: campaign.id },
                "Created new campaign"
            )

            return res.status(201).json({ campaignId: campaign.id });


        }
    } catch (error) {
        logger.error({ err: error, method: req.method, path: "/api/campaign" }, "Campaign route failed");
        return sendError(
            res,
            500,
            ApiErrorCode.INTERNAL_ERROR,
            `An unexpected error occurred`
        )
    }

}