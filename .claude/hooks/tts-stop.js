// Claude Code "Stop" hook: reads last assistant message and speaks via VOICEVOX
// Reads speaker, speedScale, maxChars from voicevox-config.json
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");

const VOICEVOX = "http://127.0.0.1:50021";
const PID_FILE = path.join(os.tmpdir(), "claude-tts-pid.txt");
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const CONFIG_PATH = path.join(PROJECT_ROOT, "voicevox-config.json");

const EXAMPLE_PATH = path.join(PROJECT_ROOT, "voicevox-config.example.json");
const DEFAULTS = { speaker: 14, speedScale: 1.0, maxChars: 500 };

function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH) && fs.existsSync(EXAMPLE_PATH)) {
      fs.copyFileSync(EXAMPLE_PATH, CONFIG_PATH);
    }
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    return { ...DEFAULTS, ...raw };
  } catch {
    return { ...DEFAULTS };
  }
}

function killPrevious() {
  try {
    if (fs.existsSync(PID_FILE)) {
      const pid = parseInt(fs.readFileSync(PID_FILE, "utf8").trim(), 10);
      if (pid) process.kill(pid);
    }
  } catch {}
  try {
    fs.unlinkSync(PID_FILE);
  } catch {}
}

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () =>
        resolve({ status: res.statusCode, body: Buffer.concat(chunks) })
      );
    });
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function cleanText(text, maxChars) {
  return text
    .replace(/```[\s\S]*?```/g, "\u3001\u30B3\u30FC\u30C9\u30D6\u30ED\u30C3\u30AF\u7701\u7565\u3001")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*_~>|=-]{2,}/g, "")
    .replace(/^#+\s*/gm, "")
    .replace(/\|[^\n]+\|/g, "")
    .replace(/\n{2,}/g, "\u3002")
    .replace(/\n/g, "\u3001")
    .trim()
    .slice(0, maxChars);
}

function getLastAssistantMessage(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return null;
  const lines = fs.readFileSync(transcriptPath, "utf8").trim().split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const entry = JSON.parse(lines[i]);
      if (entry.type === "assistant" || entry.role === "assistant") {
        if (typeof entry.content === "string") return entry.content;
        if (Array.isArray(entry.content)) {
          const textParts = entry.content
            .filter((b) => b.type === "text")
            .map((b) => b.text);
          if (textParts.length > 0) return textParts.join("\n");
        }
        if (entry.message?.content) {
          if (typeof entry.message.content === "string")
            return entry.message.content;
          if (Array.isArray(entry.message.content)) {
            const textParts = entry.message.content
              .filter((b) => b.type === "text")
              .map((b) => b.text);
            if (textParts.length > 0) return textParts.join("\n");
          }
        }
      }
    } catch {}
  }
  return null;
}

async function speak(text, config) {
  const clean = cleanText(text, config.maxChars);
  if (!clean) return;

  // Step 1: audio_query
  const qUrl = `${VOICEVOX}/audio_query?text=${encodeURIComponent(clean)}&speaker=${config.speaker}`;
  let q;
  try {
    q = await request(qUrl, { method: "POST" });
  } catch {
    console.error(
      "[VOICEVOX] エンジンに接続できませんでした（http://127.0.0.1:50021）。\n" +
        "  VOICEVOX ENGINE が起動しているか確認してください。\n" +
        "  Cursor を再起動すると SessionStart hook がエンジンを自動起動します。"
    );
    return;
  }
  if (q.status !== 200) return;

  // Step 2: Inject speedScale into query
  let query;
  try {
    query = JSON.parse(q.body.toString());
  } catch {
    return;
  }
  query.speedScale = config.speedScale;

  // Step 3: synthesis
  const sUrl = `${VOICEVOX}/synthesis?speaker=${config.speaker}`;
  const s = await request(sUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });
  if (s.status !== 200) return;

  // Step 4: play with PID tracking
  killPrevious();
  const wavPath = path.join(os.tmpdir(), "claude-tts-hook.wav");
  fs.writeFileSync(wavPath, s.body);
  const child = spawn(
    "powershell",
    ["-Command", `(New-Object Media.SoundPlayer '${wavPath}').PlaySync()`],
    { stdio: "ignore" }
  );
  fs.writeFileSync(PID_FILE, String(child.pid));
  child.on("exit", () => {
    try {
      fs.unlinkSync(PID_FILE);
    } catch {}
  });
  await new Promise((resolve) => child.on("close", resolve));
}

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const input = Buffer.concat(chunks).toString();

  let data;
  try {
    data = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const text = getLastAssistantMessage(data.transcript_path);
  if (!text) process.exit(0);

  const config = loadConfig();

  if (!config.enginePath) {
    console.error(
      "[VOICEVOX] enginePath が未設定のため音声再生をスキップしました。\n" +
        "  設定方法: Claude Code で `/tts engine <run.exeのフルパス>` を実行してください。\n" +
        "  例: /tts engine C:/Users/yourname/voicevox-engine/run.exe"
    );
    process.exit(0);
  }

  await speak(text, config);
}

main().catch(() => process.exit(0));
