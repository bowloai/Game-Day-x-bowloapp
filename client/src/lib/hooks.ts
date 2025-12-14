import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { InsertGame, InsertEnd, InsertBowl } from '@shared/schema';

// Games
export function useGames() {
  return useQuery({
    queryKey: ['games'],
    queryFn: api.getGames,
  });
}

export function useGame(id: string | undefined) {
  return useQuery({
    queryKey: ['games', id],
    queryFn: () => api.getGame(id!),
    enabled: !!id,
  });
}

export function useGameFull(id: string | undefined) {
  return useQuery({
    queryKey: ['games', id, 'full'],
    queryFn: () => api.getGameFull(id!),
    enabled: !!id,
  });
}

export function useGamesFull() {
  return useQuery({
    queryKey: ['games', 'full'],
    queryFn: api.getGamesFull,
  });
}

function invalidateAllGameQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['games'] });
}

export function useCreateGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (game: InsertGame) => api.createGame(game),
    onSuccess: () => {
      invalidateAllGameQueries(queryClient);
    },
  });
}

export function useDeleteGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteGame(id),
    onSuccess: () => {
      invalidateAllGameQueries(queryClient);
    },
  });
}

export function useUpdateGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<InsertGame> }) => 
      api.updateGame(id, updates),
    onSuccess: () => {
      invalidateAllGameQueries(queryClient);
    },
  });
}

// Ends
export function useCreateEnd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (end: InsertEnd) => api.createEnd(end),
    onSuccess: () => {
      invalidateAllGameQueries(queryClient);
    },
  });
}

export function useUpdateEnd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, gameId, updates }: { id: string; gameId: string; updates: Partial<InsertEnd> }) => 
      api.updateEnd(id, updates),
    onSuccess: () => {
      invalidateAllGameQueries(queryClient);
    },
  });
}

// Bowls
export function useCreateBowl() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bowl, gameId }: { bowl: InsertBowl; gameId: string }) => 
      api.createBowl(bowl),
    onSuccess: () => {
      invalidateAllGameQueries(queryClient);
    },
  });
}

export function useUpdateBowl() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, gameId, updates }: { id: string; gameId: string; updates: Partial<InsertBowl> }) => 
      api.updateBowl(id, updates),
    onSuccess: () => {
      invalidateAllGameQueries(queryClient);
    },
  });
}
