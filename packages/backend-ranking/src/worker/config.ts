import path from "node:path";

// The worker-thread entry is the compiled sibling of this file: this module
// runs from dist/worker/config.js, and process-ranking.js sits next to it.
// Resolving via __dirname keeps it independent of the process working dir.
const workerThreadFilePath = path.resolve(__dirname, "process-ranking.js");

export default workerThreadFilePath;
