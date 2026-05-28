import pino, { type LoggerOptions } from "pino";

const pinoConfig: LoggerOptions = {
    level: process.env.LOG_LEVEL ?? "debug",
    redact: [
        "password",
        "token",
        "authorization",
        "headers.authorization",
        "cookie",
        "headers.cookie",
    ],
    browser: {
        asObject: true,
    },
};

const logger = pino(pinoConfig);

export const log = (message: string) => logger.info(message);
export default logger;