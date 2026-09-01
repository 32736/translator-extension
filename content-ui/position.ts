export interface FixedPosition {
  left: number;
  top: number;
}

const TRIGGER_SIZE = 28;
const POSITION_GAP = 8;
const VIEWPORT_PADDING = 8;

export function getTriggerPosition(rect: DOMRect): FixedPosition {
  let left = rect.right + POSITION_GAP;
  let top = rect.bottom + POSITION_GAP;

  if (left + TRIGGER_SIZE > window.innerWidth - VIEWPORT_PADDING) {
    left = rect.right - TRIGGER_SIZE;
  }

  if (top + TRIGGER_SIZE > window.innerHeight - VIEWPORT_PADDING) {
    top = rect.top - TRIGGER_SIZE - POSITION_GAP;
  }

  return {
    left: Math.max(VIEWPORT_PADDING, left),
    top: Math.max(VIEWPORT_PADDING, top),
  };
}
