import { ApiErrorCode } from "@3d-quests/shared/constants";
import { NextApiResponse } from "next";

export function sendError(
    res: NextApiResponse,
    status: number,
    errorCode: ApiErrorCode,
    message: string
) {
    return res.status(status).json({ errorCode, message });
}

export function allowMethods(
    method: string | undefined,
    allowed: string[],
    res: NextApiResponse
) {
    if (!method || !allowed.includes(method)) {
        res.setHeader("Allow", allowed.join(", "));
        sendError(
            res,
            405,
            ApiErrorCode.METHOD_NOT_ALLOWED,
            `Method ${method} Not Allowed`
        );
        return false;
    }      
    return true; 
}