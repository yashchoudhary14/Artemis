import type { FastifyBaseLogger } from "fastify";

// Lets background modules (watchdog, notifier, Telegram poller) use Fastify's logger.
type Target = Pick<FastifyBaseLogger, "info" | "warn" | "error">;
let target: Target | undefined;

export function setLogger(logger: Target) {
  target = logger;
}

export const log = {
  info: (msg: string, extra: object = {}) => (target ? target.info(extra, msg) : console.info(msg, extra)),
  warn: (msg: string, extra: object = {}) => (target ? target.warn(extra, msg) : console.warn(msg, extra)),
  error: (msg: string, extra: object = {}) => (target ? target.error(extra, msg) : console.error(msg, extra)),
};
