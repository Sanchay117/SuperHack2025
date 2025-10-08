import { Router } from 'express';
import { z } from 'zod';
import { AlertIngestSchema, TicketSuggestionSchema, PatchPlanProposalSchema } from '@ninjas/types';
import { PrismaClient, ApprovalStatus, PatchRunStatus } from '@prisma/client';
import { io } from './index';
import { createLLM, CoreNin } from '@ninjas/llm';
import { enqueue, alertTriageQueue, patchExecQueue } from './queues';
import { requireRole } from './middleware/auth';
import { rateLimit } from './middleware/rateLimit';

const prisma = new PrismaClient();
const router = Router();

const llm = createLLM({ provider: (process.env.LLM_PROVIDER as any) || 'mock', apiKey: process.env.OPENAI_API_KEY });
const core = new CoreNin(llm);

// Alerts
router.post('/alerts/ingest', requireRole('technician'), rateLimit({ max: 100 }), async (req, res) => {
  const parsed = AlertIngestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());
  const alerts = parsed.data.alerts;
  for (const a of alerts) {
    await prisma.alert.upsert({
      where: { source_externalId: { source: a.source, externalId: a.externalId } },
      update: { severity: a.severity, status: a.status, fingerprint: a.fingerprint, payload: a.payload, clientId: a.clientId },
      create: a
    });
  }
  res.json({ upserted: alerts.length });
});

router.get('/alerts', async (req, res) => {
  const { status, severity, clientId } = req.query as any;
  const alerts = await prisma.alert.findMany({ where: { status: status as any, severity: severity as any, clientId: clientId as string | undefined } });
  res.json(alerts);
});

router.post('/alerts/:id/ack', requireRole('technician'), rateLimit({ max: 60 }), async (req, res) => {
  const { id } = req.params;
  const a = await prisma.alert.update({ where: { id }, data: { status: 'ACK' } });
  res.json(a);
});

router.post('/alerts/cluster', requireRole('technician'), rateLimit({ max: 20 }), async (_req, res) => {
  await enqueue(alertTriageQueue, 'cluster', {});
  res.json({ ok: true, queued: true });
});

// Tickets
router.get('/tickets', async (_req, res) => {
  const t = await prisma.ticket.findMany();
  res.json(t);
});

router.post('/tickets/:id/suggest', requireRole('technician'), rateLimit({ max: 30 }), async (req, res) => {
  const { id } = req.params;
  const suggestion = await core.runTask('ticket-suggest', { ticketId: id });
  const parsed = TicketSuggestionSchema.parse(suggestion);
  io.emit('ticket_suggestion_ready', { ticketId: id, suggestion: parsed });
  res.json(parsed);
});

router.post('/tickets/:id/apply', requireRole('technician'), rateLimit({ max: 30 }), async (req, res) => {
  const { id } = req.params;
  const suggestion = TicketSuggestionSchema.parse(req.body);
  await prisma.ticket.update({ where: { id }, data: { suggestedActions: suggestion } });
  await prisma.actionLog.create({ data: {
    actorType: 'AGENT', actorId: 'TechNin', actionType: 'TICKET_APPLY_SUGGESTION', resourceType: 'Ticket', resourceId: id, before: {}, after: suggestion
  }});
  res.json({ ok: true });
});

// Patches
router.get('/patches', async (req, res) => {
  const { clientId, product } = req.query as any;
  const patches = await prisma.patch.findMany({ where: { clientId: clientId as string | undefined, product: product as string | undefined } });
  res.json(patches);
});

router.post('/patch-plans', requireRole('technician'), rateLimit({ max: 20 }), async (req, res) => {
  const schema = z.object({ clientId: z.string(), products: z.array(z.string()), createdBy: z.string().optional() });
  const parsed = schema.parse(req.body);
  const proposal = PatchPlanProposalSchema.parse(await core.runTask('patch-plan', parsed));
  const plan = await prisma.patchPlan.create({ data: {
    clientId: parsed.clientId,
    targetGroup: 'default',
    dryRun: true,
    createdBy: parsed.createdBy ?? 'CoreNin',
    plan: proposal,
    approvalStatus: ApprovalStatus.PENDING
  }});
  res.json(plan);
});

router.post('/patch-runs', requireRole('technician'), rateLimit({ max: 50 }), async (req, res) => {
  const schema = z.object({ planId: z.string() });
  const { planId } = schema.parse(req.body);
  const plan = await prisma.patchPlan.findUniqueOrThrow({ where: { id: planId } });
  const auto = process.env.FEATURE_PATCH_AUTO === 'true';
  if (!auto && plan.approvalStatus !== ApprovalStatus.APPROVED) return res.status(403).json({ error: 'Plan not approved' });
  const run = await prisma.patchRun.create({ data: { planId, status: PatchRunStatus.RUNNING, startedAt: new Date() } });
  await enqueue(patchExecQueue, 'execute', { planId });
  res.json(run);
});

router.post('/patch-runs/:id/rollback', requireRole('technician'), rateLimit({ max: 20 }), async (req, res) => {
  const { id } = req.params;
  await prisma.patchRun.update({ where: { id }, data: { status: PatchRunStatus.ROLLED_BACK, finishedAt: new Date() } });
  io.emit('patch_run_update', { id, message: 'Rollback completed' });
  res.json({ ok: true });
});

// Insights
router.get('/insights/summary', async (_req, res) => {
  const latest = await prisma.insightSnapshot.findFirst({ orderBy: { at: 'desc' } });
  res.json(latest?.metrics ?? { profitability: 0, utilization: 0, mttrHours: 0, sla: 0 });
});

router.post('/insights/recompute', requireRole('admin'), rateLimit({ max: 10 }), async (_req, res) => {
  // Simulate recompute
  res.json({ ok: true });
});

// Agents (CoreNin orchestration)
router.post('/agents/triage-alerts', requireRole('technician'), rateLimit({ max: 10 }), async (_req, res) => {
  await prisma.actionLog.create({ data: { actorType: 'AGENT', actorId: 'AlertNin', actionType: 'TRIAGE', resourceType: 'Alert', resourceId: '*', before: {}, after: {} } });
  const r = await core.runTask('triage-alerts', { query: 'error rate spike' });
  res.json({ ok: true, result: r });
});

router.post('/agents/daily-maintenance', requireRole('admin'), rateLimit({ max: 5 }), async (_req, res) => {
  await prisma.actionLog.create({ data: { actorType: 'AGENT', actorId: 'CoreNin', actionType: 'DAILY_MAINT', resourceType: 'Org', resourceId: '*', before: {}, after: {} } });
  res.json({ ok: true });
});

// Feature flags
router.get('/flags', async (_req, res) => {
  const flags = await prisma.featureFlag.findMany();
  res.json(flags);
});

export default router;

