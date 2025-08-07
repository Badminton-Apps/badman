import { GAME } from "./game";
import { JOB } from "./job";
import { CLUB } from "./club";
import { SERVICE } from "./service";

export const EVENTS = {
  CONNECTION: "connection",
  CONNECT: "connect",
  GAME,
  JOB,
  CLUB,
  SERVICE,
};

export type ServiceEvent = (typeof SERVICE)[keyof typeof SERVICE];
export type GameEvent = (typeof GAME)[keyof typeof GAME];
export type JobEvent = (typeof JOB)[keyof typeof JOB];
export type ClubEvent = (typeof CLUB)[keyof typeof CLUB];
export type ConnectionEvent = "connection";
export type ConnectEvent = "connect";
