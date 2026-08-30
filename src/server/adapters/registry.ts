import { floridaDfsImportAdapter } from "./florida-dfs-import";
import { fixturePublicRecordsAdapter } from "./fixture-public-records";
import { stubAdapters } from "./stubs";
import type { SourceAdapter } from "./types";

export const adapters: SourceAdapter[] = [
  floridaDfsImportAdapter,
  fixturePublicRecordsAdapter,
  {
    id: "manual-entry",
    displayName: "Manual staff entry",
    capabilities: ["manual"],
    implemented: true,
    legalNotes: "Staff must record the originating public source for every manually entered field.",
    async search() {
      return { adapterId: "manual-entry", hits: [], notes: ["Use the staff form; this adapter does not search."] };
    },
  },
  ...stubAdapters,
];

export function getAdapter(id: string) {
  const found = adapters.find((a) => a.id === id);
  if (!found) throw new Error(`Unknown adapter: ${id}`);
  return found;
}
