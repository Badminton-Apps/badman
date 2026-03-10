import { Processor } from "../processor";
import { ProcessStep } from "../process-step";

// Suppress logger output during tests
jest.mock("@nestjs/common", () => {
  const actual = jest.requireActual("@nestjs/common");
  return {
    ...actual,
    Logger: jest.fn().mockImplementation(() => ({
      log: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    })),
  };
});

function makeStep(name: string, result?: unknown): ProcessStep<unknown> {
  return new ProcessStep(name, jest.fn().mockResolvedValue(result ?? { stop: false }));
}

describe("Processor", () => {
  describe("addStep", () => {
    it("should add a step", () => {
      const processor = new Processor();
      const step = makeStep("step-a");

      // Should not throw
      processor.addStep(step);
    });

    it("should throw when adding a duplicate step name", () => {
      const processor = new Processor();
      processor.addStep(makeStep("step-a"));

      expect(() => processor.addStep(makeStep("step-a"))).toThrow("Step already exists");
    });

    it("should replace an existing step when override=true", async () => {
      const processor = new Processor();
      processor.addStep(new ProcessStep("step-a", async () => ({ value: "original", stop: false })));
      processor.addStep(
        new ProcessStep("step-a", async () => ({ value: "replaced", stop: false })),
        true
      );

      await processor.process();

      expect(processor.getData("step-a")).toEqual({ value: "replaced", stop: false });
    });
  });

  describe("getData", () => {
    it("should throw for unknown step name", () => {
      const processor = new Processor();

      expect(() => processor.getData("nope")).toThrow("Step nope not found");
    });

    it("should return step data after processing", async () => {
      const processor = new Processor();
      processor.addStep(new ProcessStep("step-a", async () => ({ value: 1, stop: false })));

      await processor.process();

      expect(processor.getData("step-a")).toEqual({ value: 1, stop: false });
    });
  });

  describe("process", () => {
    it("should execute steps in insertion order", async () => {
      const order: string[] = [];
      const processor = new Processor();

      processor.addStep(
        new ProcessStep("first", async () => {
          order.push("first");
          return { stop: false };
        })
      );
      processor.addStep(
        new ProcessStep("second", async () => {
          order.push("second");
          return { stop: false };
        })
      );
      processor.addStep(
        new ProcessStep("third", async () => {
          order.push("third");
          return { stop: false };
        })
      );

      await processor.process();

      expect(order).toEqual(["first", "second", "third"]);
    });

    it("should stop when a step returns { stop: true }", async () => {
      const order: string[] = [];
      const processor = new Processor();

      processor.addStep(
        new ProcessStep("first", async () => {
          order.push("first");
          return { stop: false };
        })
      );
      processor.addStep(
        new ProcessStep("stopper", async () => {
          order.push("stopper");
          return { stop: true };
        })
      );
      processor.addStep(
        new ProcessStep("never", async () => {
          order.push("never");
          return { stop: false };
        })
      );

      await processor.process();

      expect(order).toEqual(["first", "stopper"]);
    });

    it("should continue when a step returns undefined (no stop property)", async () => {
      const order: string[] = [];
      const processor = new Processor();

      processor.addStep(
        new ProcessStep("first", async () => {
          order.push("first");
          return { stop: false };
        })
      );
      processor.addStep(
        new ProcessStep("undefined-step", async () => {
          order.push("undefined-step");
          return undefined;
        })
      );
      processor.addStep(
        new ProcessStep("last", async () => {
          order.push("last");
          return { stop: false };
        })
      );

      await processor.process();

      expect(order).toEqual(["first", "undefined-step", "last"]);
    });

    it("should pass args to each step", async () => {
      const executeFn = jest.fn().mockResolvedValue({ stop: false });
      const processor = new Processor();
      processor.addStep(new ProcessStep("step", executeFn));

      await processor.process({ data: "test" });

      expect(executeFn).toHaveBeenCalledWith({ data: "test" });
    });

    it("should propagate errors from steps", async () => {
      const processor = new Processor();
      processor.addStep(
        new ProcessStep("failing", async () => {
          throw new Error("step failed");
        })
      );

      await expect(processor.process()).rejects.toThrow("step failed");
    });

    it("should not execute subsequent steps after an error", async () => {
      const afterFn = jest.fn().mockResolvedValue({ stop: false });
      const processor = new Processor();

      processor.addStep(
        new ProcessStep("failing", async () => {
          throw new Error("boom");
        })
      );
      processor.addStep(new ProcessStep("after", afterFn));

      await expect(processor.process()).rejects.toThrow("boom");
      expect(afterFn).not.toHaveBeenCalled();
    });

    it("should handle empty processor (no steps)", async () => {
      const processor = new Processor();

      await expect(processor.process()).resolves.toBeUndefined();
    });

    it("should accept pre-built steps map in constructor", async () => {
      const order: string[] = [];
      const steps = new Map<string, ProcessStep<unknown>>();
      steps.set(
        "a",
        new ProcessStep("a", async () => {
          order.push("a");
          return { stop: false };
        })
      );
      steps.set(
        "b",
        new ProcessStep("b", async () => {
          order.push("b");
          return { stop: false };
        })
      );

      const processor = new Processor(steps);
      await processor.process();

      expect(order).toEqual(["a", "b"]);
    });
  });
});
