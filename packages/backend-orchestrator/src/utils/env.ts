/**
 * True when NODE_ENV is production or staging. Used to gate Render API calls and
 * orchestrator start/stop behavior so the sync worker is auto-suspended on Render
 * in both environments.
 */
export function isDeployedEnv(nodeEnv: string | undefined): boolean {
  return nodeEnv === "production" || nodeEnv === "staging";
}
