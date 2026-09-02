import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy, Signal, computed } from '@angular/core';
import { Observable, of } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { map, tap, catchError } from 'rxjs/operators';
import { Card } from '../model/card';
import { IBestScores, GameDifficulty, ICard } from '../types/game.types';
import { NotificationService } from './notification.service';
import { ConfigService } from '../services/config.service';
import { ErrorHandlerService, ErrorCode } from '../services/error-handler.service';
import { GameStateManagerService } from '../services/game-state-manager.service';

@Injectable({
  providedIn: 'root'
})
export class GameLogicService implements OnDestroy {
  private allCards: Card[] = [];
  private isCardsLoaded = false;
  private loadingPromise: Promise<Card[]> | null = null;

  public constructor(
    private readonly http: HttpClient,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
    private readonly errorHandler: ErrorHandlerService,
    private readonly gameStateManager: GameStateManagerService
  ) {
    this.preloadCards();
  }

  /**
   * Preloads card data on service initialization
   */
  private preloadCards(): void {
    this.loadingPromise ??= new Promise((resolve, reject) => {
      this.loadCards().subscribe({
        next: cards => resolve(cards),
        error: err => reject(err)
      });
    });
  }

  /**
   * Loads card data from JSON file with error handling and retry logic
   */
  public loadCards(): Observable<Card[]> {
    if (this.isCardsLoaded && this.allCards.length > 0) {
      return of(this.allCards);
    }

    const endpoint = this.configService.getApiConfig().cardsEndpoint;

    return this.errorHandler.handleHttpError(
      this.http.get<ICard[]>(endpoint).pipe(
        map(cardData => cardData.map(data => new Card(data))),
        tap(cards => {
          this.allCards = cards;
          this.isCardsLoaded = true;
        }),
        catchError(error => {
          const gameError = this.errorHandler.createError(
            ErrorCode.CARD_LOAD_FAILED,
            'Failed to load card data',
            error.message
          );
          throw gameError;
        })
      ),
      [],
      true
    );
  }

  /**
   * Initializes a new game with proper validation and error handling
   */
  public async newGame(deckSize: number, difficulty: GameDifficulty = GameDifficulty.EASY): Promise<void> {
    try {
      // Ensure cards are loaded
      if (!this.isCardsLoaded) {
        this.notificationService.showLoading('Loading game assets...');
        await this.loadingPromise;
        this.notificationService.clearAll();
      }

      // Validate deck size
      if (this.configService.isValidDeckSize(deckSize) !== true) {
        const config = this.configService.getGameConfig();
        this.notificationService.showError(
          `Invalid deck size: ${deckSize}. ` +
            `Please select a size between ${config.minDeckSize} and ${config.maxDeckSize}.`,
          'Invalid Configuration'
        );
        return;
      }

      // Validate card availability
      if (deckSize / 2 > this.allCards.length) {
        this.notificationService.showError(
          `Not enough card types available for deck size ${deckSize}. Maximum available: ${this.allCards.length * 2}`,
          'Insufficient Cards'
        );
        return;
      }

      // Initialize game session
      this.gameStateManager.initializeGame(deckSize, difficulty);

      // Create game cards
      const gameCards = this.createGameCards(deckSize);

      // Start the game
      this.gameStateManager.startGame(gameCards);

      this.notificationService.showInfo(`New ${difficulty} game started with ${deckSize} cards`, 'Game Started');
    } catch (error) {
      this.errorHandler.createError(
        ErrorCode.CONFIGURATION_ERROR,
        'Failed to start new game',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Creates game cards by selecting and duplicating base cards
   */
  private createGameCards(deckSize: number): Card[] {
    const pairsNeeded = deckSize / 2;
    const selectedBaseCards = this.selectRandomCards(this.allCards, pairsNeeded);
    const backColor = this.generateRandomColor();

    const gameCards: Card[] = [];

    // Create pairs of cards
    selectedBaseCards.forEach(baseCard => {
      // First card of the pair
      gameCards.push(
        new Card({
          ...baseCard,
          backColor
        })
      );

      // Second card of the pair (with different ID)
      gameCards.push(
        new Card({
          ...baseCard,
          id: `${baseCard.id}_pair`,
          backColor
        })
      );
    });

    return gameCards;
  }

  /**
   * Selects random cards from available cards
   */
  private selectRandomCards(cards: Card[], count: number): Card[] {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  /**
   * Handles card reveal action
   */
  public revealCard(card: Card): void {
    this.gameStateManager.flipCard(card.id);
  }

  /**
   * Gets the current best scores
   */
  public getBestScores(): IBestScores {
    return this.gameStateManager.getBestScores();
  }

  /**
   * Loads saved game state
   */
  public loadSavedGame(): boolean {
    return this.gameStateManager.loadGameState();
  }

  /**
   * Pauses/resumes the current game
   */
  public togglePause(): void {
    this.gameStateManager.togglePause();
  }

  /**
   * Resets the current game
   */
  public resetGame(): void {
    this.gameStateManager.resetGame();
  }

  // Signal-backed state for templates. A signal read inside an OnPush template
  // registers a reactive dependency, so the view repaints as the game advances.
  // The observables below do not: the component samples them synchronously and
  // nothing ever marks the view dirty, which left the board frozen mid-move.
  public readonly cards: Signal<Card[]> = computed(() => this.gameStateManager.cards() ?? []);

  public readonly score: Signal<number> = computed(() => {
    const stats = this.gameStateManager.currentStats();
    return stats?.attempts != null && stats.attempts > 0 ? stats.attempts : 0;
  });

  public readonly isProcessing: Signal<boolean> = this.gameStateManager.isProcessing;

  // Observable properties that components expect
  public readonly cardList$ = toObservable(this.gameStateManager.cards).pipe(map(cards => cards ?? []));

  public readonly score$ = toObservable(this.gameStateManager.currentStats).pipe(
    map(stats => (stats?.attempts != null && stats.attempts > 0 ? stats.attempts : 0))
  );

  public readonly isProcessing$ = toObservable(this.gameStateManager.isProcessing);

  public readonly gameWon$ = this.gameStateManager.gameWon$;

  /**
   * Loads best results for display
   */
  public loadBestResults(): { [key: number]: number } {
    const bestScores = this.getBestScores();
    const results: { [key: number]: number } = {};

    Object.keys(bestScores).forEach(key => {
      const deckSize = parseInt(key, 10);
      results[deckSize] = bestScores[deckSize]?.attempts ?? 0;
    });

    return results;
  }

  /**
   * Gets all available cards for preview/selection
   */
  public async getAvailableCards(): Promise<Card[]> {
    if (!this.isCardsLoaded) {
      await this.loadingPromise;
    }
    return [...this.allCards];
  }

  /**
   * Validates if a deck size is possible with current cards
   */
  public canCreateDeck(deckSize: number): boolean {
    return this.configService.isValidDeckSize(deckSize) === true && deckSize / 2 <= this.allCards.length;
  }

  /**
   * Gets game statistics and progress
   */
  public getGameStats(): object {
    return {
      currentStats: this.gameStateManager.currentStats,
      gameProgress: this.gameStateManager.gameProgress,
      gameTimer: this.gameStateManager.gameTimer,
      isGameActive: this.gameStateManager.isGameActive
    };
  }

  /**
   * Gets current game state for UI binding
   */
  public getGameState(): object {
    return {
      cards: this.gameStateManager.cards,
      gameState: this.gameStateManager.gameState,
      isProcessing: this.gameStateManager.isProcessing,
      canFlipCard: this.gameStateManager.canFlipCard,
      isPaused: this.gameStateManager.isPaused
    };
  }

  /**
   * Subscribes to game events
   */
  public getGameEvents(): object {
    return {
      gameWon$: this.gameStateManager.gameWon$,
      cardFlipped$: this.gameStateManager.cardFlipped$,
      matchFound$: this.gameStateManager.matchFound$,
      gameReset$: this.gameStateManager.gameReset$
    };
  }

  /**
   * Generates a random color for card backs
   */
  private generateRandomColor(): string {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 60 + Math.floor(Math.random() * 40); // 60-100%
    const lightness = 45 + Math.floor(Math.random() * 20); // 45-65%
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  /**
   * Cleanup resources on service destruction
   */
  public ngOnDestroy(): void {
    this.gameStateManager.destroy();
  }
}
