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
2. 以下のコマンドで音声合成・再生:
```bash
# audio_query取得
QUERY=$(curl -s -X POST "http://127.0.0.1:50021/audio_query?text=<テキスト>&speaker=<SPEAKER_ID>")
# speedScale注入
QUERY=$(echo "$QUERY" | node -e "const c=[];process.stdin.on('data',d=>c.push(d));process.stdin.on('end',()=>{const q=JSON.parse(Buffer.concat(c));q.speedScale=<SPEED>;console.log(JSON.stringify(q))})")
# synthesis & play
WAV_PATH="$(node -e "console.log(require('os').tmpdir())")/claude-tts-test.wav"
curl -s -X POST -H "Content-Type: application/json" -d "$QUERY" "http://127.0.0.1:50021/synthesis?speaker=<SPEAKER_ID>" -o "$WAV_PATH"
powershell -Command "(New-Object Media.SoundPlayer '$WAV_PATH').PlaySync()"
```

## Notes
- 設定変更は次の返答から即座に反映されます（hookが毎回configを読み込むため）
- VOICEVOXエンジンが起動していない場合は、`/tts engine <path>` で設定後、セッションを再起動してください
