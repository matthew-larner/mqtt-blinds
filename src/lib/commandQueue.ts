import * as logger from "./logger/logger";

/** One consumer per hub; failed writes remain pending until retry or expiry. */
export default class CommandQueue {
  private tail: Promise<void> = Promise.resolve();

  enqueue(
    send: (timeoutMs: number) => Promise<void>,
    description: string,
    timeoutMs = 10000,
    maxAgeMs = 60000,
    maxAttempts = 3
  ): Promise<void> {
    const expiresAt = Date.now() + maxAgeMs;
    const run = async () => {
      let lastError = new Error("Command expired before it could be sent");
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const remaining = expiresAt - Date.now();
        if (remaining <= 0) break;
        try {
          await send(Math.min(timeoutMs, remaining));
          return;
        } catch (error) {
          lastError = error;
          logger.error(`Command ${description}, attempt ${attempt}: ${error.message}`);
        }
      }
      throw lastError;
    };
    const result = this.tail.then(run);
    // A failure must not stop subsequent commands from being processed.
    this.tail = result.catch(() => undefined);
    return result;
  }
}
