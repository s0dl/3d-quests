import { nanoid } from "nanoid";

export function generateInviteCode(length: number = 8): string {
    return nanoid(length);
}