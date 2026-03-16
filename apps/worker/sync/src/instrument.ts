import * as Sentry from "@sentry/nestjs";

const dsn = process.env.SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    sendDefaultPii: true,
    enabled: process.env.NODE_ENV === "production",
  });
}
