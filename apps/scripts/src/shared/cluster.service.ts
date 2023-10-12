import { Injectable } from '@nestjs/common';
import cluster from 'cluster';

import * as process from 'node:process';

const numCPUs = parseInt(process.argv[2] || '1');

@Injectable()
export class ClusterService {
  static clusterize(callback: () => void): void {
    if (cluster.isPrimary) {
      console.log(`MASTER SERVER (${process.pid}) IS RUNNING ${numCPUs} WORKERS}`);

      for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
      }

      cluster.on('exit', (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died`);
      });
    } else {
      callback();
    }
  }
}

// in main.ts
// ClusterService.clusterize(bootstrap);
