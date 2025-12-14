import type { Game, End, Bowl, InsertGame, InsertEnd, InsertBowl } from '@shared/schema';

const API_BASE = '/api';

export interface GameWithDetails extends Game {
  ends: (End & { bowls: Bowl[] })[];
}

// Games
export async function createGame(game: InsertGame): Promise<Game> {
  const res = await fetch(`${API_BASE}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(game),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getGames(): Promise<Game[]> {
  const res = await fetch(`${API_BASE}/games`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getGame(id: string): Promise<Game> {
  const res = await fetch(`${API_BASE}/games/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getGameFull(id: string): Promise<GameWithDetails> {
  const res = await fetch(`${API_BASE}/games/${id}/full`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getGamesFull(): Promise<GameWithDetails[]> {
  const res = await fetch(`${API_BASE}/games/full`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateGame(id: string, updates: Partial<InsertGame>): Promise<Game> {
  const res = await fetch(`${API_BASE}/games/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteGame(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/games/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
}

// Ends
export async function createEnd(end: InsertEnd): Promise<End> {
  const res = await fetch(`${API_BASE}/ends`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(end),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getEndsByGame(gameId: string): Promise<End[]> {
  const res = await fetch(`${API_BASE}/games/${gameId}/ends`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateEnd(id: string, updates: Partial<InsertEnd>): Promise<End> {
  const res = await fetch(`${API_BASE}/ends/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Bowls
export async function createBowl(bowl: InsertBowl): Promise<Bowl> {
  const res = await fetch(`${API_BASE}/bowls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bowl),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getBowlsByEnd(endId: string): Promise<Bowl[]> {
  const res = await fetch(`${API_BASE}/ends/${endId}/bowls`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateBowl(id: string, updates: Partial<InsertBowl>): Promise<Bowl> {
  const res = await fetch(`${API_BASE}/bowls/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
