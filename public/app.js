(() => {
  const startBtn = document.getElementById("start");
  const stopBtn = document.getElementById("stop");
  const status = document.getElementById("status");

  /** @type {MediaRecorder | null} */
  let recorder = null;
  /** @type {MediaStream | null} */
  let stream = null;
  /** @type {BlobPart[]} */
  let chunks = [];

  function setStatus(text, kind) {
    status.className = kind || "";
    status.innerHTML = text;
  }

  function pickMime() {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];
    for (const type of candidates) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(type)) return type;
    }
    return "";
  }

  startBtn.addEventListener("click", async () => {
    try {
      chunks = [];
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMime();
      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      recorder.start(250);
      startBtn.disabled = true;
      stopBtn.disabled = false;
      setStatus('<span class="pulse"></span>Recording… speak now, then Stop &amp; upload.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(`Mic error: ${msg}`, "err");
    }
  });

  stopBtn.addEventListener("click", async () => {
    if (!recorder) return;
    stopBtn.disabled = true;

    const mimeType = recorder.mimeType || "audio/webm";
    await new Promise((resolve) => {
      recorder.addEventListener("stop", resolve, { once: true });
      recorder.stop();
    });

    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    recorder = null;
    startBtn.disabled = false;

    const blob = new Blob(chunks, { type: mimeType });
    chunks = [];
    if (blob.size === 0) {
      setStatus("Empty recording — try again.", "err");
      return;
    }

    const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : "webm";
    setStatus("Uploading to Voicewire CLI…");

    try {
      const res = await fetch(`/upload?ext=${encodeURIComponent(ext)}`, {
        method: "POST",
        headers: { "content-type": mimeType },
        body: blob,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      setStatus(`Uploaded. Saved as ${data.path}. You can close this tab.`, "ok");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(`Upload failed: ${msg}`, "err");
    }
  });
})();
