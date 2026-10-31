import { TestBed } from '@angular/core/testing';
import { GameStateManagerService } from './game-state-manager.service';
import { ConfigService } from './config.service';
import { NotificationService } from '../service/notification.service';
import { Card } from '../model/card';
import { GameDifficulty, GameState, IGameStats } from '../types/game.types';

describe('GameStateManagerService', () => {
  let service: GameStateManagerService;
  let config: ConfigService;

  // EASY hides a mismatched pair after this long, on top of the 500ms compare delay.
  const COMPARE_DELAY = 500;
  const EASY_REVEAL = 2500;

  const pair = (id: number, name: string): Card[] => [
    new Card({ id, name, icon: '' }),
    new Card({ id: `${id}_pair`, name, icon: '' })
  ];

  const start = (cards: Card[], difficulty = GameDifficulty.EASY): void => {
    service.initializeGame(cards.length, difficulty);
    service.startGame(cards);
  };

  const idOf = (name: string, nth = 0): number | string => service.cards().filter(card => card.name === name)[nth].id;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: NotificationService,
          useValue: { showError: vi.fn(), showWarning: vi.fn(), showInfo: vi.fn(), showAchievement: vi.fn() }
        }
      ]
    });
    service = TestBed.inject(GameStateManagerService);
    config = TestBed.inject(ConfigService);
  });

  afterEach(() => {
    service.destroy();
    vi.useRealTimers();
    localStorage.clear();
  });

  it('should start a shuffled, face-down game with zero attempts', () => {
    start([...pair(1, 'A'), ...pair(2, 'B')]);

    void expect(service.gameState()).toBe(GameState.PLAYING);
    void expect(service.cards()).toHaveLength(4);
    void expect(service.cards().every(card => !card.flipped && !card.matched)).toBe(true);
    void expect(service.currentStats()?.attempts).toBe(0);
  });

  it('should mark a matching pair and count one attempt', () => {
    start([...pair(1, 'A'), ...pair(2, 'B')]);

    service.flipCard(idOf('A', 0));
    service.flipCard(idOf('A', 1));
    void expect(service.isProcessing()).toBe(true);

    vi.advanceTimersByTime(COMPARE_DELAY);

    void expect(
      service
        .cards()
        .filter(card => card.matched)
        .map(card => card.name)
    ).toEqual(['A', 'A']);
    void expect(service.currentStats()?.attempts).toBe(1);
    void expect(service.currentStats()?.matches).toBe(1);
    void expect(service.isProcessing()).toBe(false);
  });

  it('should turn a mismatched pair back after the difficulty reveal time', () => {
    start([...pair(1, 'A'), ...pair(2, 'B')]);

    service.flipCard(idOf('A'));
    service.flipCard(idOf('B'));
    vi.advanceTimersByTime(COMPARE_DELAY + EASY_REVEAL - 1);
    void expect(service.cards().filter(card => card.flipped)).toHaveLength(2);

    vi.advanceTimersByTime(1);
    void expect(service.cards().some(card => card.flipped || card.matched)).toBe(false);
    void expect(service.currentStats()?.attempts).toBe(1);
    void expect(service.isProcessing()).toBe(false);
  });

  it('should ignore a third card while a pair is being compared', () => {
    start([...pair(1, 'A'), ...pair(2, 'B')]);

    service.flipCard(idOf('A'));
    service.flipCard(idOf('B'));
    service.flipCard(idOf('A', 1));

    void expect(service.cards().filter(card => card.flipped)).toHaveLength(2);
  });

  it('should not let a pending comparison leak into the next game', () => {
    start([...pair(1, 'A'), ...pair(2, 'B')]);
    service.flipCard(idOf('A', 0));
    service.flipCard(idOf('A', 1));

    // New game before the old pair was resolved; card ids are reused across games.
    start([...pair(1, 'A'), ...pair(2, 'B')]);
    const newGameId = service.currentStats()?.gameId;
    vi.advanceTimersByTime(COMPARE_DELAY + EASY_REVEAL);

    void expect(service.cards().some(card => card.matched)).toBe(false);
    void expect(service.currentStats()?.gameId).toBe(newGameId);
    void expect(service.currentStats()?.attempts).toBe(0);
  });

  it('should save the best score before announcing the win', () => {
    let bestSeenByListener: number | undefined;
    service.gameWon$.subscribe((stats: IGameStats) => {
      bestSeenByListener = service.getBestScores()[stats.deckSize]?.attempts;
    });

    start([...pair(1, 'A'), ...pair(2, 'B')]);
    for (const name of ['A', 'B']) {
      service.flipCard(idOf(name, 0));
      service.flipCard(idOf(name, 1));
      vi.advanceTimersByTime(COMPARE_DELAY);
    }

    void expect(service.gameState()).toBe(GameState.WON);
    void expect(bestSeenByListener).toBe(2);
  });

  it('should keep the lower attempt count as best score', () => {
    const win = (misses: number): void => {
      start([...pair(1, 'A'), ...pair(2, 'B')]);
      for (let i = 0; i < misses; i++) {
        service.flipCard(idOf('A'));
        service.flipCard(idOf('B'));
        vi.advanceTimersByTime(COMPARE_DELAY + EASY_REVEAL);
      }
      for (const name of ['A', 'B']) {
        service.flipCard(idOf(name, 0));
        service.flipCard(idOf(name, 1));
        vi.advanceTimersByTime(COMPARE_DELAY);
      }
    };

    win(2);
    void expect(service.getBestScores()[4].attempts).toBe(4);
    win(0);
    void expect(service.getBestScores()[4].attempts).toBe(2);
    win(1);
    void expect(service.getBestScores()[4].attempts).toBe(2);
  });

  it('should pause the timer and block flips while paused', () => {
    start([...pair(1, 'A'), ...pair(2, 'B')]);
    vi.advanceTimersByTime(3000);
    void expect(service.gameTimer()).toBe(3);

    service.togglePause();
    vi.advanceTimersByTime(5000);
    service.flipCard(idOf('A'));
    void expect(service.gameTimer()).toBe(3);
    void expect(service.cards().some(card => card.flipped)).toBe(false);

    service.togglePause();
    vi.advanceTimersByTime(1000);
    void expect(service.gameTimer()).toBe(4);
  });

  it('should report a saved game without loading it', () => {
    void expect(service.hasSavedGame()).toBe(false);
    start([...pair(1, 'A'), ...pair(2, 'B')]);
    void expect(service.hasSavedGame()).toBe(true);
  });

  it('should restore a saved game with real dates and no stuck pair', () => {
    start([...pair(1, 'A'), ...pair(2, 'B')]);
    service.flipCard(idOf('A', 0));
    service.flipCard(idOf('A', 1));
    vi.advanceTimersByTime(COMPARE_DELAY);
    // Save while a mismatched pair is still face up and being compared.
    service.flipCard(idOf('B', 0));
    service.togglePause();
    service.togglePause();
    service.saveGameState();

    // Simulate a reload: fresh service instance, same storage.
    service.destroy();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: NotificationService, useValue: { showError: vi.fn(), showWarning: vi.fn() } }]
    });
    service = TestBed.inject(GameStateManagerService);

    void expect(service.loadGameState()).toBe(true);
    void expect(service.currentStats()?.startTime).toBeInstanceOf(Date);
    void expect(service.flippedCards()).toEqual([]);
    void expect(service.cards().filter(card => card.matched)).toHaveLength(2);
    void expect(service.cards().filter(card => card.flipped && !card.matched)).toHaveLength(0);
    void expect(service.canFlipCard()).toBe(true);

    // The resumed game can be finished and recorded.
    service.flipCard(idOf('B', 0));
    service.flipCard(idOf('B', 1));
    vi.advanceTimersByTime(COMPARE_DELAY);
    void expect(service.gameState()).toBe(GameState.WON);
    void expect(service.getBestScores()[4]?.attempts).toBe(2);
  });

  it('should reject an invalid deck size', () => {
    void expect(config.isValidDeckSize(3)).toBe(false);
    service.initializeGame(3);
    void expect(service.currentSession()).toBeNull();
  });
});
