import React, { createContext, useContext, useState, useEffect } from 'react';
import { nanoid } from 'nanoid';

// --- Types ---

export type GameType = 'Practice' | 'Tournament' | 'Pennant';
export type Surface = 'Grass' | 'Plastic' | 'Carpet';
export type Position = 'Lead' | 'Second' | 'Third' | 'Skip';
export type Hand = 'Forehand' | 'Backhand';
export type BowlResult = 
  | 'Short' 
  | 'Heavy' 
  | 'Narrow' 
  | 'Wide' 
  | 'Short & Narrow' 
  | 'Short & Wide' 
  | 'Heavy & Narrow' 
  | 'Heavy & Wide' 
  | 'Effective';

export interface Game {
  id: string;
  opponent: string;
  venue: string;
  surface: Surface;
  rink: string;
  type: GameType;
  totalEnds: number;
  position: Position;
  date: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  ends: End[];
}

export interface End {
  id: string;
  gameId: string;
  endNumber: number;
  jackEffective?: boolean; // Only for Lead
  length: number; // e.g., meters or just a number
  bowls: Bowl[];
  scoreFor: number;
  scoreAgainst: number;
  isDead: boolean;
  isCompleted: boolean;
}

export interface Bowl {
  id: string;
  endId: string;
  bowlNumber: 1 | 2;
  hand: Hand;
  result: BowlResult;
}

interface GameContextType {
  games: Game[];
  activeGameId: string | null;
  createGame: (params: Omit<Game, 'id' | 'date' | 'status' | 'ends'>) => void;
  resumeGame: (id: string) => void;
  finishGame: (id: string) => void;
  addEnd: (gameId: string, endNumber: number) => void;
  updateEnd: (gameId: string, endId: string, updates: Partial<End>) => void;
  addBowl: (gameId: string, endId: string, bowl: Omit<Bowl, 'id' | 'endId'>) => void;
  getActiveGame: () => Game | undefined;
  deleteGame: (id: string) => void;
}

// --- Context ---

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [games, setGames] = useState<Game[]>(() => {
    const saved = localStorage.getItem('pennant_games');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeGameId, setActiveGameId] = useState<string | null>(() => {
     return localStorage.getItem('pennant_active_game_id');
  });

  useEffect(() => {
    localStorage.setItem('pennant_games', JSON.stringify(games));
  }, [games]);

  useEffect(() => {
    if (activeGameId) {
      localStorage.setItem('pennant_active_game_id', activeGameId);
    } else {
      localStorage.removeItem('pennant_active_game_id');
    }
  }, [activeGameId]);

  const createGame = (params: Omit<Game, 'id' | 'date' | 'status' | 'ends'>) => {
    const newGame: Game = {
      ...params,
      id: nanoid(),
      date: new Date().toISOString(),
      status: 'IN_PROGRESS',
      ends: []
    };
    setGames(prev => [newGame, ...prev]);
    setActiveGameId(newGame.id);
  };

  const resumeGame = (id: string) => {
    setActiveGameId(id);
  };

  const finishGame = (id: string) => {
    setGames(prev => prev.map(g => g.id === id ? { ...g, status: 'COMPLETED' } : g));
    if (activeGameId === id) setActiveGameId(null);
  };

  const deleteGame = (id: string) => {
    setGames(prev => prev.filter(g => g.id !== id));
    if (activeGameId === id) setActiveGameId(null);
  };

  const addEnd = (gameId: string, endNumber: number) => {
    setGames(prev => prev.map(g => {
      if (g.id !== gameId) return g;
      // Check if end already exists
      if (g.ends.find(e => e.endNumber === endNumber)) return g;
      
      const newEnd: End = {
        id: nanoid(),
        gameId,
        endNumber,
        length: 21, // Default length
        bowls: [],
        scoreFor: 0,
        scoreAgainst: 0,
        isDead: false,
        isCompleted: false
      };
      return { ...g, ends: [...g.ends, newEnd] };
    }));
  };

  const updateEnd = (gameId: string, endId: string, updates: Partial<End>) => {
    setGames(prev => prev.map(g => {
      if (g.id !== gameId) return g;
      return {
        ...g,
        ends: g.ends.map(e => e.id === endId ? { ...e, ...updates } : e)
      };
    }));
  };

  const addBowl = (gameId: string, endId: string, bowl: Omit<Bowl, 'id' | 'endId'>) => {
    setGames(prev => prev.map(g => {
      if (g.id !== gameId) return g;
      return {
        ...g,
        ends: g.ends.map(e => {
          if (e.id !== endId) return e;
          const existingBowlIndex = e.bowls.findIndex(b => b.bowlNumber === bowl.bowlNumber);
          const newBowl: Bowl = { ...bowl, endId, id: nanoid() };
          
          if (existingBowlIndex >= 0) {
            // Update existing bowl
            const newBowls = [...e.bowls];
            newBowls[existingBowlIndex] = newBowl;
            return { ...e, bowls: newBowls };
          }
          // Add new bowl
          return { ...e, bowls: [...e.bowls, newBowl] };
        })
      };
    }));
  };

  const getActiveGame = () => games.find(g => g.id === activeGameId);

  return (
    <GameContext.Provider value={{ 
      games, 
      activeGameId, 
      createGame, 
      resumeGame, 
      finishGame, 
      addEnd, 
      updateEnd, 
      addBowl,
      getActiveGame,
      deleteGame
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGameStore() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGameStore must be used within a GameProvider');
  return context;
}
