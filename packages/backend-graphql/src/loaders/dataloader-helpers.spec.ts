import { reindexByKey } from "./dataloader-helpers";

describe("reindexByKey", () => {
  it("preserves keys order even when rows arrive shuffled", () => {
    const keys = ["a", "b", "c", "d"];
    const rows = [
      { id: "c", value: 3 },
      { id: "a", value: 1 },
      { id: "d", value: 4 },
      { id: "b", value: 2 },
    ];

    const result = reindexByKey(keys, rows, (r) => r.id);

    expect(result.map((r) => r?.id)).toEqual(["a", "b", "c", "d"]);
    expect(result.map((r) => r?.value)).toEqual([1, 2, 3, 4]);
  });

  it("returns same length as keys regardless of row count", () => {
    expect(reindexByKey(["a", "b", "c"], [], (r: { id: string }) => r.id)).toHaveLength(3);
    expect(reindexByKey(["a"], [{ id: "a" }, { id: "x" }, { id: "y" }], (r) => r.id)).toHaveLength(
      1
    );
  });

  it("fills missing keys with null", () => {
    const result = reindexByKey(["a", "b", "c"], [{ id: "b", value: 2 }], (r) => r.id);

    expect(result[0]).toBeNull();
    expect(result[1]).toEqual({ id: "b", value: 2 });
    expect(result[2]).toBeNull();
  });

  it("handles duplicate keys by keeping the last row (HasOne semantics)", () => {
    const result = reindexByKey(
      ["a"],
      [
        { id: "a", value: 1 },
        { id: "a", value: 2 },
        { id: "a", value: 3 },
      ],
      (r) => r.id
    );

    expect(result[0]).toEqual({ id: "a", value: 3 });
  });

  it("ignores rows whose keyOf returns null or undefined", () => {
    const result = reindexByKey(
      ["a", "b"],
      [
        { id: "a", value: 1 },
        { id: null as unknown as string, value: 99 },
        { id: undefined as unknown as string, value: 100 },
      ],
      (r) => r.id
    );

    expect(result[0]).toEqual({ id: "a", value: 1 });
    expect(result[1]).toBeNull();
  });

  it("returns an empty array when keys is empty", () => {
    expect(reindexByKey([], [{ id: "a" }], (r) => r.id)).toEqual([]);
  });

  it("supports non-string keys", () => {
    const result = reindexByKey<number, { id: number }>(
      [1, 2, 3],
      [{ id: 2 }, { id: 1 }],
      (r) => r.id
    );
    expect(result.map((r) => r?.id ?? null)).toEqual([1, 2, null]);
  });
});
