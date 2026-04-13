# Cursor + Claude Code VOICEVOX TTS

Claude Code (Cursor) の応答を VOICEVOX で音声読み上げするプロジェクトテンプレートです。

## セットアップ

### 1. VOICEVOX エンジンをダウンロード

[VOICEVOX 公式サイト](https://voicevox.hiroshiba.jp/) からダウンロードし、任意のフォルダに展開してください。

必要なのは **VOICEVOX ENGINE** (音声合成エンジン) です。
展開後、`run.exe` のフルパスを確認してください。

例: `C:/Users/yourname/voicevox/vv-engine/run.exe`

### 2. このリポジトリをクローン

```bash
git clone https://github.com/zunovia/cursor-claude-voicevox01.git
cd cursor-claude-voicevox01
```

### 3. VOICEVOX エンジンのパスを設定

`voicevox-config.example.json` をコピーして `voicevox-config.json` を作成し、`enginePath` を設定します:

```bash
cp voicevox-config.example.json voicevox-config.json
```

```json
{
  "enginePath": "C:/Users/yourname/voicevox/vv-engine/run.exe",
  "speaker": 14,
  "speedScale": 1.0,
  "maxChars": 500
}
```

> 初回起動時に `voicevox-config.json` が存在しない場合は、example から自動的にコピーされます。

または、Cursor で Claude Code を開いた後に `/tts engine` コマンドで設定できます:

```
/tts engine C:/Users/yourname/voicevox/vv-engine/run.exe
```

### 4. Cursor で開く

このフォルダを Cursor で開くと、Claude Code のセッション開始時に自動で VOICEVOX エンジンが起動します。

## 使い方

Claude Code に何か質問すると、応答が自動的に VOICEVOX で読み上げられます。

### /tts コマンド

| コマンド | 説明 |
|---------|------|
| `/tts` | 現在の設定とエンジン状態を表示 |
| `/tts list` | VOICEVOX 話者一覧を表示 |
| `/tts set <ID>` | 話者を変更（例: `/tts set 3`） |
| `/tts speed <値>` | 速度を変更（0.5〜2.0、例: `/tts speed 1.3`） |
| `/tts engine <パス>` | エンジンパスを設定 |
| `/tts test <テキスト>` | テスト再生 |

### TTS の停止

再生中の音声を停止するには、`SubagentStop` イベント（Ctrl+C 等）で自動停止します。

#### キーボードショートカットで停止する（任意）

Cursor IDE 上で `Ctrl+Shift+S` により TTS を即座に停止できるようにするには、以下の 2 ファイルを設定してください。

**1. キーバインド設定** — `%APPDATA%\Cursor\User\keybindings.json`

```json
[
  {
    "key": "ctrl+shift+s",
    "command": "workbench.action.tasks.runTask",
    "args": "Stop TTS"
  }
]
```

**2. タスク定義** — `%APPDATA%\Cursor\User\tasks\tasks.json`（`tasks` フォルダがなければ作成）

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Stop TTS",
      "type": "process",
      "command": "node",
      "args": ["${workspaceFolder}/.claude/hooks/tts-kill.js"],
      "presentation": { "reveal": "silent", "close": true }
    }
  ]
}
```

> `${workspaceFolder}` を使うことで、プロジェクトの場所に依存しません。

## 設定ファイル

`voicevox-config.json`:

| キー | 説明 | デフォルト |
|-----|------|-----------|
| `enginePath` | VOICEVOX `run.exe` のパス | `""` (未設定) |
| `speaker` | 話者ID | `14` (冥鳴ひまり) |
| `speedScale` | 読み上げ速度 | `1.0` |
| `maxChars` | 最大文字数 | `500` |

## 動作の仕組み

- **SessionStart**: VOICEVOX エンジンが起動していなければ自動起動
- **Stop**: Claude の応答完了後、最後のメッセージを音声合成して再生
- **SubagentStop**: 再生中の音声を停止

これらは `.claude/settings.json` の hooks で設定されています。

## 必要環境

- Windows (PowerShell による音声再生)
- Node.js
- Cursor + Claude Code
- VOICEVOX ENGINE
