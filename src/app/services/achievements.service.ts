import { Injectable, signal, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GameDifficulty, IGameStats } from '../types/game.types';
import { NotificationService } from '../service/notification.service';
import { ErrorHandlerService } from './error-handler.service';
import { ConfigService } from './config.service';
import { GameStateManagerService } from './game-state-manager.service';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (stats: GameStats) => boolean;
  points: number;
  category: AchievementCategory;
  unlockedAt?: Date;
}

export interface GameStats {
  totalGamesPlayed: number;
  totalGamesWon: number;
  totalAttempts: number;
  bestAttempts: { [deckSize: number]: number };
  bestTimes: { [deckSize: number]: number };
  perfectGames: number; // Won in minimum attempts
  streaks: {
    currentWinStreak: number;
    longestWinStreak: number;
  };
  difficultyStats: {
    [key in GameDifficulty]: {
      gamesPlayed: number;
      gamesWon: number;
      averageAttempts: number;
    };
  };
  timeStats: {
    totalPlayTime: number;
    averageGameTime: number;
  };
  deckSizeStats: {
    [deckSize: number]: {
      gamesPlayed: number;
      gamesWon: number;
      averageAttempts: number;
    };
  };
}

export enum AchievementCategory {
  BEGINNER = 'beginner',
  SKILL = 'skill',
  SPEED = 'speed',
  PERSISTENCE = 'persistence',
  MASTERY = 'mastery',
  SPECIAL = 'special'
}

@Injectable({
  providedIn: 'root'
})
export class AchievementsService {
  private readonly _gameStats = signal<GameStats>(this.getDefaultStats());
  private readonly _unlockedAchievements = signal<Achievement[]>([]);

  public readonly gameStats = this._gameStats.asReadonly();
  public readonly unlockedAchievements = this._unlockedAchievements.asReadonly();

  // Computed achievement progress
  public readonly totalAchievements = computed(() => this.achievements.length);
  public readonly unlockedCount = computed(() => this._unlockedAchievements().length);
  public readonly achievementProgress = computed(() => (this.unlockedCount() / this.totalAchievements()) * 100);

  public readonly totalAchievementPoints = computed(() =>
    this._unlockedAchievements().reduce((sum, achievement) => sum + achievement.points, 0)
  );

  // Achievement definitions
  private readonly achievements: Achievement[] = [
    // Beginner achievements
    {
      id: 'first_game',
      name: 'First Steps',
      description: 'Complete your first game',
      icon: '🎮',
      condition: stats => stats.totalGamesWon >= 1,
      points: 10,
      category: AchievementCategory.BEGINNER
    },
    {
      id: 'first_perfect',
      name: 'Flawless Victory',
      description: 'Win a game in minimum attempts',
      icon: '⭐',
      condition: stats => stats.perfectGames >= 1,
      points: 25,
      category: AchievementCategory.SKILL
    },
    {
      id: 'win_streak_5',
      name: 'On Fire',
      description: 'Win 5 games in a row',
      icon: '🔥',
      condition: stats => stats.streaks.longestWinStreak >= 5,
      points: 50,
      category: AchievementCategory.SKILL
    },

    // Skill achievements
    {
      id: 'master_small',
      name: 'Small Deck Master',
      description: 'Win 10 games with 6 cards or fewer',
      icon: '🃏',
      condition: (stats): boolean => {
        return [2, 4, 6].reduce((sum, size) => sum + (stats.deckSizeStats[size]?.gamesWon || 0), 0) >= 10;
      },
      points: 30,
      category: AchievementCategory.SKILL
    },
    {
      id: 'master_large',
      name: 'Large Deck Champion',
      description: 'Win 10 games with 16 cards or more',
      icon: '👑',
      condition: (stats): boolean => {
        return [16, 18, 20].reduce((sum, size) => sum + (stats.deckSizeStats[size]?.gamesWon || 0), 0) >= 10;
      },
      points: 50,
      category: AchievementCategory.SKILL
    },
    {
      id: 'difficulty_master',
      name: 'Difficulty Master',
      description: 'Win at least 5 games on each difficulty',
      icon: '🎯',
      condition: (stats): boolean => {
        return Object.values(GameDifficulty).every(diff => stats.difficultyStats[diff].gamesWon >= 5);
      },
      points: 100,
      category: AchievementCategory.MASTERY
    },

    // Speed achievements
    {
      id: 'speed_demon',
      name: 'Speed Demon',
      description: 'Complete a game in under 30 seconds',
      icon: '⚡',
      condition: stats => Object.values(stats.bestTimes).some(time => time < 30000),
      points: 75,
      category: AchievementCategory.SPEED
    },
    {
      id: 'lightning_fast',
      name: 'Lightning Fast',
      description: 'Complete a 20-card game in under 2 minutes',
      icon: '⚡⚡',
      condition: stats => (stats.bestTimes[20] || Infinity) < 120000,
      points: 100,
      category: AchievementCategory.SPEED
    },

    // Persistence achievements
    {
      id: 'persistent',
      name: 'Persistent Player',
      description: 'Play 50 games',
      icon: '💪',
      condition: stats => stats.totalGamesPlayed >= 50,
      points: 40,
      category: AchievementCategory.PERSISTENCE
    },
    {
      id: 'dedicated',
      name: 'Dedicated Gamer',
      description: 'Play for more than 2 hours total',
      icon: '⏰',
      condition: stats => stats.timeStats.totalPlayTime >= 7200000, // 2 hours in ms
      points: 60,
      category: AchievementCategory.PERSISTENCE
    },
    {
      id: 'century_club',
      name: 'Century Club',
      description: 'Win 100 games',
      icon: '💯',
      condition: stats => stats.totalGamesWon >= 100,
      points: 200,
      category: AchievementCategory.MASTERY
    },

    // Special achievements
    {
      id: 'comeback_kid',
      name: 'Comeback Kid',
      description: 'Win after using more than 50 attempts',
      icon: '🎢',
      condition: (stats): boolean => {
        // This would need special tracking of individual game attempts
        return stats.totalGamesWon > 0; // Placeholder condition
      },
      points: 35,
      category: AchievementCategory.SPECIAL
    },
    {
      id: 'perfectionist',
      name: 'Perfectionist',
      description: 'Get perfect scores on 3 different deck sizes',
      icon: '🏆',
      condition: (stats): boolean => {
        const perfectSizes = Object.entries(stats.bestAttempts).filter(
          ([size, attempts]) => attempts === parseInt(size) / 2
        ).length;
        return perfectSizes >= 3;
      },
      points: 150,
      category: AchievementCategory.MASTERY
    }
  ];

  private readonly notificationService = inject(NotificationService);
  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly configService = inject(ConfigService);

  public constructor() {
    this.loadStats();
    // Record every finished game; nothing else feeds the statistics.
    inject(GameStateManagerService)
      .gameWon$.pipe(takeUntilDestroyed())
      .subscribe(stats => this.updateGameStats(stats));
  }

  /**
   * Updates game statistics when a game is completed
   */
  public updateGameStats(gameStats: IGameStats): void {
    const currentStats = this._gameStats();
    const gameTime =
      gameStats.endTime != null && gameStats.startTime != null
        ? gameStats.endTime.getTime() - gameStats.startTime.getTime()
        : 0;

    const isPerfectGame = gameStats.attempts === gameStats.deckSize / 2;
    const isWin = gameStats.completionPercentage === 100;

    const updatedStats: GameStats = {
      ...currentStats,
      totalGamesPlayed: currentStats.totalGamesPlayed + 1,
      totalGamesWon: isWin ? currentStats.totalGamesWon + 1 : currentStats.totalGamesWon,
      totalAttempts: currentStats.totalAttempts + gameStats.attempts,
      perfectGames: isPerfectGame ? currentStats.perfectGames + 1 : currentStats.perfectGames,

      // Update streaks
      streaks: {
        currentWinStreak: isWin ? currentStats.streaks.currentWinStreak + 1 : 0,
        longestWinStreak: isWin
          ? Math.max(currentStats.streaks.longestWinStreak, currentStats.streaks.currentWinStreak + 1)
          : currentStats.streaks.longestWinStreak
      },

      // Update best attempts
      bestAttempts: {
        ...currentStats.bestAttempts,
        [gameStats.deckSize]: Math.min(currentStats.bestAttempts[gameStats.deckSize] || Infinity, gameStats.attempts)
      },

      // Update best times
      bestTimes:
        gameTime > 0
          ? {
              ...currentStats.bestTimes,
              [gameStats.deckSize]: Math.min(currentStats.bestTimes[gameStats.deckSize] || Infinity, gameTime)
            }
          : currentStats.bestTimes,

      // Update difficulty stats
      difficultyStats: {
        ...currentStats.difficultyStats,
        [gameStats.difficulty]: {
          gamesPlayed: currentStats.difficultyStats[gameStats.difficulty].gamesPlayed + 1,
          gamesWon: isWin
            ? currentStats.difficultyStats[gameStats.difficulty].gamesWon + 1
            : currentStats.difficultyStats[gameStats.difficulty].gamesWon,
          averageAttempts: this.calculateNewAverage(
            currentStats.difficultyStats[gameStats.difficulty].averageAttempts,
            currentStats.difficultyStats[gameStats.difficulty].gamesPlayed,
            gameStats.attempts
          )
        }
      },

      // Update time stats
      timeStats: {
        totalPlayTime: currentStats.timeStats.totalPlayTime + gameTime,
        averageGameTime: this.calculateNewAverage(
          currentStats.timeStats.averageGameTime,
          currentStats.totalGamesPlayed,
          gameTime
        )
      },

      // Update deck size stats
      deckSizeStats: {
        ...currentStats.deckSizeStats,
        [gameStats.deckSize]: {
          gamesPlayed: (currentStats.deckSizeStats[gameStats.deckSize]?.gamesPlayed || 0) + 1,
          gamesWon: isWin
            ? (currentStats.deckSizeStats[gameStats.deckSize]?.gamesWon || 0) + 1
            : currentStats.deckSizeStats[gameStats.deckSize]?.gamesWon || 0,
          averageAttempts: this.calculateNewAverage(
            currentStats.deckSizeStats[gameStats.deckSize]?.averageAttempts || 0,
            currentStats.deckSizeStats[gameStats.deckSize]?.gamesPlayed || 0,
            gameStats.attempts
          )
        }
      }
    };

    this._gameStats.set(updatedStats);
    this.saveStats();
    this.checkForNewAchievements(updatedStats);
  }

  /**
   * Checks for newly unlocked achievements
   */
  private checkForNewAchievements(stats: GameStats): void {
    const currentUnlocked = this._unlockedAchievements();
    const currentUnlockedIds = new Set(currentUnlocked.map(a => a.id));

    const newAchievements = this.achievements.filter(
      achievement => !currentUnlockedIds.has(achievement.id) && achievement.condition(stats)
    );

    if (newAchievements.length > 0) {
      const updatedUnlocked = [
        ...currentUnlocked,
        ...newAchievements.map(a => ({
          ...a,
          unlockedAt: new Date()
        }))
      ];

      this._unlockedAchievements.set(updatedUnlocked);
      this.saveUnlockedAchievements();

      // Show notifications for new achievements
      newAchievements.forEach(achievement => {
        this.notificationService.showAchievement(
          `${achievement.description} (+${achievement.points} points)`,
          `${achievement.icon} ${achievement.name}`
        );
      });
    }
  }

  /**
   * Gets all achievements with their unlock status
   */
  public getAllAchievements(): (Achievement & { unlocked: boolean })[] {
    const unlockedIds = new Set(this._unlockedAchievements().map(a => a.id));

    return this.achievements.map(achievement => ({
      ...achievement,
      unlocked: unlockedIds.has(achievement.id),
      unlockedAt: this._unlockedAchievements().find(a => a.id === achievement.id)?.unlockedAt
    }));
  }

  /**
   * Gets achievements by category
   */
  public getAchievementsByCategory(category: AchievementCategory): (Achievement & { unlocked: boolean })[] {
    return this.getAllAchievements().filter(achievement => achievement.category === category);
  }

  /**
   * Gets detailed statistics for UI display
   */
  public getDetailedStats(): object {
    const stats = this._gameStats();
    return {
      overview: {
        totalGames: stats.totalGamesPlayed,
        totalWins: stats.totalGamesWon,
        winRate: stats.totalGamesPlayed > 0 ? (stats.totalGamesWon / stats.totalGamesPlayed) * 100 : 0,
        totalPlayTime: stats.timeStats.totalPlayTime,
        averageGameTime: stats.timeStats.averageGameTime,
        currentStreak: stats.streaks.currentWinStreak,
        longestStreak: stats.streaks.longestWinStreak,
        perfectGames: stats.perfectGames
      },
      byDifficulty: stats.difficultyStats,
      byDeckSize: stats.deckSizeStats,
      bestScores: {
        attempts: stats.bestAttempts,
        times: stats.bestTimes
      }
    };
  }

  /**
   * Resets all statistics (with confirmation)
   */
  public resetStats(): void {
    this._gameStats.set(this.getDefaultStats());
    this._unlockedAchievements.set([]);
    this.saveStats();
    this.saveUnlockedAchievements();

    this.notificationService.showInfo('All statistics and achievements have been reset.', 'Statistics Reset');
  }

  /**
   * Calculates new running average
   */
  private calculateNewAverage(currentAvg: number, count: number, newValue: number): number {
    if (count === 0) return newValue;
    return (currentAvg * count + newValue) / (count + 1);
  }

  /**
   * Gets default statistics structure
   */
  private getDefaultStats(): GameStats {
    return {
      totalGamesPlayed: 0,
      totalGamesWon: 0,
      totalAttempts: 0,
      bestAttempts: {},
      bestTimes: {},
      perfectGames: 0,
      streaks: {
        currentWinStreak: 0,
        longestWinStreak: 0
      },
      difficultyStats: {
        [GameDifficulty.EASY]: { gamesPlayed: 0, gamesWon: 0, averageAttempts: 0 },
        [GameDifficulty.MEDIUM]: { gamesPlayed: 0, gamesWon: 0, averageAttempts: 0 },
        [GameDifficulty.HARD]: { gamesPlayed: 0, gamesWon: 0, averageAttempts: 0 }
      },
      timeStats: {
        totalPlayTime: 0,
        averageGameTime: 0
      },
      deckSizeStats: {}
    };
  }

  /**
   * Saves statistics to localStorage
   */
  private saveStats(): void {
    const storageKey = `${this.configService.getStorageConfig().gameStateKey}_stats`;
    this.errorHandler.safeStorageOperation(
      () => localStorage.setItem(storageKey, JSON.stringify(this._gameStats())),
      undefined,
      'Failed to save game statistics'
    );
  }

  /**
   * Loads statistics from localStorage
   */
  private loadStats(): void {
    const storageKey = `${this.configService.getStorageConfig().gameStateKey}_stats`;
    const savedStats = this.errorHandler.safeStorageOperation(
      () => localStorage.getItem(storageKey),
      null,
      'Failed to load game statistics'
    );

    if (savedStats != null && savedStats.length > 0) {
      try {
        const parsed = JSON.parse(savedStats);
        // Merge with default to ensure all properties exist
        const mergedStats = { ...this.getDefaultStats(), ...parsed };
        this._gameStats.set(mergedStats);
      } catch {
        console.warn('Failed to parse saved statistics, using defaults');
      }
    }

    this.loadUnlockedAchievements();
  }

  /**
   * Saves unlocked achievements
   */
  private saveUnlockedAchievements(): void {
    const storageKey = `${this.configService.getStorageConfig().gameStateKey}_achievements`;
    this.errorHandler.safeStorageOperation(
      () => localStorage.setItem(storageKey, JSON.stringify(this._unlockedAchievements())),
      undefined,
      'Failed to save achievements'
    );
  }

  /**
   * Loads unlocked achievements
   */
  private loadUnlockedAchievements(): void {
    const storageKey = `${this.configService.getStorageConfig().gameStateKey}_achievements`;
    const savedAchievements = this.errorHandler.safeStorageOperation(
      () => localStorage.getItem(storageKey),
      null,
      'Failed to load achievements'
    );

    if (savedAchievements != null && savedAchievements.length > 0) {
      try {
        const parsed = JSON.parse(savedAchievements);
        this._unlockedAchievements.set(parsed);
      } catch {
        console.warn('Failed to parse saved achievements');
      }
    }
  }
}
