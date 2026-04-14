---
disable-model-invocation: true
---

# /tts — VOICEVOX TTS Control

VOICEVOX音声合成の設定を管理するスキルです。

## Config File
設定は **プロジェクトルートの `voicevox-config.json`** に保存されます。

## Subcommands

ユーザーの引数に応じて以下を実行してください:

### `/tts` or `/tts status`
1. `voicevox-config.json` を読み込み、現在の設定を表示:
   - speaker ID、speedScale、maxChars、enginePath
2. `curl -s http://127.0.0.1:50021/version` でエンジン状態を確認
3. 結果をテーブル形式で表示

### `/tts list`
1. `curl -s http://127.0.0.1:50021/speakers` で話者一覧を取得
2. 各話者の名前とスタイル(ID)を一覧表示
3. 現在の `voicevox-config.json` の speaker ID にマーカー `>>>` を付ける

### `/tts set <ID>`
1. 引数のIDが有効か `curl -s http://127.0.0.1:50021/speakers` で確認
2. `voicevox-config.json` の `speaker` を更新して保存
3. 変更後の話者名とIDを表示

### `/tts speed <0.5-2.0>`
1. 値が 0.5〜2.0 の範囲か検証
2. `voicevox-config.json` の `speedScale` を更新して保存
3. 変更後の速度を表示

### `/tts engine <path>`
1. 指定パスに `run.exe` が存在するか確認
2. `voicevox-config.json` の `enginePath` を更新して保存
3. パスを表示

### `/tts test <テキスト>`
1. `voicevox-config.json` から設定を読み込む
2. 以下の Node.js スクリプトで音声合成・再生（Windows 互換）:
```javascript
// このコードブロックは説明用です。実際には下記の node コマンドを実行してください。
// audio_query → speedScale 注入 → synthesis → PowerShell 再生 を一括処理します。
```
```bash
node -e '
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");
const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), "voicevox-config.json"), "utf8"));
const speaker = config.speaker || 14;
const speedScale = config.speedScale || 1.0;
const text = "<テキスト>";
const base = "http://127.0.0.1:50021";
function req(url, opts) {
  return new Promise((res, rej) => {
    const r = http.request(url, opts || {}, (resp) => {
      const c = [];
      resp.on("data", d => c.push(d));
      resp.on("end", () => res({ status: resp.statusCode, body: Buffer.concat(c) }));
    });
    r.on("error", rej);
    if (opts && opts.body) r.write(opts.body);
    r.end();
  });
}
(async () => {
  const q = await req(base + "/audio_query?text=" + encodeURIComponent(text) + "&speaker=" + speaker, { method: "POST" });
  const query = JSON.parse(q.body.toString());
  query.speedScale = speedScale;
  const s = await req(base + "/synthesis?speaker=" + speaker, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(query) });
  const wav = path.join(os.tmpdir(), "claude-tts-test.wav");
  fs.writeFileSync(wav, s.body);
  const child = spawn("powershell", ["-Command", "(New-Object Media.SoundPlayer " + JSON.stringify(wav) + ").PlaySync()"]);
  child.on("close", () => process.exit(0));
})().catch(e => { console.error(e.message); process.exit(1); });
'
```

## Notes
- 設定変更は次の返答から即座に反映されます（hookが毎回configを読み込むため）
- VOICEVOXエンジンが起動していない場合は、`/tts engine <path>` で設定後、セッションを再起動してください
