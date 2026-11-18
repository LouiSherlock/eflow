(() => {
  const root = document.documentElement;
  if (!window.location.hash.startsWith("#/reader/")) return;

  try {
    const stored = JSON.parse(
      localStorage.getItem("eflow-reader-settings-v1") ?? "{}",
    );
    const settings =
      typeof stored === "object" && stored !== null && !Array.isArray(stored)
        ? stored
        : {};
    const clamp = (value, fallback) =>
      typeof value === "number" && Number.isFinite(value)
        ? Math.min(1, Math.max(0, value))
        : fallback;
    const level = clamp(settings.level, 1);
    const warm = clamp(settings.warm, 0);
    const followSystem =
      typeof settings.followSystem === "boolean" ? settings.followSystem : true;

    root.dataset.eyeCareActive = "true";
    root.dataset.eyeCareWarm = String(warm > 0);
    root.dataset.eyeCareDim = String(!followSystem && level ** 2 < 0.2);
    root.style.setProperty(
      "--eye-care-dim-opacity",
      String(!followSystem && level ** 2 < 0.2
        ? (1 - level ** 2 / 0.2) * 0.75
        : 0),
    );

    const temperature = (6500 - warm * 3100) / 100;
    const red =
      temperature <= 66
        ? 255
        : 329.698727446 * Math.pow(temperature - 60, -0.1332047592);
    const green =
      temperature <= 66
        ? 99.4708025861 * Math.log(temperature) - 161.1195681661
        : 288.1221695283 * Math.pow(temperature - 60, -0.0755148492);
    const blue =
      temperature >= 66
        ? 255
        : temperature <= 19
          ? 0
          : 138.5177312231 * Math.log(temperature - 10) - 305.0447927307;
    const byte = (value) => Math.round(Math.min(255, Math.max(0, value)));
    root.style.setProperty(
      "--eye-care-warm-color",
      `rgb(${byte(red)}, ${byte(green)}, ${byte(blue)})`,
    );
  } catch (error) {
    console.warn("Could not restore reading comfort settings:", error);
  }
})();
