import { ProcessStep } from "../process-step";

describe("ProcessStep", () => {
  it("should run the execute function and store data", async () => {
    const step = new ProcessStep("test", async () => ({ value: 42 }));

    const stop = await step.executeStep();

    expect(stop).toBe(false);
    expect(step.getData()).toEqual({ value: 42 });
  });

  it("should return stop=true when execute returns { stop: true }", async () => {
    const step = new ProcessStep("test", async () => ({ stop: true }));

    const stop = await step.executeStep();

    expect(stop).toBe(true);
  });

  it("should return stop=false when execute returns { stop: false }", async () => {
    const step = new ProcessStep("test", async () => ({ stop: false }));

    const stop = await step.executeStep();

    expect(stop).toBe(false);
  });

  it("should return stop=false when execute returns data without stop property", async () => {
    const step = new ProcessStep("test", async () => ({ foo: "bar" }));

    const stop = await step.executeStep();

    expect(stop).toBe(false);
  });

  it("should return stop=false when execute returns undefined (void)", async () => {
    const step = new ProcessStep("test", async () => undefined as void);

    const stop = await step.executeStep();

    expect(stop).toBe(false);
  });

  it("should pass args to the execute function", async () => {
    const executeFn = jest.fn().mockResolvedValue({ done: true });
    const step = new ProcessStep("test", executeFn);

    await step.executeStep({ input: "hello" });

    expect(executeFn).toHaveBeenCalledWith({ input: "hello" });
  });

  it("should throw when getData is called before execution", () => {
    const step = new ProcessStep("test", async () => "data");

    expect(() => step.getData()).toThrow("Step hasn't been executed yet");
  });

  it("should propagate errors from execute", async () => {
    const step = new ProcessStep("test", async () => {
      throw new Error("boom");
    });

    await expect(step.executeStep()).rejects.toThrow("boom");
  });

  it("should not mark as ran when execute throws", async () => {
    const step = new ProcessStep("test", async () => {
      throw new Error("boom");
    });

    try {
      await step.executeStep();
    } catch {
      // expected
    }

    expect(() => step.getData()).toThrow("Step hasn't been executed yet");
  });
});
