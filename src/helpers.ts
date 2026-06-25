import { mixColor } from "alt1";

export const alt1 = typeof window !== "undefined" ? (window as any).alt1 : undefined;

export const displayDetectionMessage = (
  message: string,
  duration = 1500,
  size = 36
) => {
  if (!alt1) {
    return;
  }

  alt1.overLayClearGroup("1");
  alt1.overLaySetGroup("1");
  alt1.overLayTextEx(
    message,
    mixColor(220, 30, 30),
    size,
    Math.round(alt1.rsWidth / 2),
    Math.round(alt1.rsHeight / 4),
    duration,
    "serif",
    true,
    true
  );
};

export function playSound(name: string) {
  try {
    const audio = new Audio(`/resources/${name}.mp3`);
    audio.volume = 1.0;
    audio.play().catch((err) => {
      console.warn("playSound error", err);
    });
  } catch (e) {
    console.warn("playSound setup error", e);
  }
}
