/**
 * True only when NODE_ENV is production. Used to gate Render API calls and
 * orchestrator start/stop behavior so the sync worker is only run on Render in production.
 */
export function isProductionEnv(nodeEnv: string | undefined): boolean {
  return nodeEnv === "production";
}
