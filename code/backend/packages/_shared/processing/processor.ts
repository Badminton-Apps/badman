import { logger } from '../utils';
import { ProcessStep } from './process-step';
import prettyMilliseconds from 'pretty-ms';

export class Processor {
  protected procesSteps: Map<string, ProcessStep<any>>;

  constructor(steps?: Map<string, ProcessStep<any>>) {
    this.procesSteps = steps ?? new Map();
  }

  addStep(step: ProcessStep<any>, override: boolean = false) {
    if (!override && !this.procesSteps.has(step.name)) {
      this.procesSteps.set(step.name, step);
    } else {
      logger.debug(
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
      throw new Error(`Step ${stepName} not found, options: ${[...this.procesSteps.keys()].join(', ')}`);
    }

    return this.procesSteps.get(stepName)?.getData();
  }

  async process(args?: any) {
    const totalStart = new Date().getTime();

    logger.debug(`Running process`);
    for (const [name, step] of this.procesSteps) {
      logger.debug(`Running step: ${name}`);
      const start = new Date().getTime();

      try {
        const stop = await step.executeStep(args);

        if (stop === true) {
          logger.debug('stop was set');
          break;
        }
      } catch (e) {
        logger.error(`Step ${name}, failed`, {
          args,
          error: e
        });
        throw e;
      }

      logger.debug(
        `Finished step ${name}, time: ${prettyMilliseconds(
          new Date().getTime() - start
        )}`
      );
    }
    logger.debug(
      `Finished processing, time: ${prettyMilliseconds(
        new Date().getTime() - totalStart
      )}`
    );
  }
}
