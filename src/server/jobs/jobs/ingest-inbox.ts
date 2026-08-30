import { mkdir, readdir, readFile, rename } from "fs/promises";
import { join } from "path";
import type { JobDefinition } from "../types";
import { importDfsCsv } from "@/server/services/property-discovery";

export const INBOX_DIR = join(process.cwd(), "data", "inbox");
export const PROCESSED_DIR = join(process.cwd(), "data", "processed");

export const ingestInboxJob: JobDefinition = {
  id: "ingest-inbox",
  name: "Watched inbox import",
  description:
    "Imports any authorized CSV extract dropped into data/inbox, then archives the file to data/processed with a timestamp.",
  everySeconds: 30,
  requires: ["inboxEnabled"],
  async run(ctx) {
    if (process.env.VERCEL) {
      return {
        processed: 0,
        created: 0,
        detail:
          "Serverless filesystem is read-only and ephemeral. Use POST /api/ingest/webhook or an authorized feed instead of the drop folder.",
        skipped: true,
      };
    }
    await mkdir(INBOX_DIR, { recursive: true });
    await mkdir(PROCESSED_DIR, { recursive: true });

    const files = (await readdir(INBOX_DIR)).filter((f) => f.toLowerCase().endsWith(".csv"));
    if (!files.length) {
      return { processed: 0, created: 0, detail: "Inbox empty.", skipped: true };
    }

    let created = 0;
    const notes: string[] = [];
    for (const file of files) {
      const csv = await readFile(join(INBOX_DIR, file), "utf8");
      const result = await importDfsCsv({
        organizationId: ctx.organizationId,
        csv,
        actorUserId: ctx.actorUserId,
      });
      created += result.created;
      notes.push(`${file}: ${result.created} new`);
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      await rename(join(INBOX_DIR, file), join(PROCESSED_DIR, `${stamp}__${file}`));
    }

    return { processed: files.length, created, detail: notes.join("; ") };
  },
};
