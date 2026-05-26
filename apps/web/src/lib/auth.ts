import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true
  },
  plugins: [
    jwt({
      jwks: {
        rotationInterval: 60 * 60 * 24 * 30, // 30 days
        gracePeriod: 60 * 60 * 24 * 30 // keep old key valid 30 days after rotation
      }
    }),
  ]
});