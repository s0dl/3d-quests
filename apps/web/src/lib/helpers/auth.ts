import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendError } from "@/lib/helpers/api";

export async function getCurrentUser(req: NextApiRequest) {
    const session = await auth.api.getSession({
        headers: req.headers as Record<string, string>
    });

    return session?.user.id;
}

export async function requireUser(req: NextApiRequest, res: NextApiResponse) {
    const userId = await getCurrentUser(req);

    if (!userId) {
        sendError(
            res,
            401,
            "UNAUTHORIZED",
            "You must be logged in to access this resource"
        );
        return null;
    }

    return userId;
}

export async function requireCampaignAccess(
    req: NextApiRequest, 
    res: NextApiResponse,
    campaignId: string,
) {
    const userId = await requireUser(req, res);

    if (!userId) {
        return { userId: null, member: null };
    }

    const member = await prisma.campaignMember.findUnique({
        where: {
            campaignId_userId: {
                campaignId,
                userId
            },
        },
        select: {
            role: true,
        }
    })

    if (!member) {
        sendError(
            res,
            403,
            "FORBIDDEN",
            "You do not have access to this campaign"
        )
        return { userId: userId, member: null };
    }

    return { userId: userId, member: member };
}