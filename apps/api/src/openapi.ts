import { OpenAPIRegistry, OpenApiGeneratorV3 } from 'zod-to-openapi';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AlertIngestSchema, TicketSuggestionSchema, PatchPlanProposalSchema } from '@ninjas/types';

const registry = new OpenAPIRegistry();

registry.registerPath({
  method: 'post',
  path: '/v1/alerts/ingest',
  request: { body: { content: { 'application/json': { schema: AlertIngestSchema } } } },
  responses: { 200: { description: 'ingested', content: { 'application/json': { schema: { type: 'object' } } } } }
});

registry.registerPath({ method: 'get', path: '/v1/alerts', responses: { 200: { description: 'alerts' } } });
registry.registerPath({ method: 'post', path: '/v1/alerts/{id}/ack', responses: { 200: { description: 'ack' } } });
registry.registerPath({ method: 'post', path: '/v1/alerts/cluster', responses: { 200: { description: 'clustered' } } });

registry.registerPath({ method: 'get', path: '/v1/tickets', responses: { 200: { description: 'tickets' } } });
registry.registerPath({ method: 'post', path: '/v1/tickets/{id}/suggest', responses: { 200: { description: 'suggest', content: { 'application/json': { schema: TicketSuggestionSchema } } } } });
registry.registerPath({ method: 'post', path: '/v1/tickets/{id}/apply', request: { body: { content: { 'application/json': { schema: TicketSuggestionSchema } } } }, responses: { 200: { description: 'applied' } } });

registry.registerPath({ method: 'get', path: '/v1/patches', responses: { 200: { description: 'patches' } } });
registry.registerPath({ method: 'post', path: '/v1/patch-plans', responses: { 200: { description: 'plan', content: { 'application/json': { schema: { type: 'object' } } } } } });
registry.registerPath({ method: 'post', path: '/v1/patch-runs', responses: { 200: { description: 'run' } } });
registry.registerPath({ method: 'post', path: '/v1/patch-runs/{id}/rollback', responses: { 200: { description: 'rollback' } } });

registry.registerPath({ method: 'get', path: '/v1/insights/summary', responses: { 200: { description: 'summary' } } });
registry.registerPath({ method: 'post', path: '/v1/insights/recompute', responses: { 200: { description: 'queued' } } });

registry.registerPath({ method: 'post', path: '/v1/agents/triage-alerts', responses: { 200: { description: 'ok' } } });
registry.registerPath({ method: 'post', path: '/v1/agents/daily-maintenance', responses: { 200: { description: 'ok' } } });

registry.registerPath({ method: 'get', path: '/v1/flags', responses: { 200: { description: 'flags' } } });

const generator = new OpenApiGeneratorV3(registry.definitions);
const doc = generator.generateDocument({ openapi: '3.0.3', info: { title: 'The Ninjas API', version: '0.1.0' }, servers: [{ url: 'http://localhost:4000' }] });

const out = join(process.cwd(), 'openapi.json');
writeFileSync(out, JSON.stringify(doc, null, 2));
console.log('OpenAPI written to', out);

