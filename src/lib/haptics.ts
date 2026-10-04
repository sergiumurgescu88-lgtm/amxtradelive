/**
 * Haptic Feedback Utility
 * Trigger a short vibration if supported by the device.
 */
export function triggerHaptic(duration = 10) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(duration);
    } catch (e) {
      // Ignore vibration errors
    }
  }
}
