import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { redactSecrets } from "../dist/util/redact.js";
import { startCaptureServer } from "../dist/capture/server.js";
import { transcribeWithWhisper } from "../dist/stt/whisper.js";
import { translateWithClaude } from "../dist/translate/claude.js";
import { getPackageVersion } from "../dist/version.js";

test("getPackageVersion returns semver-ish string", () => {
  const v = getPackageVersion();
  assert.match(v, /^\d+\.\d+\.\d+/);
});

test("redactSecrets strips openai and anthropic key shapes", () => {
  const msg = "boom sk-abcdefghijklmnopqrstuvwxyz123456 and sk-ant-api03-abcdefghij";
  const out = redactSecrets(msg);
  assert.equal(out.includes("sk-abcdefghijklmnopqrstuvwxyz123456"), false);
  assert.equal(out.includes("sk-ant-api03-abcdefghij"), false);
  assert.match(out, /REDACTED/);
});

test("capture server serves page and accepts upload", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "voicewire-"));
  const outDir = path.join(dir, "recs");
  await mkdir(outDir, { recursive: true });
  const live = await startCaptureServer({ outDir, port: 0, host: "127.0.0.1" });

  try {
    assert.ok(live.port > 0);
    const health = await fetch(`${live.url}health`);
    assert.equal(health.status, 200);
    const page = await fetch(live.url);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /Voicewire/);

    const upload = await fetch(`${live.url}upload?ext=webm`, {
      method: "POST",
      headers: { "content-type": "audio/webm" },
      body: Buffer.from("fake-audio-bytes"),
    });
    assert.equal(upload.status, 200);
    const body = await upload.json();
    const saved = await readFile(body.path);
    assert.equal(saved.toString(), "fake-audio-bytes");

    const waited = await live.waitForRecording();
    assert.equal(waited, body.path);
  } finally {
    await live.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test("transcribeWithWhisper posts multipart and returns text", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "voicewire-w-"));
  const filePath = path.join(dir, "clip.webm");
  await writeFile(filePath, Buffer.from("audio"));

  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ text: "hola mundo" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const result = await transcribeWithWhisper({
    filePath,
    apiKey: "sk-test-key",
    fetchImpl,
  });

  assert.equal(result.text, "hola mundo");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.openai.com/v1/audio/transcriptions");
  assert.ok(calls[0].init.body instanceof FormData);

  await rm(dir, { recursive: true, force: true });
});

test("translateWithClaude returns model text", async () => {
  const fetchImpl = async () =>
    new Response(
      JSON.stringify({
        content: [{ type: "text", text: "good morning" }],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  const result = await translateWithClaude({
    text: "buenos días",
    targetLang: "en",
    apiKey: "sk-ant-test",
    fetchImpl,
  });

  assert.equal(result.text, "good morning");
});
