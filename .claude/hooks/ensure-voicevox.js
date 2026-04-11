// Ensure VOICEVOX engine is running on SessionStart
// Reads enginePath from voicevox-config.json in project root
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const CONFIG_PATH = path.join(process.cwd(), "voicevox-config.json");

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return {};
  }
}

function checkEngine() {
  return new Promise((resolve) => {
    http
      .get("http://127.0.0.1:50021/version", (res) => {
        resolve(res.statusCode === 200);
      })
      .on("error", () => resolve(false));
  });
}

async function main() {
  // Consume stdin (hook input)
  for await (const _ of process.stdin) {}

  const running = await checkEngine();
  if (running) {
    process.exit(0);
  }

  const config = loadConfig();
  const enginePath = config.enginePath;

  if (!enginePath) {
    console.error(
      "[VOICEVOX] enginePath not set in voicevox-config.json. " +
        "Please set the path to your VOICEVOX run.exe"
    );
    process.exit(0);
  }

  if (!fs.existsSync(enginePath)) {
    console.error(`[VOICEVOX] Engine not found at: ${enginePath}`);
    process.exit(0);
  }

  // Start VOICEVOX engine in background
  const child = spawn(enginePath, ["--host", "127.0.0.1", "--port", "50021"], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  // Wait for it to be ready (up to 30s)
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if (await checkEngine()) {
      process.exit(0);
    }
  }

  console.error("[VOICEVOX] Engine did not start within 30s");
  process.exit(0);
}

main().catch(() => process.exit(0));
