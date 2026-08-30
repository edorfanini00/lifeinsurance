import type { SourceAdapter } from "./types";
import { emptyResult } from "./types";

function stub(
  id: string,
  displayName: string,
  requiredProvider: string,
  capabilities: SourceAdapter["capabilities"],
  legalNotes: string,
): SourceAdapter {
  return {
    id,
    displayName,
    requiredProvider,
    capabilities,
    legalNotes,
    implemented: false,
    async search() {
      return emptyResult(
        id,
        `Adapter "${id}" is an interface only. Configure ${requiredProvider} after contractual/legal approval. No unofficial endpoint is assumed.`,
      );
    },
  };
}

export const stubAdapters: SourceAdapter[] = [
  stub(
    "florida-dfs-live",
    "Florida DFS / UPMIS live access",
    "Official DFS UPMIS credentials or published API the organization actually possesses",
    ["property_search"],
    "Do not scrape fltreasurehunt.gov or bypass CAPTCHA/authentication.",
  ),
  stub(
    "county-probate",
    "County probate / clerk records",
    "County clerk portal feed or manual certified import",
    ["probate"],
    "Access rules vary by county. No generic scrape.",
  ),
  stub(
    "obituary-provider",
    "Licensed obituary / death-notice API",
    "Contracted news/obituary data vendor",
    ["obituary"],
    "Use only licensed feeds. No breach datasets.",
  ),
  stub(
    "people-data-provider",
    "Permitted people-data provider",
    "Contracted compliant enrichment vendor",
    ["people_enrichment"],
    "Never purchase hacked, leaked, or DNC-prohibited data.",
  ),
  stub(
    "public-web-search",
    "Approved web search API",
    "Search API under an acceptable-use agreement",
    ["web_search"],
    "Rate limits and robots/ToS of the chosen provider apply.",
  ),
  stub(
    "naic-policy-locator",
    "NAIC Life Insurance Policy Locator",
    "Human-authorized NAIC process after claimant supplies required data",
    ["property_search"],
    "Never scrape, impersonate a claimant, or auto-submit. Lost-policy cases only.",
  ),
];
