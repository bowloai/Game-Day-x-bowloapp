import { db } from "../server/db";
import { games, ends, bowls, users } from "../shared/schema";
import { eq } from "drizzle-orm";

const VENUES = ["Glenelg Bowling Club", "Brighton BC", "Port Adelaide BC", "West Torrens BC", "Henley BC"];
const SURFACES = ["grass", "synthetic"];
const OPPONENTS = ["Glenelg Gold", "Brighton Blue", "Port Pirates", "West Wolves", "Henley Hawks", "Seacliff SC", "Marino BC", "Somerton BC", "Holdfast BC", "Novar BC"];
const POSITIONS = ["Lead", "Second", "Third", "Skip"];
const LENGTHS = ["short", "medium", "long"];
const HANDS = ["forehand", "backhand"];

const GAME_CONFIGS = [
  { type: "pennant", format: "fours", bowlsPerEnd: 2, totalEnds: 21 },
  { type: "pennant", format: "fours", bowlsPerEnd: 2, totalEnds: 21 },
  { type: "pennant", format: "fours", bowlsPerEnd: 2, totalEnds: 21 },
  { type: "social", format: "pairs", bowlsPerEnd: 4, totalEnds: 15 },
  { type: "social", format: "pairs", bowlsPerEnd: 4, totalEnds: 18 },
  { type: "tournament", format: "triples", bowlsPerEnd: 3, totalEnds: 18 },
  { type: "tournament", format: "singles", bowlsPerEnd: 4, totalEnds: 21 },
  { type: "practice", format: "singles", bowlsPerEnd: 4, totalEnds: 10 },
  { type: "practice", format: "pairs", bowlsPerEnd: 4, totalEnds: 12 },
  { type: "pennant", format: "fours", bowlsPerEnd: 2, totalEnds: 21 },
];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateBowlResult(): { gridRow: number; gridCol: number; result: string } {
  // Bias towards effective bowls (~50% should land in effective zone)
  const isEffective = Math.random() < 0.52; // 52% chance of effective bowl
  
  let gridRow: number;
  let gridCol: number;
  
  if (isEffective) {
    // Land in effective zone (center 3x3)
    gridRow = randomInt(3, 5);
    gridCol = randomInt(3, 5);
  } else {
    // Land outside effective zone with realistic distribution
    const zone = Math.random();
    if (zone < 0.35) {
      // Short (rows 0-2)
      gridRow = randomInt(0, 2);
      gridCol = randomInt(0, 8);
    } else if (zone < 0.65) {
      // Heavy (rows 6-8)
      gridRow = randomInt(6, 8);
      gridCol = randomInt(0, 8);
    } else if (zone < 0.82) {
      // Narrow (cols 0-2, effective weight)
      gridRow = randomInt(3, 5);
      gridCol = randomInt(0, 2);
    } else {
      // Wide (cols 6-8, effective weight)
      gridRow = randomInt(3, 5);
      gridCol = randomInt(6, 8);
    }
  }
  
  const centerRow = 4;
  const centerCol = 4;
  const rowDist = Math.abs(gridRow - centerRow);
  const colDist = Math.abs(gridCol - centerCol);
  
  let weightResult: string;
  if (rowDist <= 1) weightResult = "effective";
  else if (gridRow < centerRow) weightResult = "short";
  else weightResult = "heavy";
  
  let lineResult: string;
  if (colDist <= 1) lineResult = "online";
  else if (gridCol < centerCol) lineResult = "narrow";
  else lineResult = "wide";
  
  const result = `${weightResult}_${lineResult}`;
  return { gridRow, gridCol, result };
}

function calculateDistances(gridRow: number, gridCol: number): { weight: number; line: number; total: number } {
  const centerRow = 4;
  const centerCol = 4;
  const weight = (gridRow - centerRow) * 1.0;
  const line = (gridCol - centerCol) * 1.0;
  const total = Math.sqrt(weight * weight + line * line);
  return { weight, line, total };
}

async function seedData() {
  console.log("Starting seed process...");
  
  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length === 0) {
    console.log("No users found. Please sign in first to create a user.");
    process.exit(1);
  }
  
  const userId = existingUsers[0].id;
  console.log(`Using user ID: ${userId}`);
  
  const existingGames = await db.select().from(games).where(eq(games.userId, userId));
  if (existingGames.length > 0) {
    console.log(`Found ${existingGames.length} existing games. Deleting...`);
    for (const game of existingGames) {
      await db.delete(games).where(eq(games.id, game.id));
    }
  }
  
  console.log("Creating 10 sample games...");
  
  for (let i = 0; i < 10; i++) {
    const config = GAME_CONFIGS[i];
    const daysAgo = randomInt(1, 90);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);
    
    const isCompleted = i < 8;
    const endsToPlay = isCompleted ? config.totalEnds : randomInt(5, config.totalEnds - 3);
    
    const [newGame] = await db.insert(games).values({
      userId,
      opponent: randomChoice(OPPONENTS),
      venue: randomChoice(VENUES),
      surface: randomChoice(SURFACES),
      rink: `Rink ${randomInt(1, 8)}`,
      type: config.type,
      gameFormat: config.format,
      bowlsPerEnd: config.bowlsPerEnd,
      totalEnds: config.totalEnds,
      gameEndType: "ends",
      position: randomChoice(POSITIONS),
      status: isCompleted ? "COMPLETED" : "IN_PROGRESS",
      greenSpeed: randomInt(12, 18),
      greenComparable: randomChoice(["faster", "similar", "slower"]),
      mentalFeeling: randomChoice(["great", "good", "neutral", "tired"]),
      performanceRating: isCompleted ? randomInt(3, 5) : undefined,
      ourMat: Math.random() > 0.5,
    }).returning();
    
    console.log(`  Created game ${i + 1}: ${newGame.type} vs ${newGame.opponent}`);
    
    let totalScoreFor = 0;
    let totalScoreAgainst = 0;
    
    for (let endNum = 1; endNum <= endsToPlay; endNum++) {
      const isDead = Math.random() < 0.05;
      const jackEffective = !isDead && Math.random() > 0.3;
      const scoreFor = isDead ? 0 : randomInt(0, 4);
      const scoreAgainst = isDead || scoreFor > 0 ? (isDead ? 0 : 0) : randomInt(0, 4);
      
      totalScoreFor += scoreFor;
      totalScoreAgainst += scoreAgainst;
      
      const [newEnd] = await db.insert(ends).values({
        gameId: newGame.id,
        endNumber: endNum,
        length: randomChoice(LENGTHS),
        jackEffective,
        scoreFor,
        scoreAgainst,
        isDead,
        isCompleted: endNum < endsToPlay || isCompleted,
      }).returning();
      
      const bowlsThisEnd = config.bowlsPerEnd;
      for (let bowlNum = 1; bowlNum <= bowlsThisEnd; bowlNum++) {
        const { gridRow, gridCol, result } = generateBowlResult();
        const distances = calculateDistances(gridRow, gridCol);
        
        await db.insert(bowls).values({
          endId: newEnd.id,
          bowlNumber: bowlNum,
          hand: randomChoice(HANDS),
          result,
          gridRow,
          gridCol,
          weightDistanceFeet: distances.weight,
          lineDistanceFeet: distances.line,
          totalDistanceFeet: distances.total,
          locationSource: "grid",
        });
      }
    }
    
    console.log(`    - ${endsToPlay} ends, Score: ${totalScoreFor}-${totalScoreAgainst}`);
  }
  
  console.log("\nSeed completed successfully!");
  process.exit(0);
}

seedData().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
