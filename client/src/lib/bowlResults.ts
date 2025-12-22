// Canonical bowl result values (database format)
export type BowlResultDB = 
  | 'effective_online'
  | 'effective_narrow'
  | 'effective_wide'
  | 'short_online'
  | 'short_narrow'
  | 'short_wide'
  | 'heavy_online'
  | 'heavy_narrow'
  | 'heavy_wide';

// Display labels for bowl results
const RESULT_LABELS: Record<string, string> = {
  'effective_online': 'Effective',
  'effective_narrow': 'Good Weight & Narrow',
  'effective_wide': 'Good Weight & Wide',
  'short_online': 'Short & On Line',
  'short_narrow': 'Short & Narrow',
  'short_wide': 'Short & Wide',
  'heavy_online': 'Heavy & On Line',
  'heavy_narrow': 'Heavy & Narrow',
  'heavy_wide': 'Heavy & Wide',
  // Legacy format support
  'Effective': 'Effective',
  'Short': 'Short',
  'Heavy': 'Heavy',
  'Short & Narrow': 'Short & Narrow',
  'Short & Wide': 'Short & Wide',
  'Heavy & Narrow': 'Heavy & Narrow',
  'Heavy & Wide': 'Heavy & Wide',
};

// Short display labels for compact views
const SHORT_LABELS: Record<string, string> = {
  'effective_online': 'Eff',
  'effective_narrow': 'Eff/N',
  'effective_wide': 'Eff/W',
  'short_online': 'Shrt',
  'short_narrow': 'S/N',
  'short_wide': 'S/W',
  'heavy_online': 'Hvy',
  'heavy_narrow': 'H/N',
  'heavy_wide': 'H/W',
  // Legacy
  'Effective': 'Eff',
  'Short': 'Shrt',
  'Heavy': 'Hvy',
  'Short & Narrow': 'S/N',
  'Short & Wide': 'S/W',
  'Heavy & Narrow': 'H/N',
  'Heavy & Wide': 'H/W',
};

// Format result for display
export function formatResult(result: string): string {
  return RESULT_LABELS[result] || result;
}

// Format result for compact display
export function formatResultShort(result: string): string {
  return SHORT_LABELS[result] || formatResult(result);
}

// Format hand for display
export function formatHand(hand: string): string {
  const lower = hand.toLowerCase();
  if (lower === 'forehand') return 'Forehand';
  if (lower === 'backhand') return 'Backhand';
  return hand.charAt(0).toUpperCase() + hand.slice(1);
}

// Format hand short
export function formatHandShort(hand: string): string {
  const lower = hand.toLowerCase();
  if (lower === 'forehand') return 'Fore';
  if (lower === 'backhand') return 'Back';
  return hand.slice(0, 4);
}

// Check if bowl is fully effective (good weight AND on line)
export function isEffective(result: string): boolean {
  return result === 'effective_online' || result === 'Effective';
}

// Check if bowl has good weight (effective weight, regardless of line)
export function hasGoodWeight(result: string): boolean {
  return result.startsWith('effective') || result === 'Effective';
}

// Check if bowl is short
export function isShort(result: string): boolean {
  return result.startsWith('short') || result === 'Short' || result.startsWith('Short');
}

// Check if bowl is heavy
export function isHeavy(result: string): boolean {
  return result.startsWith('heavy') || result === 'Heavy' || result.startsWith('Heavy');
}

// Check if bowl is on line (good line, regardless of weight)
export function isOnLine(result: string): boolean {
  return result.endsWith('_online') || result === 'Effective' || 
         result === 'Short' || result === 'Heavy';
}

// Check if bowl is narrow
export function isNarrow(result: string): boolean {
  return result.includes('narrow') || result.includes('Narrow');
}

// Check if bowl is wide
export function isWide(result: string): boolean {
  return result.includes('wide') || result.includes('Wide');
}
