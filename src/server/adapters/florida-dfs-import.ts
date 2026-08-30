import { parse } from "csv-parse/sync";
import type { AdapterQuery, AdapterResult, SourceAdapter } from "./types";

export const floridaDfsImportAdapter: SourceAdapter = {
  id: "florida-dfs-import",
  displayName: "Florida DFS Bureau of Unclaimed Property (file import)",
  jurisdiction: "FL",
  capabilities: ["property_import"],
  implemented: true,
  legalNotes:
    "Ingests only records the organization is already legally permitted to hold (operator-supplied CSV/JSON). Does not access UPMIS, solve CAPTCHAs, or scrape fltreasurehunt.gov.",
  async search(query: AdapterQuery): Promise<AdapterResult> {
    if (!query.raw) {
      return {
        adapterId: this.id,
        hits: [],
        notes: ["No file payload supplied. Use the import endpoint with a CSV export you are authorized to process."],
      };
    }
    const rows = parse(query.raw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];
    return {
      adapterId: this.id,
      hits: rows.map((raw) => ({
        title: raw.owner_name || raw.ownerName || raw.OWNER_NAME || "Imported property",
        raw,
        url: raw.source_url || raw.sourceUrl,
        retrievedAt: new Date(),
        kind: "FACT" as const,
        interpretation: "Operator-imported Florida unclaimed-property record. A match is not proof of entitlement.",
      })),
      notes: [`Parsed ${rows.length} row(s).`],
    };
  },
};

export function mapDfsRow(raw: Record<string, string>) {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const hit = Object.entries(raw).find(([rk]) => rk.toLowerCase().replace(/[\s-]/g, "_") === k);
      if (hit?.[1]) return hit[1];
    }
    return "";
  };
  return {
    accountNumber: get("account_number", "account", "property_id"),
    ownerName: get("owner_name", "owner", "reported_owner"),
    coOwnerName: get("co_owner_name", "coowner", "co_owner") || null,
    address: get("address", "reported_address", "street") || null,
    city: get("city") || null,
    state: get("state") || "FL",
    zip: get("zip", "zip_code") || null,
    holder: get("holder", "holder_name", "company") || null,
    category: get("property_type", "category", "property_category") || null,
    description: get("description", "property_description") || null,
    reportingYear: Number(get("reporting_year", "year")) || null,
    sourceUrl: get("source_url") || null,
    externalRecordId: get("record_id", "source_record_id") || null,
    estimatedValueCents: dollarsToCents(get("amount", "value", "estimated_value")),
  };
}

function dollarsToCents(value: string) {
  if (!value) return null;
  const n = Number(value.replace(/[$,]/g, ""));
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100);
}
