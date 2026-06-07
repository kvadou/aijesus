import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { makeClient } from "@/corpus/store";
import { ingest } from "@/corpus/ingest";
import { BibleApiAdapter } from "@/corpus/adapters/web-bible";

const GOSPELS = [
  { book: "Matthew", chapters: 28 },
  { book: "Mark", chapters: 16 },
  { book: "Luke", chapters: 24 },
  { book: "John", chapters: 21 },
];

async function main() {
  const client = makeClient();
  const adapters = [
    new BibleApiAdapter({ sourceId: "web", translation: "web", books: GOSPELS }),
  ];
  const count = await ingest(client, adapters);
  console.log(`ingested ${count} chunks`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
