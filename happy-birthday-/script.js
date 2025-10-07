document.addEventListener("DOMContentLoaded", function () {
  const cake = document.querySelector(".cake");
  const candleCountDisplay = document.getElementById("candleCount");
  const birthdayAudio = document.getElementById("birthdayAudio");
  const celebrationLayer = document.querySelector(".celebration-layer");
  const envelopeOverlay = document.getElementById("envelopeOverlay");
  const letterModal = document.getElementById("letterModal");
  // Configure your local images under the assets/ folder
  const BALLOON_IMAGES = [
    '/assets/8f1a3e64-a8c7-4b35-9dc2-4f68ec76ca2c.jfif'
    
  ];
  let nextBalloonImageIndex = 0;
  // Try to load an optional manifest of images to include all your local assets
  fetch('/assets/images.json', { cache: 'no-cache' })
    .then(function (res) { return res.ok ? res.json() : Promise.reject(); })
    .then(function (list) {
      if (Array.isArray(list)) {
        var normalized = list
          .filter(function (x) { return typeof x === 'string' && x.trim().length > 0; })
          .map(function (p) { return p.startsWith('/assets/') ? p : ('/assets/' + p); })
          .filter(function (p) {
            var lower = p.toLowerCase();
            return lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.gif') || lower.endsWith('.webp') || lower.endsWith('.jfif');
          });
        if (normalized.length > 0) {
          BALLOON_IMAGES.splice(0, BALLOON_IMAGES.length);
          Array.prototype.push.apply(BALLOON_IMAGES, normalized);
          nextBalloonImageIndex = 0;
        }
      }
    })
    .catch(function () { /* no manifest found; keep fallback */ });
  const MAX_CANDLES = 18;
  let candles = [];
  let audioContext;
  let analyser;
  let microphone;
  let hasStartedAudio = false;
  let spawnFromRightNext = true;
  let blowingConsecutive = 0; // require sustained blowing before extinguishing
  // removed alternating spawn logic

  function attemptStartAudio() {
    if (hasStartedAudio || !birthdayAudio) {
      return;
    }
    // Ensure desired playback settings
    try {
      birthdayAudio.loop = false; // play once only
      birthdayAudio.volume = 1.0;
    } catch (e) {
      // ignore
    }
    const playPromise = birthdayAudio.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(function () {
          hasStartedAudio = true;
        })
        .catch(function (err) {
          console.log("Audio play was prevented:", err);
        });
    } else {
      hasStartedAudio = true;
    }
  }

  function updateCandleCount() {
    const activeCandles = candles.filter(
      (candle) => !candle.classList.contains("out")
    ).length;
    candleCountDisplay.textContent = activeCandles;
  }

  function addCandle(left, top) {
    if (candles.length >= MAX_CANDLES) {
      return;
    }
    // Avoid adding/counting a candle too close to an existing one
    var minDistancePx = 22; // roughly candle width, prevents stacking/duplicate counts
    for (var i = 0; i < candles.length; i++) {
      var existing = candles[i];
      var ex = parseFloat(existing.style.left);
      var ey = parseFloat(existing.style.top);
      var dx = ex - left;
      var dy = ey - top;
      if (Math.sqrt(dx * dx + dy * dy) < minDistancePx) {
        // too close to an existing candle; don't add another or change count
        return;
      }
    }
    const candle = document.createElement("div");
    candle.className = "candle";
    candle.style.left = left + "px";
    candle.style.top = top + "px";

    const flame = document.createElement("div");
    flame.className = "flame";
    candle.appendChild(flame);

    cake.appendChild(candle);
    candles.push(candle);
    updateCandleCount();

    // Spawn one larger floating photo alternating between right and left
    try {
      if (celebrationLayer) {
        function spawn(side) {
          const balloon = document.createElement("div");
          balloon.className = "floating-balloon";
          const img = document.createElement("img");
          if (BALLOON_IMAGES.length > 0) {
            img.src = BALLOON_IMAGES[nextBalloonImageIndex % BALLOON_IMAGES.length];
            nextBalloonImageIndex++;
          } else {
            img.src = "/main.png"; // fallback to existing image
          }
          img.alt = "Celebration";
          const stringEl = document.createElement("div");
          stringEl.className = "string";
          const offsetX = 24 + Math.random() * 40; // 24-64px from edge
          const offsetY = 30 + Math.random() * 50; // 30-80px from bottom
          const startY = window.innerHeight - (160 + offsetY);
          const startX = side === 'right' ? (window.innerWidth - (200 + offsetX)) : offsetX;
          balloon.style.left = startX + "px";
          balloon.style.top = startY + "px";
          balloon.appendChild(img);
          balloon.appendChild(stringEl);
          celebrationLayer.appendChild(balloon);
          balloon.addEventListener("animationend", function () {
            if (balloon.parentNode) balloon.parentNode.removeChild(balloon);
          });
        }
        const side = spawnFromRightNext ? 'right' : 'left';
        spawn(side);
        spawnFromRightNext = !spawnFromRightNext;
      }
    } catch (e) { /* ignore */ }
  }

  cake.addEventListener("click", function (event) {
    const rect = cake.getBoundingClientRect();
    const left = event.clientX - rect.left;
    const top = event.clientY - rect.top;
    attemptStartAudio();
    addCandle(left, top);
  });

  // Fallback: start audio on any first user gesture
  function attachFirstGestureStart() {
    if (!birthdayAudio || hasStartedAudio) return;
    const handler = function () {
      attemptStartAudio();
      if (hasStartedAudio) {
        document.removeEventListener("pointerdown", handler);
        document.removeEventListener("click", handler);
        document.removeEventListener("touchstart", handler);
        document.removeEventListener("keydown", handler);
      }
    };
    document.addEventListener("pointerdown", handler, { once: false });
    document.addEventListener("click", handler, { once: false });
    document.addEventListener("touchstart", handler, { once: false });
    document.addEventListener("keydown", handler, { once: false });
  }

  // Basic diagnostics if the audio fails to load
  if (birthdayAudio) {
    birthdayAudio.addEventListener("error", function () {
      console.error("Audio failed to load.", birthdayAudio.error);
    });
    attachFirstGestureStart();
    // Start fireworks when the song finishes
    birthdayAudio.addEventListener("ended", function () {
      try {
        startFireworks();
      } catch (e) {
        console.log("Fireworks failed:", e);
      }
      // Show envelope after fireworks start
      setTimeout(function () {
        if (envelopeOverlay) {
          envelopeOverlay.classList.remove("hidden");
          envelopeOverlay.setAttribute("aria-hidden", "false");
        }
      }, 800);
    });
  }

  function isBlowing() {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    let average = sum / bufferLength;

    return average > 40; //
  }

  function blowOutCandles() {
    let blownOut = 0;

    if (isBlowing()) {
      // increment consecutive detections; setInterval is 200ms, so 3 ≈ 600ms
      blowingConsecutive += 1;
    } else {
      blowingConsecutive = 0;
    }

    if (blowingConsecutive >= 3) {
      candles.forEach(function (candle) {
        if (!candle.classList.contains("out") && Math.random() > 0.5) {
          candle.classList.add("out");
          blownOut++;
        }
      });
      // after attempting to blow out, reduce counter a bit to allow continued blowing
      blowingConsecutive = 2; // keeps requiring sustained blowing
    }

    if (blownOut > 0) {
      updateCandleCount();
    }
  }

  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(function (stream) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        analyser.fftSize = 256;
        setInterval(blowOutCandles, 200);
      })
      .catch(function (err) {
        console.log("Unable to access microphone: " + err);
      });
  } else {
    console.log("getUserMedia not supported on your browser!");
  }

  // Fireworks effect after audio ends
  function startFireworks() {
    const durationMs = 6000;
    const burstEveryMs = 350;
    const gravity = 0.05;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.style.position = "fixed";
    canvas.style.inset = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "2000";
    document.body.appendChild(canvas);

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const particles = [];
    let lastBurst = 0;
    const colors = ["#ff4d6d", "#ffd166", "#06d6a0", "#4cc9f0", "#f72585", "#f77f00"];
    const startTime = performance.now();
    let rafId = 0;

    function addBurst() {
      const cx = Math.random() * canvas.width * 0.8 + canvas.width * 0.1;
      const cy = Math.random() * canvas.height * 0.4 + canvas.height * 0.1;
      const color = colors[(Math.random() * colors.length) | 0];
      const count = (40 + Math.random() * 20) | 0;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
        const speed = 2 + Math.random() * 3;
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: (60 + Math.random() * 20) | 0,
          color,
          size: 2 + Math.random() * 2
        });
      }
    }

    function tick(now) {
      const elapsed = now - startTime;
      if (elapsed - lastBurst > burstEveryMs) {
        addBurst();
        lastBurst = elapsed;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "lighter";
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vy += gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        if (p.life <= 0) {
          particles.splice(i, 1);
        }
      }

      if (elapsed < durationMs || particles.length > 0) {
        rafId = requestAnimationFrame(tick);
      } else {
        cleanup();
      }
    }

    function cleanup() {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }

    rafId = requestAnimationFrame(tick);
  }

  // Envelope and letter interactions
  if (envelopeOverlay && letterModal) {
    envelopeOverlay.addEventListener("click", function () {
      envelopeOverlay.classList.add("hidden");
      envelopeOverlay.setAttribute("aria-hidden", "true");
      letterModal.classList.remove("hidden");
      letterModal.setAttribute("aria-hidden", "false");
    });
    const closeBtn = document.querySelector(".letter-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        letterModal.classList.add("hidden");
        letterModal.setAttribute("aria-hidden", "true");
      });
    }
    letterModal.addEventListener("click", function (e) {
      if (e.target === letterModal) {
        letterModal.classList.add("hidden");
        letterModal.setAttribute("aria-hidden", "true");
      }
    });
  }
});
