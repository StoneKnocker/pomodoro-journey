function playChime() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();
  const now = ctx.currentTime;

  const frequencies = [523.25, 659.25];
  const startTimes = [now, now + 0.15];
  const durations = [0.3, 0.4];

  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.5, startTimes[i]);
    gain.gain.exponentialRampToValueAtTime(0.01, startTimes[i] + durations[i]);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTimes[i]);
    osc.stop(startTimes[i] + durations[i]);
  });

  setTimeout(() => ctx.close(), 800);
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg === "play-chime") {
    playChime();
  }
});

chrome.runtime.sendMessage("offscreen-ready");
