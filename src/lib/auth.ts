import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
// If your Prisma file is located elsewhere, you can change the path
import { PrismaClient } from "@/generated/prisma";
import { withAccelerate } from "@prisma/extension-accelerate";
import { nextCookies } from "better-auth/next-js"

const prisma = new PrismaClient().$extends(withAccelerate());
export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql", // or "mysql", "postgresql", ...etc
    }),
    emailAndPassword: { 
        enabled: true, 
    }, 
    socialProviders: { 
        google : { 
        clientId: process.env.GOOGLE_ID as string, 
        clientSecret: process.env.GOOGLE_SECRET as string, 
        }, 
    },
    plugins: [
        nextCookies()
    ],
    trustedOrigins: [
        "http://localhost:3000",
        "https://3d-quests.vercel.app",
    ],
    advanced: {
        database: {
            useNumberId: true
        }
    }
});