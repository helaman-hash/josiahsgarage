

// app.js (Part 1)

(function () {
  "use strict";

  const VEHICLES = [
    "images/car.png",
    "images/car-red-pickup.png",
    "images/car-yellow-van.png",
    "images/car-green-jeep.png",
    "images/car-purple-racer.png",
    "images/car-none.png"
  ];

  const SETTINGS_KEY = "garage-door-settings-v1";

  const door = document.getElementById("garageDoor");
  const garageVehicle = document.getElementById("garageVehicle");
  const scene = document.querySelector(".scene");
  const openButton = document.getElementById("openButton");
  const closeButton = document.getElementById("closeButton");
  const upSign = document.getElementById("upSign");
  const downSign = document.getElementById("downSign");
  const settingsHotspot = document.getElementById("settingsHotspot");
  const settingsDialog = document.getElementById("settingsDialog");
  const settingsDone = document.getElementById("settingsDone");
  const travelTime = document.getElementById("travelTime");
  const travelTimeValue = document.getElementById("travelTimeValue");
  const soundToggle = document.getElementById("soundToggle");
  const vibrationToggle = document.getElementById("vibrationToggle");
  const shuffleToggle = document.getElementById("shuffleToggle");

  const audio = {
    start: new Audio("sounds/motor-start.mp3"),
    loop: new Audio("sounds/motor-loop.mp3"),
    stop: new Audio("sounds/motor-stop.mp3"),
    thunk: new Audio("sounds/thunk.mp3")
  };

  audio.loop.loop = true;
  Object.values(audio).forEach((sound) => {
    sound.preload = "auto";
  });

  let state = "closed";
  let movementTimer = 0;
  let vibrationTimer = 0;
  let pitchTimer = 0;
  let holdTimer = 0;
  let currentVehicleIndex = 0;

  VEHICLES.forEach((source) => {
    const image = new Image();
    image.src = source;
  });

  const settings = loadSettings();
  applySettings();
  updateControls();

  // ==========================================================
  // INSTANT RESPONSE FOR LITTLE FINGERS
  // ==========================================================

  openButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();

    if (openButton.disabled) return;

    openButton.classList.add("is-pressed");
    moveDoor("opening");
  });

  closeButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();

    if (closeButton.disabled) return;

    closeButton.classList.add("is-pressed");
    moveDoor("closing");
  });

  [openButton, closeButton].forEach((button) => {
    ["pointerup", "pointercancel", "pointerleave"].forEach((eventName) => {
      button.addEventListener(eventName, () => {
        button.classList.remove("is-pressed");
      });
    });
  });

  function moveDoor(direction) {
    if (
      (direction === "opening" && state !== "closed") ||
      (direction === "closing" && state !== "open")
    ) {
      return;
    }

    if (direction === "opening") {
      chooseVehicle();
    }

    state = direction;
    updateControls();
    startSensory();

    // START THE DOOR IMMEDIATELY
    door.classList.toggle("is-open", direction === "opening");

    window.clearTimeout(movementTimer);
    movementTimer = window.setTimeout(
      finishMovement,
      settings.travelTime * 1000 + 80
    );
  }

  function chooseVehicle() {
    if (!settings.shuffleVehicles) {
      currentVehicleIndex = 0;
      garageVehicle.src = VEHICLES[0];
      return;
    }

    let nextIndex = currentVehicleIndex;

    while (nextIndex === currentVehicleIndex) {
      nextIndex = Math.floor(Math.random() * VEHICLES.length);
    }

    currentVehicleIndex = nextIndex;
    garageVehicle.src = VEHICLES[currentVehicleIndex];
  }

  function finishMovement() {
    state = state === "opening" ? "open" : "closed";
    stopSensory(true);
    updateControls();
  }

  function updateControls() {
    const moving = state === "opening" || state === "closing";

    openButton.disabled = state !== "closed";
    closeButton.disabled = state !== "open";

    const words = moving
      ? state === "opening"
        ? "opening"
        : "closing"
      : state;

    scene.setAttribute(
      "aria-label",
      `Garage door is ${words}`
    );
  }

  function play(sound) {
    sound.currentTime = 0;
    const promise = sound.play();

    if (promise) {
      promise.catch(() => {});
    }
  }

  function startSensory() {
    if (settings.sound) {
      audio.loop.pause();
      audio.loop.playbackRate = state === "opening" ? 1 : 0.96;

      play(audio.start);

      window.setTimeout(() => {
        if (state !== "opening" && state !== "closing") return;
        play(audio.loop);
      }, 430);

      let pitchStep = 0;

      window.clearInterval(pitchTimer);

      pitchTimer = window.setInterval(() => {
        pitchStep += 1;

        const base = state === "opening" ? 1 : 0.96;

        audio.loop.playbackRate =
          base + Math.sin(pitchStep / 3) * 0.025;
      }, 450);
    }

    if (settings.vibration && "vibrate" in navigator) {
      navigator.vibrate(90);

      window.clearInterval(vibrationTimer);

      vibrationTimer = window.setInterval(() => {
        navigator.vibrate(90);
      }, 125);
    }
  }
  
  function stopSensory(withThunk) {
    window.clearInterval(pitchTimer);
    audio.loop.pause();
    audio.loop.currentTime = 0;

    if (settings.sound) {
      play(audio.stop);
      if (withThunk) window.setTimeout(() => play(audio.thunk), 190);
    }

    window.clearInterval(vibrationTimer);
    if ("vibrate" in navigator) {
      navigator.vibrate(0);
      if (withThunk && settings.vibration) navigator.vibrate([120, 80, 120]);
    }
  }

  function beginSettingsHold(event) {
    if (event.type === "pointerdown") settingsHotspot.setPointerCapture?.(event.pointerId);
    window.clearTimeout(holdTimer);
    holdTimer = window.setTimeout(openSettings, 5000);
  }

  function cancelSettingsHold() {
    window.clearTimeout(holdTimer);
  }

  settingsHotspot.addEventListener("pointerdown", beginSettingsHold);
  ["pointerup", "pointercancel", "pointerleave"].forEach((eventName) => {
    settingsHotspot.addEventListener(eventName, cancelSettingsHold);
  });

  function openSettings() {
    if (state === "opening" || state === "closing") return;
    settingsDialog.hidden = false;
    settingsDone.focus();
  }

  function closeSettings() {
    settings.travelTime = Number(travelTime.value);
    settings.sound = soundToggle.checked;
    settings.vibration = vibrationToggle.checked;
    settings.shuffleVehicles = shuffleToggle.checked;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    applySettings();
    settingsDialog.hidden = true;
    settingsHotspot.focus({ preventScroll: true });
  }

  travelTime.addEventListener("input", () => {
    travelTimeValue.textContent = `${travelTime.value} seconds`;
  });
  settingsDone.addEventListener("click", closeSettings);
  settingsDialog.addEventListener("click", (event) => {
    if (event.target === settingsDialog) closeSettings();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !settingsDialog.hidden) closeSettings();
  });

  function loadSettings() {
    const defaults = { travelTime: 10, sound: true, vibration: true, shuffleVehicles: true };
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
      return {
        travelTime: Math.min(25, Math.max(3, Number(saved?.travelTime) || defaults.travelTime)),
        sound: saved?.sound ?? defaults.sound,
        vibration: saved?.vibration ?? defaults.vibration,
        shuffleVehicles: saved?.shuffleVehicles ?? defaults.shuffleVehicles
      };
    } catch (_) {
      return defaults;
    }
  }

  function applySettings() {
    document.documentElement.style.setProperty("--door-duration", `${settings.travelTime}s`);
    travelTime.value = String(settings.travelTime);
    travelTimeValue.textContent = `${settings.travelTime} seconds`;
    soundToggle.checked = settings.sound;
    vibrationToggle.checked = settings.vibration;
    shuffleToggle.checked = settings.shuffleVehicles;
  }

  document.addEventListener("gesturestart", (event) => event.preventDefault());
  document.addEventListener("contextmenu", (event) => event.preventDefault());

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    });
  }
}());
