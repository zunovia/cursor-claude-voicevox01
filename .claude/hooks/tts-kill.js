// Kill any running TTS playback
// Works both as a hook (stdin) and direct CLI call
const fs = require("fs");
const path = require("path");
const os = require("os");

const PID_FILE = path.join(os.tmpdir(), "claude-tts-pid.txt");

function kill() {
  try {
    if (fs.existsSync(PID_FILE)) {
      const pid = parseInt(fs.readFileSync(PID_FILE, "utf8").trim(), 10);
      if (pid) process.kill(pid);
      fs.unlinkSync(PID_FILE);
    }
  } catch {}
}

if (process.stdin.isTTY) {
  kill();
} else {
  (async () => {
    for await (const _ of process.stdin) {}
    kill();
  })().catch(() => process.exit(0));
}
