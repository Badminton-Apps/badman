import { ArgumentsHost, Catch, Logger } from "@nestjs/common";
import { SentryGlobalFilter } from "@sentry/nestjs/setup";

const SILENCED_CODES = new Set([
  "ERR_STREAM_PREMATURE_CLOSE",
  "ERR_STREAM_DESTROYED",
  "FST_ERR_REQ_ABORTED",
]);

function getCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

/**
 * Wraps SentryGlobalFilter so client-disconnect errors do not reach Sentry
 * or the default NestJS ExceptionsHandler logger. The HTTP response is
 * already aborted by the time these surface — nothing actionable to log.
 */
@Catch()
export class PrematureCloseFilter extends SentryGlobalFilter {
  private readonly silenceLogger = new Logger(PrematureCloseFilter.name);

  override catch(exception: unknown, host: ArgumentsHost): void {
    const code = getCode(exception);
    if (code && SILENCED_CODES.has(code)) {
      this.silenceLogger.debug(`Client disconnected (${code}); response aborted`);
      return;
    }
    return super.catch(exception, host);
  }
}
