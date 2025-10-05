import { logger } from "@/logger";

export default class BackgroundWorker {
  private name: string;
  private clusure: (ping: () => {}) => void;
  private abortController: AbortController | null = null;
  private isRunning: boolean = false;

  constructor(name: string, clusure: (ping: () => {}) => void) {
    this.name = name;
    this.clusure = clusure;
  }

  async start() {
    if (this.isRunning) {
      logger.warn(`Worker ${this.name} is already running`);
      return;
    }

    logger.info(`Starting background worker: ${this.name}`);
    this.abortController = new AbortController();
    this.isRunning = true;

    const ping = () => {
      if (!this.abortController?.signal.aborted) {
        logger.debug(`Ping from worker: ${this.name}`);
      }
    };

    try {
      await new Promise<void>((resolve, reject) => {
        this.abortController!.signal.addEventListener("abort", () => {
          logger.info(`Worker ${this.name} was aborted`);
          resolve();
        });

        // Run closure asynchronously
        Promise.resolve()
          .then(() => {
            if (!this.abortController!.signal.aborted) {
              this.clusure(ping as () => {});
            }
          })
          .catch(reject);
      });
    } catch (error) {
      logger.error(`Worker ${this.name} error`, { error });
    } finally {
      this.isRunning = false;
    }
  }

  stop() {
    if (this.abortController && this.isRunning) {
      logger.info(`Stopping background worker: ${this.name}`);
      this.abortController.abort();
      this.abortController = null;
      this.isRunning = false;
    }
  }

  isActive(): boolean {
    return this.isRunning;
  }
}
