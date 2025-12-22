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

// Short display labels for compact views - single letters with checkmark for effective
const SHORT_LABELS: Record<string, string> = {
  'effective_online': '✓',
  'effective_narrow': '✓N',
  'effective_wide': '✓W',
  'short_online': 'S',
  'short_narrow': 'SN',
  'short_wide': 'SW',
  'heavy_online': 'H',
  'heavy_narrow': 'HN',
  'heavy_wide': 'HW',
  // Legacy
  'Effective': '✓',
  'Short': 'S',
  'Heavy': 'H',
  'Short & Narrow': 'SN',
  'Short & Wide': 'SW',
  'Heavy & Narrow': 'HN',
  'Heavy & Wide': 'HW',
  'Narrow': 'N',
  'Wide': 'W',
};

// Get CSS classes for result styling based on zone
export function getResultColorClass(result: string): string {
  const r = result.toLowerCase();
  
  // Effective (center zone) - green
  if (r === 'effective_online' || result === 'Effective') {
    return 'text-green-700 dark:text-green-400';
  }
  
  // Short zones - rose/red tones
  if (r.startsWith('short')) {
    if (r.includes('narrow')) return 'text-rose-700 dark:text-rose-400';
    if (r.includes('wide')) return 'text-rose-600 dark:text-rose-400';
    return 'text-rose-600 dark:text-rose-400';
  }
  
  // Heavy zones - slate/gray tones  
  if (r.startsWith('heavy')) {
    if (r.includes('narrow')) return 'text-slate-700 dark:text-slate-400';
    if (r.includes('wide')) return 'text-slate-600 dark:text-slate-400';
    return 'text-slate-600 dark:text-slate-400';
  }
  
  // Good weight but off-line
  if (r.includes('narrow') || result === 'Narrow') {
    return 'text-blue-700 dark:text-blue-400';
  }
  if (r.includes('wide') || result === 'Wide') {
    return 'text-orange-700 dark:text-orange-400';
  }
  
  return 'text-foreground';
}

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
