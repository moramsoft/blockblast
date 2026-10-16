import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

class HapticManager {
  private isSupported: boolean = true;

  constructor() {
    // Check if running in a browser that doesn't support anything
    if (typeof window === 'undefined') {
      this.isSupported = false;
    }
  }

  // Light tick for picking up a piece or hovering
  public async tick() {
    if (!this.isSupported) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      if (navigator.vibrate) {
        navigator.vibrate(15);
      }
    }
  }

  // Medium impact when placing a piece
  public async place() {
    if (!this.isSupported) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      if (navigator.vibrate) {
        navigator.vibrate(25);
      }
    }
  }

  // Heavy impact when a line clears
  public async lineClear() {
    if (!this.isSupported) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch {
      if (navigator.vibrate) {
        navigator.vibrate([35, 20, 45]);
      }
    }
  }

  // Escalating vibration pattern for combos
  public async combo(level: number) {
    if (!this.isSupported) return;
    try {
      if (level >= 4) {
        await Haptics.notification({ type: NotificationType.Success });
      } else {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      }
    } catch {
      if (navigator.vibrate) {
        navigator.vibrate([30, 20, 30, 20, 60]);
      }
    }
  }

  // Warning buzz on game over
  public async gameOver() {
    if (!this.isSupported) return;
    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch {
      if (navigator.vibrate) {
        navigator.vibrate([80, 50, 120]);
      }
    }
  }
}

export const haptics = new HapticManager();
