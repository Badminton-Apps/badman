import path from 'node:path';

// it will import the compiled js file from dist directory
const workerThreadFilePath = path.resolve(process.cwd(), 'dist/libs/backend/ranking/src/worker/process-ranking.js')

export default workerThreadFilePath;
