# Voicewire

**CLI for voice capture, speech-to-text, and translation.**

Record in the browser, turn speech into text, and translate it — all from your terminal. Works on your Mac, and also when you’re on a remote machine without a local mic.

Pairs with [Polygit](https://github.com/Minacava/Polygit) when you want voice in and Git-backed translation out.

---

## Install

```bash
git clone https://github.com/Minacava/voicewire.git
cd voicewire
npm install
npm run build
npm link
voicewire --help
```

Requires **Node.js 20+**.

---

## Setup

```bash
cp .env.example .env
```

Add API keys for the providers you use (see `.env.example`):

- Speech-to-text (OpenAI)
- Translation (Anthropic)

---

## Commands

### Capture

```bash
voicewire capture
# opens http://127.0.0.1:8787/ — record, then Stop & upload
```

### Transcribe

```bash
voicewire transcribe recordings/capture-….webm
voicewire transcribe ./clip.wav --language es --json
```

### Translate

```bash
voicewire translate "Buenos días" --to en
echo "Hello team" | voicewire translate --to es --from en
```

### Full pipeline

```bash
# Capture → transcribe → translate
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

## Contributing

Issues and pull requests are welcome. Keep changes focused; open an issue first for larger ideas.

---

## License

MIT © Marina Camacho
