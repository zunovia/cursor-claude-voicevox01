// Ensure VOICEVOX engine is running on SessionStart
// Reads enginePath from voicevox-config.json in project root
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const CONFIG_PATH = path.join(PROJECT_ROOT, "voicevox-config.json");
const EXAMPLE_PATH = path.join(PROJECT_ROOT, "voicevox-config.example.json");

function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH) && fs.existsSync(EXAMPLE_PATH)) {
      fs.copyFileSync(EXAMPLE_PATH, CONFIG_PATH);
    }
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
      "[VOICEVOX] enginePath が voicevox-config.json に設定されていません。\n" +
        "  設定方法: Claude Code で `/tts engine <run.exeのフルパス>` を実行するか、\n" +
        "  voicevox-config.json の enginePath に VOICEVOX の run.exe のパスを直接記入してください。\n" +
        "  例: \"enginePath\": \"C:/Users/yourname/voicevox/vv-engine/run.exe\""
    );
    process.exit(0);
  }

  if (!fs.existsSync(enginePath)) {
    console.error(
      `[VOICEVOX] エンジンが見つかりません: ${enginePath}\n` +
        "  voicevox-config.json の enginePath を確認してください。\n" +
        "  VOICEVOX ENGINE が正しい場所に展開されているか確認してください。"
    );
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
