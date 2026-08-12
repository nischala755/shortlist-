import { spawnSync } from "node:child_process";
import { productionConfigurationErrors } from "./production-config.mjs";

const errors = productionConfigurationErrors();

if (errors.length) {
  console.error(`Production configuration is invalid:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

const server = spawnSync(process.execPath, ["server.js"], { stdio: "inherit" });
process.exit(server.status ?? 1);
