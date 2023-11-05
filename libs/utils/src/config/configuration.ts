import * as Joi from 'joi';

export const configSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'provision')
    .default('development'),

  DB_IP: Joi.string().required(),
  DB_PORT: Joi.number().required(),
  DB_DATABASE: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DIALECT: Joi.string().required(),
  DB_SSL: Joi.string().optional(),

  DB_CACHE: Joi.boolean().optional(),
  DB_CACHE_PREFIX: Joi.string().optional(),
  REDIS_DATABASE: Joi.number().integer().optional(),
  REDIS_HOST: Joi.when('DB_CACHE', {
    is: true,
    then: Joi.string().hostname().required(),
    otherwise: Joi.string().hostname().optional(),
  }),
  REDIS_PORT: Joi.when('DB_CACHE', {
    is: true,
    then: Joi.number().integer().min(1).max(65535).required(),
    otherwise: Joi.number().integer().min(1).max(65535).optional(),
  }),

  QUEUE_DB: Joi.number().integer().required(),

  CLIENT_URL: Joi.string().uri().required(),

  LOGTAIL_TOKEN: Joi.string().optional(),

  AUTH0_ISSUER_URL: Joi.string().uri().required(),
  AUTH0_AUDIENCE: Joi.string().required(),
  AUTH0_CLIENT_ID: Joi.string().required(),
  AUTH0_CLIENT_SECRET: Joi.string().required(),

  MAIL_ENABLED: Joi.boolean().required(),
  MAIL_PASS: Joi.when('MAIL_ENABLED', {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  MAIL_USER: Joi.when('MAIL_ENABLED', {
    is: true,
    then: Joi.string().email({ tlds: { allow: false } }).required(),
    otherwise: Joi.string().email({ tlds: { allow: false } }).optional(),
  }),
  MAIL_HOST: Joi.when('MAIL_ENABLED', {
    is: true,
    then: Joi.string().hostname().required(),
    otherwise: Joi.string().hostname().optional(),
  }),
  MAIL_SUBJECT_PREFIX: Joi.when('MAIL_ENABLED', {
    is: true,
    then: Joi.string().optional(),
    otherwise: Joi.string().optional(),
  }),

  PUSH_ENABLED: Joi.boolean().required(),
  VAPID_PRIVATE_KEY: Joi.when('PUSH_ENABLED', {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  VAPID_PUBLIC_KEY: Joi.when('PUSH_ENABLED', {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),

  VR_CHANGE_DATES: Joi.boolean().required(),
  VR_API: Joi.string().uri().required(),
  VR_API_USER: Joi.string().required(),
  VR_API_PASS: Joi.string().required(),

  CP_PASS: Joi.string().required(),

  APM_SERVER_ACTIVE: Joi.boolean(),
  APM_SERVER_URL: Joi.when('APM_SERVER_ACTIVE', {
    is: true,
    then: Joi.string().uri().required(),
    otherwise: Joi.string().uri().optional(),
  }),
  APM_SERVER_TOKEN: Joi.when('APM_SERVER_ACTIVE', {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),

  VERCEL_ANALYTICS_ID: Joi.string(),

  GRAPH_ID: Joi.string().required(),
});

export const parseconfig = () => ({
  DB_CACHE: process.env?.['DB_CACHE'] === 'true',
  MAIL_ENABLED: process.env?.['MAIL_ENABLED'] === 'true',
  PUSH_ENABLED: process.env?.['PUSH_ENABLED'] === 'true',
  VR_CHANGE_DATES: process.env?.['VR_CHANGE_DATES'] === 'true',
  APM_SERVER_ACTIVE: process.env?.['APM_SERVER_ACTIVE'] === 'true',
});