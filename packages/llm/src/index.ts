import { z } from 'zod';
import OpenAI from 'openai';
import { PatchPlanProposalSchema, TicketSuggestionSchema } from '@ninjas/types';

export type Provider = 'openai' | 'mock';

export interface LLMConfig {
  provider: Provider;
  apiKey?: string;
}

export interface ToolInterfaces {
  search_alerts: (query: string) => Promise<any[]>;
  propose_patch_plan: (clientId: string, products: string[]) => Promise<z.infer<typeof PatchPlanProposalSchema>>;
  suggest_ticket_reply: (ticketId: string) => Promise<z.infer<typeof TicketSuggestionSchema>>;
}

export class MockLLM implements ToolInterfaces {
  async search_alerts(query: string) {
    return [{ id: 'a1', score: 0.9, query }];
  }
  async propose_patch_plan(clientId: string, products: string[]) {
    return PatchPlanProposalSchema.parse({
      steps: [`backup:${clientId}`, `apply:${products.join(',')}`, 'reboot', 'verify'],
      rollback: ['restore:backup'],
      risks: ['service interruption', 'rollback required']
    });
  }
  async suggest_ticket_reply(ticketId: string) {
    return TicketSuggestionSchema.parse({
      resolutionHypothesis: `Restart service for ticket ${ticketId}`,
      stepByStep: ['check logs', 'restart service', 'verify health'],
      replyText: `We identified a transient issue; we restarted the service and monitoring stability.`,
      confidence: 0.72
    });
  }
}

export class OpenAIAdapter implements ToolInterfaces {
  private client: OpenAI;
  constructor(apiKey: string) { this.client = new OpenAI({ apiKey }); }
  // For MVP, stub tools; extend later
  async search_alerts(query: string) { return [{ id: 'oa1', score: 0.88, query }]; }
  async propose_patch_plan(clientId: string, products: string[]) {
    return PatchPlanProposalSchema.parse({ steps: [`backup:${clientId}`, `apply:${products[0]}`], rollback: ['restore'], risks: ['low'] });
  }
  async suggest_ticket_reply(ticketId: string) {
    return TicketSuggestionSchema.parse({ resolutionHypothesis: `Hypothesis ${ticketId}`, stepByStep: ['step1','step2'], replyText: 'Reply', confidence: 0.65 });
  }
}

export class CoreNin {
  constructor(private tools: ToolInterfaces) {}
  async runTask(type: 'triage-alerts' | 'patch-plan' | 'ticket-suggest' | 'insights', payload: any) {
    if (type === 'ticket-suggest') {
      return this.tools.suggest_ticket_reply(payload.ticketId);
    }
    if (type === 'patch-plan') {
      return this.tools.propose_patch_plan(payload.clientId, payload.products);
    }
    if (type === 'triage-alerts') {
      return this.tools.search_alerts(payload.query ?? '');
    }
    return { ok: true };
  }
}

export function createLLM(config: LLMConfig): ToolInterfaces {
  if (config.provider === 'openai' && config.apiKey) return new OpenAIAdapter(config.apiKey);
  return new MockLLM();
}

