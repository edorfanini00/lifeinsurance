import type { FindingKind } from "@prisma/client";

export type SourceCapability =
  | "property_search"
  | "property_import"
  | "obituary"
  | "probate"
  | "people_enrichment"
  | "web_search"
  | "manual";

export type AdapterQuery = {
  name?: string;
  city?: string;
  state?: string;
  county?: string;
  year?: number;
  raw?: string;
};

export type AdapterHit = {
  title: string;
  raw: Record<string, string>;
  url?: string;
  retrievedAt: Date;
  kind: FindingKind;
  interpretation?: string;
};

export type AdapterResult = {
  adapterId: string;
  hits: AdapterHit[];
  notes: string[];
};

export type AdapterContext = {
  organizationId: string;
  actorUserId?: string;
};

export interface SourceAdapter {
  id: string;
  displayName: string;
  jurisdiction?: string;
  capabilities: SourceCapability[];
  legalNotes: string;
  requiredProvider?: string;
  implemented: boolean;
  search(query: AdapterQuery, ctx: AdapterContext): Promise<AdapterResult>;
}

export function emptyResult(adapterId: string, note: string): AdapterResult {
  return { adapterId, hits: [], notes: [note] };
}
