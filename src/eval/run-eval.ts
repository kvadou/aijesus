import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import Anthropic from "@anthropic-ai/sdk";
import { makeClient } from "@/corpus/store";
import { runAgent } from "@/chat/agent";
import { EVAL_CASES } from "@/eval/cases";

async function main() {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const db = makeClient();
  let failures = 0;

  for (const c of EVAL_CASES) {
    const result = await runAgent(anthropic, db, [{ role: "user", content: c.prompt }]);
    const { pass, note } = c.check(result);
    console.log(`${pass ? "PASS" : "FAIL"} [${c.category}] ${note}`);
    if (!pass) {
      failures++;
      console.log(`   prompt: ${c.prompt}`);
      console.log(`   answer: ${result.text.slice(0, 300)}`);
    }
  }
  console.log(`\n${EVAL_CASES.length - failures}/${EVAL_CASES.length} passed`);
  if (failures > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
