(() => {
  const $ = (sel) => document.querySelector(sel);

  let audioCtx = null;
  function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function tone(freq=440, dur=0.12, type="sine", gain=0.10) {
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

  function beepBeep(freq=440) {
    tone(freq, 0.10, "sine", 0.10);
    setTimeout(() => tone(freq * 1.18, 0.10, "sine", 0.09), 130);
  }

  function wrongSound() {
    // Harsh buzzer-like sound
    tone(120, 0.25, "sawtooth", 0.15);
    setTimeout(() => tone(80, 0.25, "sawtooth", 0.12), 150);
    setTimeout(() => tone(60, 0.30, "square", 0.10), 300);
  }

  function playAirhorn() {
    try {
      const airhorn = new Audio("airhorn.mp3");
      airhorn.volume = 0.7;
      airhorn.play().catch(() => {});
    } catch {
      // Fallback victory sound
      tone(523, 0.15, "sine", 0.12);
      setTimeout(() => tone(659, 0.15, "sine", 0.12), 150);
      setTimeout(() => tone(784, 0.25, "sine", 0.15), 300);
    }
  }

  function animate(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    el.addEventListener("animationend", () => el.classList.remove(cls), { once:true });
  }

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

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const tilesBase = [
    { id:"tri",  label:"Triangle", emoji:"🔺", freq:220, pattern:"single" },
    { id:"sq",   label:"Square",   emoji:"🟦", freq:260, pattern:"double" },  // correct (low)
    { id:"cir",  label:"Circle",   emoji:"⚫️", freq:300, pattern:"single" },
    { id:"star", label:"Star",     emoji:"⭐️", freq:340, pattern:"double" },  // correct (mid)
    { id:"dia",  label:"Diamond",  emoji:"💠", freq:380, pattern:"single" },
    { id:"hex",  label:"Hexagon",  emoji:"⬣",  freq:420, pattern:"single" },
    { id:"moon", label:"Moon",     emoji:"🌙", freq:470, pattern:"single" },
    { id:"bolt", label:"Bolt",     emoji:"⚡️", freq:520, pattern:"double" },  // correct (high)
    { id:"heart",label:"Heart",    emoji:"❤️", freq:560, pattern:"single" },
  ];

  // Correct order: by pitch (freq)
  const correctOrdered = tilesBase
    .filter(t => t.pattern === "double")
    .slice()
    .sort((a,b) => a.freq - b.freq)
    .map(t => t.id);

  let progressIdx = 0;
  let selected = new Set();
  let tiles = tilesBase.slice();

  function updateProgress() {
    $("#progressText").textContent = `${progressIdx} / ${correctOrdered.length}`;
  }

  function reset(hard=true) {
    progressIdx = 0;
    selected.clear();
    document.querySelectorAll(".tile.selected").forEach(t => t.classList.remove("selected"));
    updateProgress();
    $("#reveal").style.display = "none";
    if (hard) {
      tiles = shuffle(tilesBase.slice());
      render();
    }
  }

  function onPress(tile, el) {
    animate(el, "wobble");

    if (tile.pattern === "double") {
      // Determine how many times to play based on position in correctOrdered
      const orderPosition = correctOrdered.indexOf(tile.id);
      const playCount = orderPosition >= 0 ? orderPosition + 1 : 1;
      
      try {
        if (!tile._audio) {
          const a = new Audio("cat.mp3");
          a.preload = "auto";
          tile._audio = a;
        }
        tile._audio.playbackRate = 2.0; // 2x faster
        tile._audio.currentTime = 0;
        
        let currentPlay = 0;
        const playNext = () => {
          if (currentPlay < playCount) {
            tile._audio.currentTime = 0;
            const p = tile._audio.play();
            if (p && typeof p.catch === "function") {
              p.catch(() => beepBeep(tile.freq));
            }
            currentPlay++;
            if (currentPlay < playCount) {
              setTimeout(playNext, 250); // slight delay between plays
            }
          }
        };
        playNext();
      } catch {
        beepBeep(tile.freq);
      }
    } else {
      tone(tile.freq, 0.12, "triangle", 0.09);
    }

    // Already selected tiles just taunt.
    if (selected.has(tile.id)) {
      setToast("Already selected. (The order still matters.)");
      return;
    }

    const expectedId = correctOrdered[progressIdx];

    if (tile.id === expectedId) {
      selected.add(tile.id);
      el.classList.add("selected");
      el.querySelector(".badge").textContent = "selected";
      progressIdx += 1;
      clearToast();
      updateProgress();

      if (progressIdx === correctOrdered.length) {
        setToast("✅ Success. Revealing content…", "ok");
        playAirhorn();
        reveal();
      }
      return;
    }

    // Wrong click: reset + shuffle (extra annoying)
    wrongSound();
    animate(el, "shake");
    setToast("❌ Wrong. Progress reset and tiles shuffled.", "bad");
    
    // Delay before reshuffling so user can see what they clicked
    setTimeout(() => {
      reset(true);
    }, 400);
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

      const em = document.createElement("div");
      em.className = "emoji";
      em.textContent = t.emoji;
      btn.appendChild(em);

      const label = document.createElement("div");
      label.className = "label";
      label.textContent = t.label;
      btn.appendChild(label);

      let pressed = false;
      btn.addEventListener("pointerdown", (e) => {
        pressed = true;
        e.preventDefault();
        onPress(t, btn);
      });

      // Click fallback for older browsers that don't fully support Pointer Events.
      btn.addEventListener("click", (e) => {
        if (pressed) { pressed = false; return; }
        e.preventDefault();
        onPress(t, btn);
      });

      grid.appendChild(btn);
    });

    updateProgress();
  }

  function reveal() {
    const revealEl = $("#reveal");
    const img = $("#revealImg");

    img.src = "amogus.png";

    revealEl.style.display = "block";
  }

  $("#resetBtn").addEventListener("click", () => {
    clearToast();
    reset(true);
    tone(330, 0.08, "sine", 0.08);
    setToast("Reset & shuffled.");
    setTimeout(clearToast, 700);
  });

  render();
})();
