// Quick check that the Cline SDK can reach the model configured in .env.
//   npm run agent:ping            (uses AGENT_MODEL)
//   npm run agent:ping -- <model> (try another model id)
import { Agent } from "@cline/sdk";

const agent = new Agent({
  providerId: process.env.AGENT_PROVIDER ?? "cline",
  modelId: process.argv[2] ?? process.env.AGENT_MODEL ?? "anthropic/claude-haiku-5.5",
  apiKey: process.env.CLINE_API_KEY,
  systemPrompt: "Reply with one short sentence.",
  tools: [],
  maxIterations: 1,
});

const started = Date.now();
const result = await agent.run("Say hello to the SafeWalk team.");
console.log(`status=${result.status} in ${Date.now() - started} ms`);
console.log(result.outputText || result.error?.message);
process.exitCode = result.status === "completed" ? 0 : 1;
