import { Queue, Worker, QueueEvents, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { io } from './index';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
const prisma = new PrismaClient();

export const alertTriageQueue = new Queue('alert-triage', { connection });
export const patchExecQueue = new Queue('patch-exec', { connection });
export const insightsQueue = new Queue('insights', { connection });

new Worker('alert-triage', async () => {
  const byFp = await prisma.alert.groupBy({ by: ['fingerprint'], _count: true });
  for (const g of byFp) {
    const sample = await prisma.alert.findFirst({ where: { fingerprint: g.fingerprint } });
    if (!sample) continue;
    const topSeverity = sample.severity;
    const cluster = await prisma.alertCluster.upsert({ where: { hash: g.fingerprint }, update: { size: g._count, topSeverity, representativeAlertId: sample.id }, create: { hash: g.fingerprint, size: g._count, topSeverity, representativeAlertId: sample.id } });
    await prisma.alert.updateMany({ where: { fingerprint: g.fingerprint }, data: { clusterId: cluster.id } });
  }
  io.emit('alert_clustered', { ok: true });
}, { connection });

new Worker('patch-exec', async (job) => {
  const { planId } = job.data as { planId: string };
  io.emit('patch_run_update', { id: planId, message: 'Executing plan...' });
}, { connection });

new Worker('insights', async () => {
  // recompute placeholder
}, { connection });

export async function enqueue(queue: Queue, name: string, data: any, opts?: JobsOptions) {
  return queue.add(name, data, opts);
}

