// @ts-nocheck
// Used to detect if this is the first initialization (for dev HMR purposes)

import { logger } from "@/logger";

export const isFreshInitialization =
  typeof globalThis["__refresh"] === "undefined" ||
  globalThis["__refresh"] === 0;

export function entrypoint() {
  globalThis["__refresh"] =
    typeof globalThis["__refresh"] === "undefined"
      ? 0
      : globalThis["__refresh"] + 1;

  if (typeof globalThis["__startTime"] === "undefined") {
    globalThis["__startTime"] = Date.now();
  }
  logger.debug(
    `Entrypoint called. Refresh count: ${
      globalThis["__refresh"]
    }, Time since start: ${Date.now() - globalThis["__startTime"]}ms`
  );
}

export function getCurrentUptimeInSeconds() {
  if (typeof globalThis["__startTime"] === "undefined") {
    return 0;
  }
  return Math.floor((Date.now() - globalThis["__startTime"]) / 1000);
}
