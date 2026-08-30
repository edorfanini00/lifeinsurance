import type { AdapterQuery, AdapterResult, SourceAdapter } from "./types";
import { emptyResult } from "./types";

export const fixturePublicRecordsAdapter: SourceAdapter = {
  id: "fixture-public-records",
  displayName: "Approved public-record fixtures (demo / tests)",
  jurisdiction: "FL",
  capabilities: ["obituary", "probate", "people_enrichment"],
  implemented: true,
  legalNotes:
    "Returns only versioned fixtures bundled with the application so the research agent can be exercised without scraping. Replace with a licensed provider in production.",
  async search(query: AdapterQuery): Promise<AdapterResult> {
    const name = normalize(query.name);
    if (!name) return emptyResult(this.id, "No name supplied.");
    // Full-name match only. A shared first name is never enough to attach a
    // death, a relative, or a contact to a person.
    const hits = FIXTURES.filter((f) => f.names.some((n) => normalize(n) === name));
    if (!hits.length) {
      return emptyResult(this.id, "No fixture matched. Connect a licensed obituary/probate provider for live research.");
    }
    return {
      adapterId: this.id,
      hits: hits.map((f) => ({
        title: f.title,
        raw: f.raw,
        url: f.url,
        retrievedAt: new Date("2026-03-12T14:00:00Z"),
        kind: "FACT",
        interpretation: f.interpretation,
      })),
      notes: ["Fixture source — not a live public-web scrape."],
    };
  },
};

function normalize(value?: string) {
  return (value || "")
    .toUpperCase()
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type Fixture = {
  names: string[];
  title: string;
  url: string;
  interpretation: string;
  raw: Record<string, string>;
};

const FIXTURES: Fixture[] = [
  {
    names: ["JOHN A SMITH"],
    title: "Obituary — John A. Smith, Tampa",
    url: "https://example.invalid/obituaries/john-a-smith-tampa-2019",
    interpretation: "Published obituary identifying spouse and children. Does not establish legal entitlement to any property.",
    raw: {
      decedent: "John A. Smith",
      city: "Tampa",
      state: "FL",
      died: "2019-06-04",
      spouse: "Susan Smith (predeceased)",
      children: "Michael Smith; Jessica Brown",
      published: "Tampa Bay area notice, 2019",
    },
  },
  {
    names: ["JOHN A SMITH"],
    title: "Hillsborough probate docket 2019-CP-004812",
    url: "https://example.invalid/hillsborough/probate/2019-CP-004812",
    interpretation: "Public docket lists Michael Smith as personal representative. Court role ≠ insurance beneficiary.",
    raw: {
      county: "Hillsborough",
      caseNumber: "2019-CP-004812",
      decedent: "John A. Smith",
      personalRepresentative: "Michael Smith",
      status: "Closed",
    },
  },
  {
    names: ["MICHAEL SMITH"],
    title: "Professional listing — Michael Smith, Orlando",
    url: "https://example.invalid/directory/michael-smith-orlando",
    interpretation: "Public professional listing used only for contactability research.",
    raw: {
      name: "Michael Smith",
      city: "Orlando",
      state: "FL",
      phone: "(407) 555-0148",
      email: "michael.smith@example.com",
    },
  },
];
