# Cursor + Claude Code VOICEVOX TTS

Claude Code (Cursor) の応答を VOICEVOX で音声読み上げするプロジェクトテンプレートです。

## 必要環境

- Windows（PowerShell による音声再生）
- [Node.js](https://nodejs.org/) v18 以上
- [Cursor](https://www.cursor.com/) + Claude Code
- [VOICEVOX ENGINE](https://github.com/VOICEVOX/voicevox_engine/releases)

---

## セットアップ（3ステップ）

### ステップ 1: VOICEVOX ENGINE をダウンロード

[VOICEVOX ENGINE リリースページ](https://github.com/VOICEVOX/voicevox_engine/releases) から
最新の Windows 版（`windows-nvidia` または `windows-cpu`）をダウンロードし、任意のフォルダに展開してください。

> **注意**: 公式サイトの「VOICEVOX」アプリ（GUI付き）ではなく、**VOICEVOX ENGINE**（エンジン単体）が必要です。

展開後、`run.exe` のフルパスを確認してください。

例: `C:\Users\yourname\voicevox-engine\run.exe`

---

### ステップ 2: このリポジトリをクローン

```bash
git clone https://github.com/zunovia/cursor-claude-voicevox01.git
cd cursor-claude-voicevox01
```

---

### ステップ 3: VOICEVOX ENGINE のパスを設定

`voicevox-config.json` を作成し、`enginePath` に `run.exe` のパスを記入します。

> **clone 直後は `voicevox-config.json` が存在しません。**
> 以下の手順で作成してください。

**方法A: コピーして手動編集**

```bash
copy voicevox-config.example.json voicevox-config.json
```

`voicevox-config.json` をテキストエディタで開き、`enginePath` を設定します:

```json
{
  "enginePath": "C:/Users/yourname/voicevox-engine/run.exe",
  "speaker": 14,
  "speedScale": 1.0,
  "maxChars": 500
}
```

> パスの区切り文字は `/`（スラッシュ）または `\\`（バックスラッシュ2つ）のどちらでも動作します。

**方法B: Cursor で開いて Claude Code に設定させる**

1. Cursor でこのフォルダを開く
2. Claude Code のセッションを開始する（初回起動時に `voicevox-config.example.json` から自動コピーされます）
3. チャットで以下を実行:

```
/tts engine C:/Users/yourname/voicevox-engine/run.exe
```

---

### 動作確認

Cursor でこのフォルダを開き、Claude Code に何か質問してみてください。
応答が完了すると VOICEVOX が自動的に読み上げます。

エンジンの起動に初回は少し時間がかかることがあります（最大 30 秒）。

---

## 使い方

### /tts コマンド

Claude Code のチャットで以下のコマンドが使えます:

| コマンド | 説明 |
|---------|------|
| `/tts` | 現在の設定とエンジン状態を表示 |
| `/tts list` | VOICEVOX 話者一覧を表示 |
| `/tts set <ID>` | 話者を変更（例: `/tts set 3`） |
| `/tts speed <値>` | 速度を変更（0.5〜2.0、例: `/tts speed 1.3`） |
| `/tts engine <パス>` | エンジンパスを設定・変更 |
| `/tts test <テキスト>` | テスト再生 |

---

### TTS の停止

再生中の音声は `SubagentStop` イベント（Ctrl+C 等）で自動停止します。

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

---

## 設定ファイル

`voicevox-config.json`（`.gitignore` で除外済み、各自のPC固有の設定）:

| キー | 説明 | デフォルト |
|-----|------|-----------|
| `enginePath` | VOICEVOX `run.exe` のフルパス | `""` (未設定) |
| `speaker` | 話者 ID | `14`（冥鳴ひまり） |
| `speedScale` | 読み上げ速度 | `1.0` |
| `maxChars` | 最大読み上げ文字数 | `500` |

---

## 動作の仕組み

| イベント | 動作 |
|---------|------|
| **SessionStart** | VOICEVOX エンジンが起動していなければ自動起動（最大 30 秒待機） |
| **Stop** | Claude の応答完了後、最後のメッセージを音声合成して再生 |
| **SubagentStop** | 再生中の音声を停止 |

これらは `.claude/settings.json` の hooks で設定されています。

---

## トラブルシューティング

### 音声が再生されない

1. `voicevox-config.json` の `enginePath` が正しく設定されているか確認
2. 設定したパスに `run.exe` が存在するか確認
3. Cursor を再起動して Claude Code のセッションを開始し直す

### voicevox-config.json が見つからないと言われる

clone 直後はこのファイルが存在しません（`.gitignore` で除外されているため）。
「ステップ 3」の手順に従って作成してください。

### エンジンが起動しない

- VOICEVOX ENGINE を手動で起動し、ブラウザで `http://127.0.0.1:50021/version` にアクセスして応答があるか確認
- ファイアウォールや他のアプリが 50021 ポートを使用していないか確認

### Node.js が見つからない

Node.js がインストールされていない場合、hooks が動作しません。
[Node.js 公式サイト](https://nodejs.org/) から LTS 版をインストールしてください。
インストール後、Cursor を再起動してください。
