const screens = [...document.querySelectorAll(".screen")];
const nextButtons = document.querySelectorAll("[data-next]");
const choiceCards = document.querySelectorAll("[data-choice]");
const selectedPlan = document.querySelector("#selectedPlan");
const noButton = document.querySelector("#noBtn");

let lastDodgeAt = 0;

function showScreen(name) {
  screens.forEach((screen) => {
    const isActive = screen.dataset.screen === name;
    screen.hidden = !isActive;
    screen.classList.toggle("is-active", isActive);
  });

  if (name !== "intro") {
    resetNoButton();
  }
}

nextButtons.forEach((button) => {
  button.addEventListener("click", () => showScreen(button.dataset.next));
});

choiceCards.forEach((card) => {
  card.addEventListener("click", () => {
    selectedPlan.textContent = card.dataset.choice;
    showScreen("final");
  });
});

function resetNoButton() {
  noButton.classList.remove("is-running");
  noButton.style.left = "";
  noButton.style.top = "";
  noButton.style.transform = "";
}

function getViewport() {
  const viewport = window.visualViewport;

  return {
    width: viewport?.width || window.innerWidth,
    height: viewport?.height || window.innerHeight,
    offsetLeft: viewport?.offsetLeft || 0,
    offsetTop: viewport?.offsetTop || 0,
  };
}

function getSafeInset(name) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name);
  return Number.parseFloat(value) || 0;
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function getEventPoint(event) {
  const touch = event.touches?.[0] || event.changedTouches?.[0];

  if (touch) {
    return { x: touch.clientX, y: touch.clientY };
  }

  if (typeof event.clientX === "number") {
    return { x: event.clientX, y: event.clientY };
  }

  return null;
}

function pickButtonPosition(buttonRect, point) {
  const viewport = getViewport();
  const bounds = getButtonBounds(buttonRect, viewport);

  if (bounds.maxX <= bounds.minX || bounds.maxY <= bounds.minY) {
    return { x: bounds.fallbackX, y: bounds.fallbackY };
  }

  let best = { x: bounds.fallbackX, y: bounds.fallbackY };
  let bestDistance = -1;

  // Несколько попыток нужны, чтобы кнопка не перепрыгивала прямо под палец.
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = {
      x: randomBetween(bounds.minX, bounds.maxX),
      y: randomBetween(bounds.minY, bounds.maxY),
    };

    if (!point) {
      return candidate;
    }

    const centerX = candidate.x + buttonRect.width / 2;
    const centerY = candidate.y + buttonRect.height / 2;
    const distance = Math.hypot(centerX - point.x, centerY - point.y);

    if (distance > bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }

  return best;
}

function getButtonBounds(buttonRect, viewport = getViewport()) {
  const safeTop = getSafeInset("--safe-top");
  const safeBottom = getSafeInset("--safe-bottom");
  const safeLeft = getSafeInset("--safe-left");
  const safeRight = getSafeInset("--safe-right");
  const gap = 16;
  const minX = viewport.offsetLeft + gap + safeLeft;
  const minY = viewport.offsetTop + gap + safeTop;
  const maxX = viewport.offsetLeft + viewport.width - buttonRect.width - gap - safeRight;
  const maxY = viewport.offsetTop + viewport.height - buttonRect.height - gap - safeBottom;
  const fallbackX = Math.max(minX, viewport.offsetLeft + (viewport.width - buttonRect.width) / 2);
  const fallbackY = Math.max(minY, viewport.offsetTop + (viewport.height - buttonRect.height) / 2);

  return { minX, minY, maxX, maxY, fallbackX, fallbackY };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function dodgeNoButton(event) {
  const now = Date.now();

  if (now - lastDodgeAt < 90) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  lastDodgeAt = now;
  event.preventDefault();
  event.stopPropagation();

  const buttonRect = noButton.getBoundingClientRect();
  const point = getEventPoint(event);
  const position = pickButtonPosition(buttonRect, point);
  const tilt = randomBetween(-8, 8).toFixed(2);

  noButton.classList.add("is-running");
  noButton.style.left = `${position.x}px`;
  noButton.style.top = `${position.y}px`;
  noButton.style.transform = `rotate(${tilt}deg)`;
}

function keepNoButtonInsideViewport() {
  if (!noButton.classList.contains("is-running")) {
    return;
  }

  const rect = noButton.getBoundingClientRect();
  const bounds = getButtonBounds(rect);
  const currentLeft = Number.parseFloat(noButton.style.left) || rect.left;
  const currentTop = Number.parseFloat(noButton.style.top) || rect.top;
  const position =
    bounds.maxX <= bounds.minX || bounds.maxY <= bounds.minY
      ? { x: bounds.fallbackX, y: bounds.fallbackY }
      : {
          x: clamp(currentLeft, bounds.minX, bounds.maxX),
          y: clamp(currentTop, bounds.minY, bounds.maxY),
        };

  noButton.style.left = `${position.x}px`;
  noButton.style.top = `${position.y}px`;
}

noButton.addEventListener("mouseenter", dodgeNoButton);
noButton.addEventListener("focus", dodgeNoButton);
noButton.addEventListener("click", dodgeNoButton);
noButton.addEventListener("pointerdown", dodgeNoButton, { passive: false });
noButton.addEventListener("touchstart", dodgeNoButton, { passive: false });

window.addEventListener("resize", keepNoButtonInsideViewport);
window.visualViewport?.addEventListener("resize", keepNoButtonInsideViewport);
