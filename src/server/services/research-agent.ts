import { prisma } from "@/lib/db";
import { getAdapter } from "@/server/adapters/registry";
import { writeAudit } from "@/server/audit";
import type { FindingKind } from "@prisma/client";

const PROMPT_VERSION = "research-agent-v1";

export async function runResearchAgent(input: {
  objective: string;
  caseId?: string;
  organizationId: string;
  actorUserId?: string;
  name?: string;
  city?: string;
  state?: string;
}) {
  const started = await prisma.aiResearchRun.create({
    data: {
      caseId: input.caseId,
      objective: input.objective,
      model: process.env.OPENAI_API_KEY ? "openai" : process.env.ANTHROPIC_API_KEY ? "anthropic" : "heuristic",
      promptVersion: PROMPT_VERSION,
      status: "RUNNING",
    },
  });

  const queries = buildQueries(input);
  const findings: { kind: FindingKind; statement: string; confidence: number }[] = [];
  const notes: string[] = [];

  for (const q of queries) {
    const adapter = getAdapter(q.adapterId);
    const result = await adapter.search(q.query, { organizationId: input.organizationId, actorUserId: input.actorUserId });
    notes.push(...result.notes);
    for (const hit of result.hits) {
      const source = await ensureSource(input.organizationId, adapter.id, adapter.displayName, adapter.legalNotes);
      const evidence = await prisma.sourceEvidence.create({
        data: {
          sourceId: source.id,
          field: hit.title,
          rawValue: JSON.stringify(hit.raw),
          normalizedValue: hit.raw.decedent || hit.raw.name || null,
          url: hit.url,
          retrievedAt: hit.retrievedAt,
          interpretation: hit.interpretation,
          findingKind: hit.kind,
        },
      });
      const finding = await prisma.aiFinding.create({
        data: {
          runId: started.id,
          kind: hit.kind,
          statement: hit.interpretation || hit.title,
          confidence: hit.kind === "FACT" ? 88 : 55,
          evidence: { connect: { id: evidence.id } },
        },
      });
      findings.push({
        kind: finding.kind,
        statement: finding.statement,
        confidence: finding.confidence,
      });
    }
  }

  const facts = findings.filter((f) => f.kind === "FACT");
  const confidence = facts.length ? Math.min(96, 60 + facts.length * 8) : 20;
  const summary = summarize(input.objective, findings, notes);

  const completed = await prisma.aiResearchRun.update({
    where: { id: started.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      confidence,
      stopReason: facts.length ? "Confidence threshold or fixture coverage reached" : "No approved live sources configured",
      resultSummary: summary,
    },
    include: { findings: { include: { evidence: { include: { source: true } } } } },
  });

  await writeAudit({
    userId: input.actorUserId,
    action: "RESEARCH_RUN",
    entityType: "AiResearchRun",
    entityId: completed.id,
    metadata: { objective: input.objective, model: completed.model, promptVersion: PROMPT_VERSION, confidence },
  });

  return completed;
}

function buildQueries(input: { name?: string; city?: string; state?: string; objective: string }) {
  const name = input.name || extractName(input.objective);
  return [
    {
      adapterId: "fixture-public-records",
      query: { name, city: input.city, state: input.state || "FL" },
    },
    {
      adapterId: "obituary-provider",
      query: { name, city: input.city, state: input.state || "FL" },
    },
    {
      adapterId: "county-probate",
      query: { name, city: input.city, state: input.state || "FL" },
    },
    {
      adapterId: "public-web-search",
      query: { name, raw: input.objective },
    },
  ];
}

function extractName(objective: string) {
  const m = objective.match(/whether\s+([^,]+),/i) || objective.match(/([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)/);
  return m?.[1]?.trim();
}

function summarize(
  objective: string,
  findings: { kind: FindingKind; statement: string }[],
  notes: string[],
) {
  const facts = findings.filter((f) => f.kind === "FACT").map((f) => `FACT: ${f.statement}`);
  const rest = findings.filter((f) => f.kind !== "FACT").map((f) => `${f.kind}: ${f.statement}`);
  return [
    `Objective: ${objective}`,
    facts.length ? facts.join("\n") : "FACT: none established from approved sources.",
    rest.join("\n"),
    notes.filter(Boolean).slice(0, 6).map((n) => `NOTE: ${n}`).join("\n"),
    "A property or name match is not a determination of legal entitlement.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function ensureSource(organizationId: string, adapterId: string, name: string, legalNotes: string) {
  const existing = await prisma.source.findFirst({ where: { organizationId, adapterId } });
  if (existing) return existing;
  return prisma.source.create({
    data: { organizationId, adapterId, name, legalNotes, jurisdiction: "FL" },
  });
}
