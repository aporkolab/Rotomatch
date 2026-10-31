import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { AchievementsService } from './achievements.service';
import { GameStateManagerService } from './game-state-manager.service';
import { NotificationService } from '../service/notification.service';
import { GameDifficulty, IGameStats } from '../types/game.types';

describe('AchievementsService', () => {
  let service: AchievementsService;
  let gameWon$: Subject<IGameStats>;
  let notifications: { showAchievement: ReturnType<typeof vi.fn>; showInfo: ReturnType<typeof vi.fn> };

  const win = (deckSize: number, attempts: number, difficulty = GameDifficulty.EASY): IGameStats => ({
    gameId: 'g',
    startTime: new Date(0),
    endTime: new Date(30_000),
    attempts,
    matches: deckSize / 2,
    completionPercentage: 100,
    difficulty,
    deckSize
  });

  const create = (): AchievementsService => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: NotificationService, useValue: notifications },
        { provide: GameStateManagerService, useValue: { gameWon$: gameWon$.asObservable() } }
      ]
    });
    return TestBed.inject(AchievementsService);
  };

  beforeEach(() => {
    localStorage.clear();
    gameWon$ = new Subject<IGameStats>();
    notifications = { showAchievement: vi.fn(), showInfo: vi.fn() };
    service = create();
  });

  afterEach(() => localStorage.clear());

  it('should record every won game announced by the game state', () => {
    gameWon$.next(win(4, 3));
    gameWon$.next(win(4, 2));

    const stats = service.gameStats();
    void expect(stats.totalGamesWon).toBe(2);
    void expect(stats.bestAttempts[4]).toBe(2);
    void expect(stats.perfectGames).toBe(1);
    void expect(stats.streaks.longestWinStreak).toBe(2);
    void expect(stats.difficultyStats[GameDifficulty.EASY].averageAttempts).toBe(2.5);
  });

  it('should unlock achievements once and notify', () => {
    gameWon$.next(win(4, 2));
    gameWon$.next(win(4, 2));

    const unlocked = service.unlockedAchievements().map(a => a.id);
    void expect(unlocked).toContain('first_game');
    void expect(unlocked).toContain('first_perfect');
    void expect(new Set(unlocked).size).toBe(unlocked.length);
    void expect(notifications.showAchievement).toHaveBeenCalledWith(
      expect.stringContaining('Complete your first game'),
      expect.stringContaining('First Steps')
    );
  });

  it('should persist statistics across instances', () => {
    gameWon$.next(win(6, 5));
    const reloaded = create();
    void expect(reloaded.gameStats().totalGamesWon).toBe(1);
    void expect(reloaded.unlockedCount()).toBeGreaterThan(0);
  });

  it('should reset statistics and achievements', () => {
    gameWon$.next(win(4, 2));
    service.resetStats();
    void expect(service.gameStats().totalGamesWon).toBe(0);
    void expect(service.unlockedCount()).toBe(0);
  });
});
