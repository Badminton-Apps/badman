import { Injectable } from '@nestjs/common';
import cluster from 'cluster';

import * as process from 'node:process';

const numCPUs = parseInt(process.argv[2] || '1');

@Injectable()
export class ClusterService {
  static clusterize(callback: () => void, cpus: number = numCPUs): void {
    if (cluster.isPrimary) {
      console.log(`MASTER SERVER (${process.pid}) IS RUNNING ${cpus} WORKERS`);

      for (let i = 0; i < cpus; i++) {
        cluster.fork();
      }

      cluster.on('exit', (worker) => {
        console.log(`worker ${worker.process.pid} died`);
      });
    } else {
      callback();
    }
  }
}

// in main.ts
// ClusterService.clusterize(bootstrap);
