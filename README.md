# Voicewire

**CLI for browser mic capture → Whisper speech-to-text → Claude translation.**

Remote and cloud environments often have no microphone. Voicewire starts a local page so your **browser** captures audio, uploads it to the CLI, then runs **OpenAI Whisper** and **Anthropic Claude**.

Pairs naturally with [Polygit](https://github.com/Minacava/Polygit) when you want voice in and Git-backed translation out.

---

## Install (local)

```bash
npm install
npm run build
node dist/cli.js --help
# optional link:
npm link
voicewire --help
```

Requires **Node.js 20+**.

Do not publish until you are ready — this repo is not set up for an automated npm release in this branch.

---

## Setup

```bash
cp .env.example .env
# OPENAI_API_KEY=...        # Whisper
# ANTHROPIC_API_KEY=...     # Claude
```

---

## Commands

### Capture in the browser

```bash
voicewire capture
# opens http://127.0.0.1:8787/ — record, then Stop & upload
```

### Transcribe with Whisper

```bash
voicewire transcribe recordings/capture-….webm
voicewire transcribe ./clip.wav --language es --json
```

### Translate with Claude

```bash
voicewire translate "Buenos días" --to en
echo "Hello team" | voicewire translate --to es --from en
```

### Full pipeline

```bash
# Capture → Whisper → Claude
voicewire run --to es

# Or reuse an existing file
voicewire run --file ./clip.webm --to fr --from en --json
```

---

## Library

```ts
import {
  startCaptureServer,
  transcribeWithWhisper,
  translateWithClaude,
  runPipeline,
} from "voicewire";
```

---

## License

MIT © Marina Camacho
