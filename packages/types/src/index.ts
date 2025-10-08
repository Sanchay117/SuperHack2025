import { z } from 'zod';

export const AlertSeverity = z.enum(['LOW','MED','HIGH','CRITICAL']);
export const AlertStatus = z.enum(['NEW','NOISE','ACK','RESOLVED']);
export const ApprovalStatus = z.enum(['PENDING','APPROVED','REJECTED']);
export const PatchRunStatus = z.enum(['PENDING','RUNNING','SUCCESS','FAILED','ROLLED_BACK']);

export const AlertSchema = z.object({
  id: z.string().optional(),
  clientId: z.string(),
  source: z.string(),
  externalId: z.string(),
  severity: AlertSeverity,
  status: AlertStatus.default('NEW'),
  fingerprint: z.string(),
  payload: z.any(),
  clusterId: z.string().optional()
});

export const AlertIngestSchema = z.object({ alerts: z.array(AlertSchema.omit({ id: true })) });

export const TicketSuggestionSchema = z.object({
  resolutionHypothesis: z.string(),
  stepByStep: z.array(z.string()),
  replyText: z.string(),
  confidence: z.number().min(0).max(1)
});

export const PatchPlanProposalSchema = z.object({
  steps: z.array(z.string()),
  rollback: z.array(z.string()),
  risks: z.array(z.string())
});

export type AlertSeverityT = z.infer<typeof AlertSeverity>;
export type AlertStatusT = z.infer<typeof AlertStatus>;
export type TicketSuggestion = z.infer<typeof TicketSuggestionSchema>;
export type PatchPlanProposal = z.infer<typeof PatchPlanProposalSchema>;

