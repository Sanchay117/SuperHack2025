import { PrismaClient, Role, AlertSeverity, AlertStatus, ApprovalStatus, PatchRunStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: 'seed-org' },
    update: {},
    create: { id: 'seed-org', name: 'Ninja MSP' }
  });

  const users = await Promise.all(
    Array.from({ length: 5 }).map((_, i) =>
      prisma.user.create({ data: { name: `Tech ${i+1}`, email: `tech${i+1}@ninja.local`, role: Role.TECHNICIAN } })
    )
  );

  await Promise.all(users.map(u => prisma.organizationMember.create({ data: { orgId: org.id, userId: u.id, role: u.role } })));

  const clients = await Promise.all(
    ['Konoha Ltd', 'Iga Corp', 'Koga LLC'].map(name => prisma.client.create({ data: { name, orgId: org.id } }))
  );

  const severities: AlertSeverity[] = ['LOW','MED','HIGH','CRITICAL'];
  const statuses: AlertStatus[] = ['NEW','NOISE','ACK','RESOLVED'];
  const alertsData = Array.from({ length: 120 }).map((_, i) => ({
    clientId: clients[i % clients.length].id,
    source: 'DatadogLike',
    externalId: `ext-${i%30}`, // duplicates
    severity: severities[i % severities.length],
    status: statuses[i % statuses.length],
    fingerprint: `fp-${i%20}`,
    payload: { message: `Alert ${i}`, details: { code: 100 + (i%5) } }
  }));
  await prisma.alert.createMany({ data: alertsData, skipDuplicates: true });

  const ticketsData = Array.from({ length: 30 }).map((_, i) => ({
    clientId: clients[i % clients.length].id,
    source: 'JiraLike',
    externalId: `T-${i}`,
    status: i % 3 === 0 ? 'OPEN' : 'IN_PROGRESS',
    summary: `Service issue ${i}`,
    description: `Stack trace line ${(i%5)+1}: Error at module ${i%7}`
  }));
  await prisma.ticket.createMany({ data: ticketsData, skipDuplicates: true });

  const cves = (i: number) => [`CVE-2024-${1000+i}`, `CVE-2024-${2000+i}`];
  const patchesData = Array.from({ length: 40 }).map((_, i) => ({
    clientId: clients[i % clients.length].id,
    vendor: 'Microsoft',
    product: `WinServer ${(2016 + (i%3))}`,
    version: `KB${500000 + i}`,
    cveIds: cves(i),
    kbIds: [`KB${600000+i}`],
    riskScore: Math.round(((i%10)+1) * 7.5) / 10
  }));
  await prisma.patch.createMany({ data: patchesData });

  const plan = await prisma.patchPlan.create({ data: {
    clientId: clients[0].id,
    targetGroup: 'core-servers',
    dryRun: true,
    createdBy: users[0].id,
    plan: { steps: ['backup', 'apply KB500001', 'reboot', 'verify'], rollback: ['restore backup'] },
    approvalStatus: ApprovalStatus.PENDING
  }});

  await prisma.patchRun.create({ data: {
    planId: plan.id,
    status: PatchRunStatus.PENDING
  }});

  await prisma.insightSnapshot.createMany({ data: [
    { orgId: org.id, at: new Date(Date.now()-86400000), metrics: { profitability: 0.22, utilization: 0.64, mttrHours: 5.2, sla: 0.97 } },
    { orgId: org.id, at: new Date(), metrics: { profitability: 0.24, utilization: 0.66, mttrHours: 4.8, sla: 0.98 } }
  ]});

  await prisma.featureFlag.createMany({ data: [
    { key: 'patch.auto', enabled: false, audience: {} }
  ], skipDuplicates: true });

  console.log('Seed complete');
}

main().finally(() => prisma.$disconnect());

