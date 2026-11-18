import { hasNativeSystemBars, setWindowBrightness } from "./system-bars";

export type EyeCareSettings = {
  level: number;
  followSystem: boolean;
  warm: number;
};

const SPLIT = 0.2;

function clampByte(value: number): number {
  return Math.round(Math.min(255, Math.max(0, value)));
}

function kelvinToRgb(kelvin: number): [number, number, number] {
  const temperature = kelvin / 100;
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
  return [clampByte(red), clampByte(green), clampByte(blue)];
}

function setLayerState(settings: EyeCareSettings): number | null {
  const root = document.documentElement;
  const warm = Math.min(1, Math.max(0, settings.warm));
  const [red, green, blue] = kelvinToRgb(6500 - warm * 3100);

  root.dataset.eyeCareActive = "true";
  root.dataset.eyeCareWarm = String(warm > 0);
  root.style.setProperty(
    "--eye-care-warm-color",
    `rgb(${red}, ${green}, ${blue})`,
  );

  let nativeBrightness: number | null = null;
  let dimAlpha = 0;
  if (!settings.followSystem) {
    const level = Math.min(1, Math.max(0, settings.level));
    const curve = level ** 2;
    if (curve >= SPLIT) {
      nativeBrightness = 0.02 + ((curve - SPLIT) / (1 - SPLIT)) * 0.98;
    } else {
      nativeBrightness = 0.02;
      dimAlpha = (1 - curve / SPLIT) * 0.75;
    }
  }

  root.dataset.eyeCareDim = String(dimAlpha > 0);
  root.style.setProperty("--eye-care-dim-opacity", String(dimAlpha));
  return nativeBrightness;
}

/** Applies page-wide warmth and dimming, plus Android app-window brightness. */
export async function applyEyeCare(settings: EyeCareSettings): Promise<void> {
  const brightness = setLayerState(settings);
  if (hasNativeSystemBars()) {
    await setWindowBrightness(brightness);
  }
}

/** Removes the page overlays and returns Android brightness to system control. */
export async function clearEyeCare(): Promise<void> {
  const root = document.documentElement;
  root.dataset.eyeCareActive = "false";
  root.dataset.eyeCareWarm = "false";
  root.dataset.eyeCareDim = "false";
  root.style.removeProperty("--eye-care-warm-color");
  root.style.removeProperty("--eye-care-dim-opacity");
  if (hasNativeSystemBars()) {
    await setWindowBrightness(null);
  }
}
