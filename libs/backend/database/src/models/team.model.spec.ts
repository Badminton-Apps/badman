import "reflect-metadata";
import { CreateOptions, UpdateOptions } from "sequelize";
import { SubEventTypeEnum } from "@badman/utils";
import { Team } from "@badman/backend-database";

const makeInstance = (changed: Record<string, boolean>, extras: Partial<Team> = {}) =>
  ({
    ...extras,
    changed: jest.fn((field: string) => changed[field] ?? false),
    getClub: jest.fn().mockResolvedValue({ name: "Club", abbreviation: "CLB" }),
  }) as unknown as Team;

describe("Team.regenerateOnUpdate (@BeforeUpdate hook)", () => {
  afterEach(() => jest.restoreAllMocks());

  it("calls generateName and generateAbbreviation when teamNumber changed", async () => {
    const instance = makeInstance({ teamNumber: true });
    const nameSpy = jest.spyOn(Team, "generateName").mockResolvedValue(undefined);
    const abbrevSpy = jest.spyOn(Team, "generateAbbreviation").mockResolvedValue(undefined);

    await Team.regenerateOnUpdate(instance, {} as unknown as UpdateOptions);

    expect(nameSpy).toHaveBeenCalledWith(instance, {});
    expect(abbrevSpy).toHaveBeenCalledWith(instance, {});
  });

  it("calls generateName and generateAbbreviation when type changed", async () => {
    const instance = makeInstance({ type: true });
    const nameSpy = jest.spyOn(Team, "generateName").mockResolvedValue(undefined);
    const abbrevSpy = jest.spyOn(Team, "generateAbbreviation").mockResolvedValue(undefined);

    await Team.regenerateOnUpdate(instance, {} as unknown as UpdateOptions);

    expect(nameSpy).toHaveBeenCalledTimes(1);
    expect(abbrevSpy).toHaveBeenCalledTimes(1);
  });

  it("does not call generateName or generateAbbreviation when neither changed", async () => {
    const instance = makeInstance({ teamNumber: false, type: false });
    const nameSpy = jest.spyOn(Team, "generateName").mockResolvedValue(undefined);
    const abbrevSpy = jest.spyOn(Team, "generateAbbreviation").mockResolvedValue(undefined);

    await Team.regenerateOnUpdate(instance, {} as unknown as UpdateOptions);

    expect(nameSpy).not.toHaveBeenCalled();
    expect(abbrevSpy).not.toHaveBeenCalled();
  });
});

describe("Team.regenerateOnUpdate — type variant coverage (@BeforeUpdate US2)", () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([
    SubEventTypeEnum.M,
    SubEventTypeEnum.F,
    SubEventTypeEnum.MX,
    SubEventTypeEnum.NATIONAL,
  ])("calls hooks when type changes to %s", async (newType) => {
    const instance = makeInstance({ type: true }, { type: newType } as Partial<Team>);
    const nameSpy = jest.spyOn(Team, "generateName").mockResolvedValue(undefined);
    const abbrevSpy = jest.spyOn(Team, "generateAbbreviation").mockResolvedValue(undefined);

    await Team.regenerateOnUpdate(instance, {} as unknown as UpdateOptions);

    expect(nameSpy).toHaveBeenCalledTimes(1);
    expect(abbrevSpy).toHaveBeenCalledTimes(1);
  });
});

describe("Team.setAbbriviations (@BeforeBulkCreate SC-005)", () => {
  afterEach(() => jest.restoreAllMocks());

  it("calls generateAbbreviation exactly once per instance (no double-call)", async () => {
    jest.spyOn(Team, "generateName").mockResolvedValue(undefined);
    const abbrevSpy = jest.spyOn(Team, "generateAbbreviation").mockResolvedValue(undefined);

    const instances = [
      { isNewRecord: true, changed: jest.fn() } as unknown as Team,
      { isNewRecord: true, changed: jest.fn() } as unknown as Team,
      { isNewRecord: true, changed: jest.fn() } as unknown as Team,
    ];

    await Team.setAbbriviations(instances, {} as CreateOptions);

    expect(abbrevSpy).toHaveBeenCalledTimes(3);
  });
});
