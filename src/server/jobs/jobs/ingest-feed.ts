import { createHash } from "crypto";
import type { JobDefinition } from "../types";
import { prisma } from "@/lib/db";
import { decryptPii } from "@/lib/crypto";
import { importDfsCsv } from "@/server/services/property-discovery";

export const ingestFeedJob: JobDefinition = {
  id: "ingest-feed",
  name: "Authorized feed fetch",
  description:
    "Pulls operator-configured extract URLs the organization is legally permitted to access. Skips unchanged files by content hash. Never targets CAPTCHA-protected or credentialed public search pages.",
  everySeconds: 900,
  requires: ["feedEnabled"],
  async run(ctx) {
    const feeds = await prisma.ingestFeed.findMany({
      where: { organizationId: ctx.organizationId, enabled: true },
    });
    if (!feeds.length) {
      return {
        processed: 0,
        created: 0,
        detail: "No enabled feeds. Add an authorized extract URL on the Automation page.",
        skipped: true,
      };
    }

    let created = 0;
    const notes: string[] = [];

    for (const feed of feeds) {
      try {
        const headers: Record<string, string> = { Accept: "text/csv" };
        if (feed.authHeaderEnc) {
          const raw = decryptPii(feed.authHeaderEnc);
          const idx = raw.indexOf(":");
          if (idx > 0) headers[raw.slice(0, idx).trim()] = raw.slice(idx + 1).trim();
        }
        const res = await fetch(feed.url, { headers });
        if (!res.ok) {
          notes.push(`${feed.name}: HTTP ${res.status}`);
          continue;
        }
        const csv = await res.text();
        const hash = createHash("sha256").update(csv).digest("hex");
        if (hash === feed.lastHash) {
          notes.push(`${feed.name}: unchanged`);
          await prisma.ingestFeed.update({
            where: { id: feed.id },
            data: { lastFetchedAt: new Date() },
          });
          continue;
        }
        const result = await importDfsCsv({
          organizationId: ctx.organizationId,
          csv,
          actorUserId: ctx.actorUserId,
        });
        created += result.created;
        notes.push(`${feed.name}: ${result.created} new`);
        await prisma.ingestFeed.update({
          where: { id: feed.id },
          data: { lastFetchedAt: new Date(), lastHash: hash },
        });
      } catch (err) {
        notes.push(`${feed.name}: ${(err as Error).message}`);
      }
    }

    return { processed: feeds.length, created, detail: notes.join("; ") };
  },
};
