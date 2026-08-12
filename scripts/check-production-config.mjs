import { productionConfigurationErrors } from "./production-config.mjs";

const errors = productionConfigurationErrors();
if (errors.length) {
  console.error(`Production configuration is invalid:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log("Production configuration is complete.");
