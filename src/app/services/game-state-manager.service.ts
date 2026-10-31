import { Injectable, computed, signal, inject } from '@angular/core';
import { Subject, interval, takeUntil } from 'rxjs';
import {
  IGameSession,
  IGameStats,
  IGameSettings,
  GameState,
  GameDifficulty,
  IBestScores,
  CardState
} from '../types/game.types';
import { Card } from '../model/card';
import { ConfigService } from './config.service';
import { ErrorHandlerService, ErrorCode } from './error-handler.service';

@Injectable({
  providedIn: 'root'
})
export class GameStateManagerService {
  // Signals for reactive state management
  private readonly _gameState = signal<GameState>(GameState.IDLE);
  private readonly _currentSession = signal<IGameSession | null>(null);
  private readonly _cards = signal<Card[]>([]);
  private readonly _flippedCards = signal<Card[]>([]);
  private readonly _isProcessing = signal<boolean>(false);
  private readonly _gameTimer = signal<number>(0);
  private readonly _isPaused = signal<boolean>(false);

  // Computed values
  public readonly gameState = this._gameState.asReadonly();
  public readonly currentSession = this._currentSession.asReadonly();
  public readonly cards = this._cards.asReadonly();
  public readonly flippedCards = this._flippedCards.asReadonly();
  public readonly isProcessing = this._isProcessing.asReadonly();
  public readonly gameTimer = this._gameTimer.asReadonly();
  public readonly isPaused = this._isPaused.asReadonly();

  // Computed game statistics
  public readonly currentStats = computed(() => {
    const session = this._currentSession();
    return session?.stats ?? null;
  });

  public readonly gameProgress = computed(() => {
    const cards = this._cards();
    if (cards.length === 0) return 0;
    const matchedCards = cards.filter(card => card.matched).length;
    return (matchedCards / cards.length) * 100;
  });

  public readonly canFlipCard = computed(() => {
    return (
      !this._isProcessing() &&
      this._gameState() === GameState.PLAYING &&
      !this._isPaused() &&
      this._flippedCards().length < 2
    );
  });

  public readonly isGameActive = computed(() => {
    return this._gameState() === GameState.PLAYING;
  });

  // Event subjects
  private readonly _gameWon$ = new Subject<IGameStats>();
  private readonly _cardFlipped$ = new Subject<{ card: Card; position: number }>();
  private readonly _matchFound$ = new Subject<{ cards: Card[]; attempts: number }>();
  private readonly _gameReset$ = new Subject<void>();

  // Observables
  public readonly gameWon$ = this._gameWon$.asObservable();
  public readonly cardFlipped$ = this._cardFlipped$.asObservable();
  public readonly matchFound$ = this._matchFound$.asObservable();
  public readonly gameReset$ = this._gameReset$.asObservable();

  // Timer management
  private readonly timerDestroy$ = new Subject<void>();

  // Pending match/mismatch resolutions. They belong to the game that scheduled
  // them and must not fire into a game started (or reset) in the meantime.
  private readonly pendingTimeouts = new Set<ReturnType<typeof setTimeout>>();

  private readonly configService = inject(ConfigService);
  private readonly errorHandler = inject(ErrorHandlerService);

  public constructor() {
    this.initializeDefaultState();
  }

  /**
   * Initializes a new game session
   */
  public initializeGame(deckSize: number, difficulty: GameDifficulty = GameDifficulty.EASY): void {
    try {
      if (!this.configService.isValidDeckSize(deckSize)) {
        throw new Error(`Invalid deck size: ${deckSize}`);
      }

      const gameId = this.generateGameId();
      const settings: IGameSettings = {
        deckSize,
        difficulty,
        enableSound: true,
        enableAnimations: true,
        autoSave: true,
        theme: 'default'
      };

      const stats: IGameStats = {
        gameId,
        startTime: new Date(),
        attempts: 0,
        matches: 0,
        completionPercentage: 0,
        difficulty,
        deckSize
      };

      const session: IGameSession = {
        id: gameId,
        cards: [],
        stats,
        settings,
        state: GameState.IDLE,
        flippedCards: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.cancelPendingTimeouts();
      this._currentSession.set(session);
      this._gameState.set(GameState.IDLE);
      this._gameTimer.set(0);
      this._isPaused.set(false);
    } catch (error) {
      this.errorHandler.createError(
        ErrorCode.CONFIGURATION_ERROR,
        'Failed to initialize game',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Starts the game with provided cards
   */
  public startGame(cards: Card[]): void {
    const session = this._currentSession();
    if (!session) {
      this.errorHandler.createError(ErrorCode.INVALID_GAME_STATE, 'Cannot start game without initialized session');
      return;
    }

    // Reset and shuffle cards
    const shuffledCards = this.shuffleCards(cards);
    const resetCards = shuffledCards.map(card => card.reset());

    // Update session and state
    const updatedSession: IGameSession = {
      ...session,
      cards: resetCards,
      state: GameState.PLAYING,
      updatedAt: new Date(),
      stats: {
        ...session.stats,
        startTime: new Date(),
        attempts: 0,
        matches: 0,
        completionPercentage: 0
      }
    };

    this._currentSession.set(updatedSession);
    this._cards.set(resetCards);
    this._flippedCards.set([]);
    this._gameState.set(GameState.PLAYING);
    this._isProcessing.set(false);

    this.startTimer();
    this.saveGameState();
  }

  /**
   * Handles card flip action
   */
  public flipCard(cardId: number | string): void {
    if (!this.canFlipCard() || this._isProcessing()) {
      return;
    }

    const cards = this._cards();
    const cardIndex = cards.findIndex(c => c.id === cardId);

    if (cardIndex === -1) {
      this.errorHandler.createError(ErrorCode.INVALID_GAME_STATE, 'Card not found');
      return;
    }

    const card = cards[cardIndex];
    if (!card.isClickable()) {
      return;
    }

    // Flip the card
    const flippedCard = card.flip();
    const updatedCards = [...cards];
    updatedCards[cardIndex] = flippedCard;

    this._cards.set(updatedCards);

    const currentFlipped = this._flippedCards();
    const newFlippedCards = [...currentFlipped, flippedCard];
    this._flippedCards.set(newFlippedCards);

    this._cardFlipped$.next({ card: flippedCard, position: cardIndex });

    // Check if we have two flipped cards
    if (newFlippedCards.length === 2) {
      this._isProcessing.set(true);
      this.processCardPair(newFlippedCards[0], newFlippedCards[1]);
    }

    this.updateSession();
  }

  /**
   * Processes a pair of flipped cards
   */
  private processCardPair(card1: Card, card2: Card): void {
    const session = this._currentSession();
    if (!session) return;

    // Increment attempts
    const updatedStats = {
      ...session.stats,
      attempts: session.stats.attempts + 1
    };

    this.schedule(() => {
      if (card1.matches(card2)) {
        this.handleMatch(card1, card2, updatedStats);
      } else {
        this.handleMismatch(card1, card2, updatedStats);
      }
    }, 500); // Brief delay for user to see both cards
  }

  /**
   * Handles card match
   */
  private handleMatch(card1: Card, card2: Card, stats: IGameStats): void {
    const cards = this._cards();
    const updatedCards = cards.map(card => {
      if (card.id === card1.id || card.id === card2.id) {
        return card.markAsMatched();
      }
      return card;
    });

    this._cards.set(updatedCards);
    this._flippedCards.set([]);
    this._isProcessing.set(false);

    const updatedStats = {
      ...stats,
      matches: stats.matches + 1,
      completionPercentage: (updatedCards.filter(c => c.matched).length / updatedCards.length) * 100
    };

    this.updateSessionStats(updatedStats);
    this._matchFound$.next({ cards: [card1, card2], attempts: updatedStats.attempts });

    // Check for game completion
    if (updatedCards.every(card => card.matched)) {
      this.handleGameWon(updatedStats);
    } else {
      this.saveGameState();
    }
  }

  /**
   * Handles card mismatch
   */
  private handleMismatch(card1: Card, card2: Card, stats: IGameStats): void {
    const difficultySettings = this.configService.getDifficultySettings(stats.difficulty);

    this.schedule(() => {
      const cards = this._cards();
      const updatedCards = cards.map(card => {
        if (card.id === card1.id || card.id === card2.id) {
          return card.clone({ flipped: false, state: CardState.FACE_DOWN });
        }
        return card;
      });

      this._cards.set(updatedCards);
      this._flippedCards.set([]);
      this._isProcessing.set(false);

      this.updateSessionStats(stats);
      this.saveGameState();
    }, difficultySettings.cardRevealTimeout);
  }

  /**
   * Handles game completion
   */
  private handleGameWon(stats: IGameStats): void {
    this.stopTimer();

    const finalStats = {
      ...stats,
      endTime: new Date(),
      completionPercentage: 100
    };

    this.updateSessionStats(finalStats);
    this._gameState.set(GameState.WON);

    // Persist the best score before announcing the win, so listeners that
    // reload best scores on gameWon$ see this game's result.
    this.updateBestScores(finalStats);
    this._gameWon$.next(finalStats);

    // Clear saved game state
    this.clearSavedGameState();
  }

  /**
   * Pauses/resumes the game
   */
  public togglePause(): void {
    if (this._gameState() !== GameState.PLAYING) return;

    const isPaused = this._isPaused();
    this._isPaused.set(!isPaused);

    if (isPaused) {
      this.resumeTimer();
    } else {
      this.pauseTimer();
    }

    this.saveGameState();
  }

  /**
   * Resets the current game
   */
  public resetGame(): void {
    this.stopTimer();
    this.cancelPendingTimeouts();
    this._gameState.set(GameState.IDLE);
    this._cards.set([]);
    this._flippedCards.set([]);
    this._isProcessing.set(false);
    this._gameTimer.set(0);
    this._isPaused.set(false);
    this._currentSession.set(null);

    this.clearSavedGameState();
    this._gameReset$.next();
  }

  /**
   * Timer management
   */
  private startTimer(): void {
    this.stopTimer();

    interval(1000)
      .pipe(takeUntil(this.timerDestroy$))
      .subscribe(() => {
        if (!this._isPaused() && this._gameState() === GameState.PLAYING) {
          this._gameTimer.set(this._gameTimer() + 1);
        }
      });
  }

  private pauseTimer(): void {
    // Timer automatically pauses when isPaused is true
  }

  private resumeTimer(): void {
    // Timer automatically resumes when isPaused is false
  }

  private stopTimer(): void {
    this.timerDestroy$.next();
  }

  private schedule(callback: () => void, delay: number): void {
    const handle = setTimeout(() => {
      this.pendingTimeouts.delete(handle);
      callback();
    }, delay);
    this.pendingTimeouts.add(handle);
  }

  private cancelPendingTimeouts(): void {
    this.pendingTimeouts.forEach(handle => clearTimeout(handle));
    this.pendingTimeouts.clear();
  }

  /**
   * Card shuffling with Fisher-Yates algorithm
   */
  private shuffleCards(cards: Card[]): Card[] {
    const shuffled = [...cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Session management
   */
  private updateSession(): void {
    const session = this._currentSession();
    if (session) {
      this._currentSession.set({
        ...session,
        cards: this._cards(),
        flippedCards: this._flippedCards(),
        state: this._gameState(),
        updatedAt: new Date()
      });
    }
  }

  private updateSessionStats(stats: IGameStats): void {
    const session = this._currentSession();
    if (session) {
      this._currentSession.set({
        ...session,
        stats,
        updatedAt: new Date()
      });
    }
  }

  /**
   * Persistence methods
   */
  public saveGameState(): void {
    const session = this._currentSession();
    if (session?.settings?.autoSave === true) {
      const storageKey = this.configService.getStorageConfig().gameStateKey;
      this.errorHandler.safeStorageOperation(
        () =>
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              session,
              gameTimer: this._gameTimer(),
              isPaused: this._isPaused()
            })
          ),
        undefined,
        'Failed to save game state'
      );
    }
  }

  public loadGameState(): boolean {
    const storageKey = this.configService.getStorageConfig().gameStateKey;
    const savedState = this.errorHandler.safeStorageOperation(
      () => localStorage.getItem(storageKey),
      null,
      'Failed to load game state'
    );

    if (savedState != null && savedState.length > 0) {
      try {
        const parsed = JSON.parse(savedState);
        const session = parsed.session as IGameSession;

        // A pair that was still being compared when the state was saved can
        // never be resolved after a reload, so turn unmatched cards face down.
        const cards = session.cards.map(cardData => {
          const card = new Card(cardData);
          return card.matched ? card : card.reset();
        });

        this.cancelPendingTimeouts();
        this._currentSession.set({
          ...session,
          cards,
          flippedCards: [],
          // JSON turns Dates into strings; the win handler needs real Dates.
          stats: {
            ...session.stats,
            startTime: new Date(session.stats.startTime),
            endTime: session.stats.endTime != null ? new Date(session.stats.endTime) : undefined
          },
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt)
        });
        this._cards.set(cards);
        this._flippedCards.set([]);
        this._isProcessing.set(false);
        this._gameState.set(session.state);
        this._gameTimer.set(parsed.gameTimer ?? 0);
        this._isPaused.set(parsed.isPaused ?? false);

        if (session.state === GameState.PLAYING && parsed.isPaused !== true) {
          this.startTimer();
        }

        return true;
      } catch (error) {
        this.errorHandler.createError(
          ErrorCode.STORAGE_ERROR,
          'Failed to parse saved game state',
          error instanceof Error ? error.message : String(error)
        );
      }
    }
    return false;
  }

  /**
   * Reports whether a resumable game is stored, without loading it.
   */
  public hasSavedGame(): boolean {
    const storageKey = this.configService.getStorageConfig().gameStateKey;
    const savedState = this.errorHandler.safeStorageOperation(
      () => localStorage.getItem(storageKey),
      null,
      'Failed to load game state'
    );
    return savedState != null && savedState.length > 0;
  }

  private clearSavedGameState(): void {
    const storageKey = this.configService.getStorageConfig().gameStateKey;
    this.errorHandler.safeStorageOperation(
      () => localStorage.removeItem(storageKey),
      undefined,
      'Failed to clear saved game state'
    );
  }

  /**
   * Best scores management
   */
  private updateBestScores(stats: IGameStats): void {
    const bestScoresKey = this.configService.getStorageConfig().bestScoresKey;
    const currentBest = this.errorHandler.safeStorageOperation(
      () => localStorage.getItem(bestScoresKey),
      '{}',
      'Failed to load best scores'
    );

    try {
      const bestScores: IBestScores = currentBest != null && currentBest.length > 0 ? JSON.parse(currentBest) : {};
      const deckSize = stats.deckSize;
      const currentAttempts = stats.attempts;
      const gameTime =
        stats.endTime != null && stats.startTime != null ? stats.endTime.getTime() - stats.startTime.getTime() : 0;

      if (bestScores[deckSize] == null || currentAttempts < bestScores[deckSize].attempts) {
        bestScores[deckSize] = {
          attempts: currentAttempts,
          time: gameTime,
          date: new Date(),
          difficulty: stats.difficulty
        };

        this.errorHandler.safeStorageOperation(
          () => localStorage.setItem(bestScoresKey, JSON.stringify(bestScores)),
          undefined,
          'Failed to save best scores'
        );
      }
    } catch (error) {
      this.errorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to update best scores',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  public getBestScores(): IBestScores {
    const bestScoresKey = this.configService.getStorageConfig().bestScoresKey;
    const savedScores = this.errorHandler.safeStorageOperation(
      () => localStorage.getItem(bestScoresKey),
      '{}',
      'Failed to load best scores'
    );

    try {
      return savedScores != null && savedScores.length > 0 ? JSON.parse(savedScores) : {};
    } catch {
      return {};
    }
  }

  /**
   * Utility methods
   */
  private generateGameId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private initializeDefaultState(): void {
    this._gameState.set(GameState.IDLE);
    this._cards.set([]);
    this._flippedCards.set([]);
    this._isProcessing.set(false);
    this._gameTimer.set(0);
    this._isPaused.set(false);
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    this.stopTimer();
    this.cancelPendingTimeouts();
    this._gameWon$.complete();
    this._cardFlipped$.complete();
    this._matchFound$.complete();
    this._gameReset$.complete();
  }
}
