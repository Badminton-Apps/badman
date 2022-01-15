import { logger } from '../utils';
import { ProcessStep } from './process-step';
import { Logger } from 'winston';
import prettyMilliseconds from 'pretty-ms';

export class Processor {
  protected procesSteps: Map<string, ProcessStep<unknown>>;
  protected logger: Logger;

  constructor(
    steps?: Map<string, ProcessStep<unknown>>,
    options?: {
      logger?: Logger;
    }
  ) {
    this.procesSteps = steps ?? new Map();
    this.logger = options?.logger ?? logger;
  }

  addStep(step: ProcessStep<unknown>, override = false) {
    if (!override && !this.procesSteps.has(step.name)) {
      this.procesSteps.set(step.name, step);
    } else {
      this.logger.debug(
        `Steps:`,
        [...this.procesSteps.keys()],
        'new Step',
        step.name
      );
      throw new Error('Step already exists');
    }
  }

  getData(stepName: string) {
    if (!this.procesSteps.has(stepName)) {
      throw new Error(
        `Step ${stepName} not found, options: ${[
          ...this.procesSteps.keys(),
        ].join(', ')}`
      );
    }

    return this.procesSteps.get(stepName)?.getData();
  }

  async process(args?: unknown) {
    const totalStart = new Date().getTime();

    this.logger.debug(`Running process`);
    for (const [name, step] of this.procesSteps) {
      this.logger.debug(`Running step: ${name}`);
      const start = new Date().getTime();

      try {
        const stop = await step.executeStep(args);

        if (stop === true) {
          this.logger.debug('stop was set');
          break;
        }
      } catch (e) {
        this.logger.error(`Step ${name}, failed`, {
          args,
          error: e,
        });
        throw e;
      }

      this.logger.debug(
        `Finished step ${name}, time: ${prettyMilliseconds(
          new Date().getTime() - start
        )}`
      );
    }
    this.logger.debug(
      `Finished processing, time: ${prettyMilliseconds(
        new Date().getTime() - totalStart
      )}`
    );
  }
}
