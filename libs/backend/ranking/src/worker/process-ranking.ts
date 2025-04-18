import { NestFactory } from '@nestjs/core';
import { isMainThread, workerData } from 'worker_threads';
import { RankingModule } from '../ranking.module';
import { UpdateRankingService } from '../services';

async function run() {
  if (isMainThread) {
    throw new Error('This script should be run as a worker thread');
  }
  const app = await NestFactory.createApplicationContext(RankingModule);
  const updateRankingService = app.get(UpdateRankingService);

  const {
    updateCompStatus,
    updateRanking,
    updatePossible,
    updateClubs,
    rankingDate,
    removeAllRanking,
    rankingSystemId,
    createNewPlayers,
    mappedData,
  } = JSON.parse(workerData);

  await updateRankingService.processFileUpload(mappedData, {
    updateCompStatus,
    updateRanking,
    updatePossible,
    updateClubs,
    rankingDate,
    removeAllRanking,
    rankingSystemId,
    createNewPlayers,
  });
}

run();
