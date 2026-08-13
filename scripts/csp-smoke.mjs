import { execFileSync, spawn } from "node:child_process";

const port = process.env.CSP_SMOKE_PORT ?? "3112";
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", port],
  { stdio: "ignore" },
);

try {
  let response;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      response = await fetch(`http://127.0.0.1:${port}/login`);
      if (response.ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!response?.ok) throw new Error("Production server did not become ready");

  const policy = response.headers.get("content-security-policy") ?? "";
  const nonce = policy.match(/'nonce-([^']+)'/)?.[1];
  if (!nonce) throw new Error("Content Security Policy nonce is missing");
  const html = await response.text();
  if (!html.includes(`nonce="${nonce}"`)) {
    throw new Error("Rendered scripts do not carry the Content Security Policy nonce");
  }
  if (!policy.includes("object-src 'none'") || !policy.includes("frame-ancestors 'none'")) {
    throw new Error("Content Security Policy is missing required restrictions");
  }

  console.log(JSON.stringify({ status: "passed", productionRender: true, cspNonce: true }));
} finally {
  if (process.platform === "win32") {
    try {
      execFileSync("taskkill", ["/pid", String(server.pid), "/t", "/f"], {
        stdio: "ignore",
      });
    } catch {}
  } else {
    server.kill("SIGTERM");
  }
}
