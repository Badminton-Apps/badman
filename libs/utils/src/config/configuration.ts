import Joi from "joi";

export const configSchema = Joi.object({
  // default values
  NODE_ENV: Joi.string().valid("development", "production", "test", "beta").default("development"),

  DB_STORAGE: Joi.string().optional(),
  DB_IP: Joi.when("NODE_ENV", {
    is: Joi.valid("production", "beta"),
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  DB_PORT: Joi.when("NODE_ENV", {
    is: Joi.valid("production", "beta"),
    then: Joi.number().required(),
    otherwise: Joi.number().optional(),
  }),
  DB_DATABASE: Joi.when("NODE_ENV", {
    is: Joi.valid("production", "beta"),
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  DB_USER: Joi.when("NODE_ENV", {
    is: Joi.valid("production", "beta"),
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  DB_PASSWORD: Joi.when("NODE_ENV", {
    is: Joi.valid("production", "beta"),
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  DB_DIALECT: Joi.when("NODE_ENV", {
    is: Joi.valid("production", "beta"),
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  DB_SSL: Joi.boolean().optional(),

  DB_CACHE: Joi.boolean().default(false),
  DB_CACHE_PREFIX: Joi.string().optional(),
  DB_LOGGING: Joi.boolean().optional(),
  REDIS_DATABASE: Joi.number().integer().optional(),
  REDIS_HOST: Joi.when("DB_CACHE", {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  REDIS_PORT: Joi.when("DB_CACHE", {
    is: true,
    then: Joi.number().integer().min(1).max(65535).required(),
    otherwise: Joi.number().integer().min(1).max(65535).optional(),
  }),

  QUEUE_DB: Joi.when("DB_CACHE", {
    is: true,
    then: Joi.number().integer().required(),
    otherwise: Joi.number().integer().optional(),
  }),

  CLIENT_URL: Joi.string().uri().required(),
  LEGACY_CLIENT_URL: Joi.string().uri().required(),

  LOGTAIL_TOKEN: Joi.string().optional(),

  AUTH0_ISSUER_URL: Joi.string().uri().required(),
  AUTH0_AUDIENCE: Joi.string().required(),

  MAIL_ENABLED: Joi.boolean().default(false),
  MAIL_PASS: Joi.when("MAIL_ENABLED", {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  MAIL_USER: Joi.when("MAIL_ENABLED", {
    is: true,
    then: Joi.string()
      .email({ tlds: { allow: false } })
      .required(),
    otherwise: Joi.string()
      .email({ tlds: { allow: false } })
      .optional(),
  }),
  MAIL_HOST: Joi.when("MAIL_ENABLED", {
    is: true,
    then: Joi.string().hostname().required(),
    otherwise: Joi.string().hostname().optional(),
  }),
  MAIL_SUBJECT_PREFIX: Joi.when("MAIL_ENABLED", {
    is: true,
    then: Joi.string().optional(),
    otherwise: Joi.string().optional(),
  }),

  DEV_EMAIL_DESTINATION: Joi.string()
    .email({ tlds: { allow: false } })
    .optional(),

  PUSH_ENABLED: Joi.boolean().default(false),
  VAPID_PRIVATE_KEY: Joi.when("PUSH_ENABLED", {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  VAPID_PUBLIC_KEY: Joi.when("PUSH_ENABLED", {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),

  // Visual
  VR_CHANGE_DATES: Joi.boolean().optional(),
  VR_ACCEPT_ENCOUNTERS: Joi.boolean().optional(),

  VR_API: Joi.string().uri().required(),
  VR_API_USER: Joi.string().optional(),
  VR_API_PASS: Joi.string().optional(),

  TWIZZIT_API: Joi.when("NODE_ENV", {
    is: Joi.valid("production", "beta"),
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  TWIZZIT_API_USER: Joi.when("NODE_ENV", {
    is: Joi.valid("production", "beta"),
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  TWIZZIT_API_PASS: Joi.when("NODE_ENV", {
    is: Joi.valid("production", "beta"),
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),

  CP_PASS: Joi.string().optional(),

  APOLLO_GRAPH_REF: Joi.when("NODE_ENV", {
    is: Joi.valid("production", "beta"),
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),

  GRAPH_ID: Joi.string().optional(),

  RENDER_API_KEY: Joi.when("NODE_ENV", {
    is: Joi.valid("production", "beta"),
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  RENDER_API_URL: Joi.when("NODE_ENV", {
    is: Joi.valid("production", "beta"),
    then: Joi.string().uri().required(),
    otherwise: Joi.string().uri().optional(),
  }),
  RENDER_WAIT_TIME: Joi.number().integer().optional().default(2_100_000),
});

export const load = () => ({
  DB_CACHE: process.env?.["DB_CACHE"] === "true",
  DB_LOGGING: process.env?.["DB_LOGGING"] === "true",
  MAIL_ENABLED: process.env?.["MAIL_ENABLED"] === "true",
  PUSH_ENABLED: process.env?.["PUSH_ENABLED"] === "true",
  VR_CHANGE_DATES: process.env?.["VR_CHANGE_DATES"] === "true",
  VR_ACCEPT_ENCOUNTERS: process.env?.["VR_ACCEPT_ENCOUNTERS"] === "true",
});

export type ConfigType = {
  NODE_ENV: "development" | "production" | "test" | "beta";
  DB_STORAGE?: string;
  DB_IP?: string;
  DB_PORT?: number;
  DB_DATABASE?: string;
  DB_USER?: string;
  DB_PASSWORD?: string;
  DB_DIALECT?: string;
  DB_SSL?: boolean;
  DB_CACHE: boolean;
  DB_CACHE_PREFIX?: string;
  DB_LOGGING?: boolean;
  REDIS_DATABASE?: number;
  REDIS_HOST?: string;
  REDIS_PORT?: number;
  REDIS_PASSWORD?: string;
  QUEUE_DB: number;
  CLIENT_URL: string;
  LEGACY_CLIENT_URL: string;
  LOGTAIL_TOKEN?: string;
  AUTH0_ISSUER_URL: string;
  AUTH0_AUDIENCE: string;
  MAIL_ENABLED: boolean;
  MAIL_PASS?: string;
  MAIL_USER?: string;
  MAIL_HOST?: string;
  MAIL_SUBJECT_PREFIX?: string;
  DEV_EMAIL_DESTINATION?: string;
  PUSH_ENABLED: boolean;
  VAPID_PRIVATE_KEY?: string;
  VAPID_PUBLIC_KEY?: string;
  VR_CHANGE_DATES: boolean;
  VR_ACCEPT_ENCOUNTERS: boolean;
  VR_API: string;
  VR_API_USER: string;
  VR_API_PASS: string;
  TWIZZIT_API: string;
  TWIZZIT_API_USER: string;
  TWIZZIT_API_PASS: string;
  CP_PASS?: string;
  APOLLO_GRAPH_REF?: string;
  GRAPH_ID: string;
  RENDER_API_KEY: string;
  RENDER_API_URL: string;
  RENDER_WAIT_TIME?: number;
};
