(() => {
  // --- Minimal "game engine" helpers ---
  const $ = (sel) => document.querySelector(sel);

  // Browser audio policy: create/resume on first user gesture.
  let audioCtx = null;
  function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function beep(freq=440, dur=0.12, type="sine", gain=0.10) {
    const ctx = getAudio();
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function glide(f0, f1, dur=0.22, type="sine", gain=0.10) {
    const ctx = getAudio();
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noiseBurst(dur=0.12, gain=0.08) {
    const ctx = getAudio();
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    src.buffer = buffer;
    g.gain.value = gain;
    src.connect(g).connect(ctx.destination);
    src.start();
  }

  // --- Fallback sounds (client-side synthesis) ---
  const sounds = {
    cat: () => { glide(820, 220, 0.26, "sine", 0.11); },
    dog: () => { beep(160, 0.07, "square", 0.10); setTimeout(() => beep(120, 0.10, "square", 0.10), 90); },
    monkey: () => { beep(520, 0.05, "triangle", 0.09); setTimeout(()=>beep(760, 0.05, "triangle", 0.09), 70); setTimeout(()=>beep(610, 0.06, "triangle", 0.08), 140); },
    cow: () => { glide(240, 140, 0.33, "sawtooth", 0.08); },
    pig: () => { noiseBurst(0.08, 0.05); setTimeout(()=>glide(300, 90, 0.18, "square", 0.08), 40); },
    frog: () => { beep(220, 0.12, "sine", 0.09); setTimeout(()=>beep(180, 0.12, "sine", 0.09), 120); },
    lion: () => { noiseBurst(0.18, 0.07); setTimeout(()=>beep(90, 0.14, "sawtooth", 0.08), 60); },
    bear: () => { beep(110, 0.18, "triangle", 0.09); },
    panda: () => { beep(660, 0.08, "sine", 0.08); setTimeout(()=>beep(440, 0.12, "sine", 0.08), 90); },
    // Our "ostrich" signature: a warbly boom + squawk
    ostrich: () => {
      const ctx = getAudio();
      const t0 = ctx.currentTime;

      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const g = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(140, t0);

      lfo.type = "sine";
      lfo.frequency.setValueAtTime(10, t0);
      lfoGain.gain.setValueAtTime(28, t0);

      lfo.connect(lfoGain).connect(osc.frequency);

      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);

      osc.connect(g).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.31);

      // Add a little "spit" noise at the end
      setTimeout(() => noiseBurst(0.08, 0.06), 220);
    },
    wrong: () => { beep(90, 0.22, "square", 0.10); setTimeout(()=>beep(70, 0.18, "square", 0.08), 160); }
  };

  // Real(ish) animal sounds hosted on Wikimedia Commons (MP3 transcodes).
  // If you'd rather be fully self-contained, download these files and point the URLs to your own host.
  const SOUND_URLS = {
    cat: "cat.mp3",
    dog: "dog.mp3",
    vcelka: "vcelka-maja.mp3",
    airhorn: "airhorn.mp3",
    ostrich: "ostrich.mp3",
    pickle: "pickle-rick.mp3",
    boneca: "boneca.mp3"
  };

  // Single shared audio element - ensures only one sound can play at a time
  let sharedAudio = null;

  // Try to play a real audio file first (better on mobile), fall back to synthesis.
  function playSound(tile) {
    const fn = sounds[tile.soundKey] || sounds.cat;

    const url = tile.soundUrl || SOUND_URLS[tile.soundKey] || "";
    if (!url) {
      fn();
      return;
    }

    try {
      // Destroy the previous audio element completely
      if (sharedAudio) {
        sharedAudio.pause();
        sharedAudio.removeAttribute("src");
        sharedAudio.load(); // Aborts any pending network requests
        sharedAudio = null;
      }
      
      // Create a fresh Audio element
      sharedAudio = new Audio(url);
      const p = sharedAudio.play();
      if (p && typeof p.catch === "function") p.catch(() => fn());
    } catch {
      fn();
    }
  }

  function annoyVibrate(ms=35) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch {}
  }

  // --- Simple inline SVG ostrich "image" (no external assets) ---
  function ostrichSVG(color="#e9eefc") {
    return `
      <svg width="54" height="54" viewBox="0 0 64 64" aria-hidden="true">
        <g fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.95">
          <path d="M40 14c-10 6-7 16-5 21" />
          <path d="M35 35c-9 1-14 5-16 10" />
          <path d="M20 46c3 5 10 8 18 8 9 0 16-4 16-10 0-7-7-12-18-12" />
          <path d="M43 20c2 0 4 2 4 4" />
          <path d="M26 54l-2 6" />
          <path d="M38 54l1 6" />
        </g>
      </svg>
    `;
  }

  // --- Puzzle setup ---
  // NOTE: External images/audio URLs are intentionally easy to swap.
  // If any host blocks hotlinking, replace URLs with your own hosted files.
  const tiles = [
    {
      id:"cat", label:"Cat", emoji:"🐱",
      imgUrl:"https://loremflickr.com/320/320/cat?lock=11",
      soundKey:"cat",
      // Example (MP3): "https://.../cat-meow.mp3"
      soundUrl:""
    },
    {
      id:"bear", label:"Burák", emoji:"🐻",
      imgUrl:"burak-foto.jpg",
      // misleading: also counts as an "ostrich" because of its sound
      soundKey:"ostrich",
      soundUrl:""
    },
    {
      id:"dog", label:"Dog", emoji:"🐶",
      imgUrl:"doggo.jpg",
      soundKey:"dog",
      soundUrl:""
    },
    {
      id:"monkey", label:"Monkey", emoji:"🐵",
      imgUrl:"monkey.webp",
      // misleading: this one counts as an "ostrich" because of its sound
      soundKey:"ostrich",
      soundUrl:""
    },
    {
      id:"cow", label:"Monkey", emoji:"🐮",
      imgUrl:"monkey.webp",
      soundKey:"airhorn",
      soundUrl:""
    },
    {
      id:"pig", label:"Liam Neeson", emoji:"🐷",
      imgUrl:"liam-neeson.webp",
      soundKey:"boneca",
      soundUrl:""
    },
    { id:"ostrichA", label:"Ostrich", emoji:"🪶", imgUrl:"ostrich.webp", soundKey:"vcelka",     soundUrl:"" },
    { id:"ostrichB", label:"Ostrich", emoji:"🪶", imgUrl:"ostrich.webp", soundKey:"ostrich", soundUrl:"" },
    
    {
      id:"lion", label:"Burák", emoji:"🦁",
      imgUrl:"burak-foto.jpg",
      soundKey:"cat",
      soundUrl:""
    },

    // 3 ostrich *images* in the grid (but "ostrich" is determined by SOUND key)
    // One of the ostrich *pictures* is correct; the others are decoys.
    
    {
      id:"frog", label:"Cat in Bread", emoji:"🐸",
      imgUrl:"cat-in-bread.jpg",
      soundKey:"vcelka",
      soundUrl:""
    },
    { id:"ostrichC", label:"Ostrich", emoji:"🪶", imgUrl:"ostrich.webp", soundKey:"cat",     soundUrl:"" },
    

    // extra to fill grid nicely:
    { id:"cat2", label:"Pickle Rick", emoji:"🐱", imgUrl:"pickle-rick.webp", soundKey:"pickle", soundUrl:"" }
  ];

  const OSTRICH_TARGET = 3;
  let found = new Set();

  function setToast(msg, kind="") {
    const el = $("#toast");
    el.textContent = msg;
    el.className = `toast show ${kind}`.trim();
  }
  function clearToast() {
    const el = $("#toast");
    el.className = "toast";
    el.textContent = "";
  }

  function updateProgress() {
    $("#progressText").textContent = `${found.size} / ${OSTRICH_TARGET}`;
  }

  function clearSelections() {
    found.clear();
    document.querySelectorAll(".tile.selected").forEach(t => t.classList.remove("selected"));
    updateProgress();
  }

  function flashWrong(tileEl) {
    tileEl.classList.add("wrong", "shake");
    setTimeout(() => tileEl.classList.remove("wrong", "shake"), 420);
  }

  function animate(tileEl) {
    tileEl.classList.remove("wobble");
    // force reflow to restart animation
    void tileEl.offsetWidth;
    tileEl.classList.add("wobble");
    tileEl.addEventListener("animationend", () => tileEl.classList.remove("wobble"), { once: true });
  }

  function onTilePress(tile, tileEl) {
    animate(tileEl);
    annoyVibrate(25);
    playSound(tile);

    if (tileEl.classList.contains("selected")) {
      // Already selected: keep it selected, but still be annoying by doing nothing else.
      setToast("Already selected. (Yes, you still have to remember the other ones.)");
      return;
    }

    if (tile.soundKey === "ostrich") {
      found.add(tile.id);
      tileEl.classList.add("selected");
      tileEl.querySelector(".badge").textContent = "selected";
      clearToast();
      updateProgress();

      if (found.size === OSTRICH_TARGET) {
        setToast("✅ All ostriches selected. Moving to Part 2…", "ok");
        setTimeout(() => { window.location.href = "./stage2.html"; }, 800);
      }
      return;
    }

    // Wrong pick: reset everything
    sounds.wrong();
    annoyVibrate(65);
    flashWrong(tileEl);
    clearSelections();
    setToast("❌ Wrong animal. Counter reset to 0.", "bad");
  }

  function render() {
    const grid = $("#grid");
    grid.innerHTML = "";

    tiles.forEach((t) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tile";
      btn.setAttribute("aria-label", t.label);

      const badge = document.createElement("div");
      badge.className = "badge";
      badge.textContent = "selected";
      btn.appendChild(badge);

      const media = document.createElement("div");
      media.className = "media";

      // Try a real image first, fall back to emoji if it fails.
      const img = document.createElement("img");
      img.alt = t.label;
      img.loading = "lazy";
      img.decoding = "async";
      img.referrerPolicy = "no-referrer";
      img.src = t.imgUrl || "";
      media.appendChild(img);

      const em = document.createElement("div");
      em.className = "emoji";
      em.textContent = t.emoji || "🐾";
      em.style.display = "none";

      img.addEventListener("error", () => {
        media.style.display = "none";
        em.style.display = "block";
      }, { once: true });

      btn.appendChild(media);
      btn.appendChild(em);

      const label = document.createElement("div");
      label.className = "label";
      label.textContent = t.label;
      btn.appendChild(label);

      // Pointer events are great on mobile; add click fallback for older browsers.
      let pressed = false;
      btn.addEventListener("pointerdown", (e) => {
        pressed = true;
        e.preventDefault();
        onTilePress(t, btn);
      });
      btn.addEventListener("click", (e) => {
        if (pressed) { pressed = false; return; }
        e.preventDefault();
        onTilePress(t, btn);
      });

      grid.appendChild(btn);
    });

    updateProgress();
  }

  $("#resetBtn").addEventListener("click", () => {
    clearSelections();
    clearToast();
    beep(330, 0.08, "sine", 0.08);
    setToast("Reset.", "");
    setTimeout(clearToast, 600);
  });

  render();
})();
