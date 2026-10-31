import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { GameLogicService } from '../../service/game-logic.service';
import { AchievementsService } from '../../services/achievements.service';
import { GameStateManagerService } from '../../services/game-state-manager.service';
import { GameDifficulty, DECK_SIZE_OPTIONS } from '../../types/game.types';
import { NotificationService } from '../../service/notification.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit, OnDestroy {
  // Game configuration
  public readonly deckSizes = DECK_SIZE_OPTIONS;
  public readonly GameDifficulty = GameDifficulty; // Make enum available in template
  public selectedDeckSize: number | null = null;
  public selectedDifficulty: GameDifficulty | null = null;

  // Statistics for display
  public hasGameHistory = false;
  public hasSavedGame = false;
  public totalWins = 0;
  public achievementCount = 0;
  public winRate = 0;

  private readonly subscriptions = new Subscription();

  public constructor(
    private readonly router: Router,
    private readonly gameLogic: GameLogicService,
    private readonly achievementsService: AchievementsService,
    private readonly gameStateManager: GameStateManagerService,
    private readonly notificationService: NotificationService
  ) {}

  public ngOnInit(): void {
    this.loadUserStatistics();
    this.checkForSavedGame();
    this.setDefaultSelections();
  }

  public ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Selects difficulty level
   */
  public selectDifficulty(difficulty: GameDifficulty): void {
    this.selectedDifficulty = difficulty;
    this.notificationService.showInfo(
      `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} difficulty selected`,
      'Game Settings'
    );
  }

  /**
   * Selects deck size
   */
  public selectDeckSize(size: number): void {
    this.selectedDeckSize = size;
    this.notificationService.showInfo(`${size} cards (${size / 2} pairs) selected`, 'Game Settings');
  }

  /**
   * Gets difficulty class for deck size indicator
   */
  public getDifficultyClass(deckSize: number): string {
    if (deckSize <= 8) return 'easy';
    if (deckSize <= 14) return 'medium';
    return 'hard';
  }

  /**
   * Starts a new game with selected settings
   */
  public async startGame(): Promise<void> {
    if (this.selectedDeckSize == null || this.selectedDifficulty == null) {
      this.notificationService.showWarning('Please select both deck size and difficulty level', 'Missing Settings');
      return;
    }

    try {
      await this.gameLogic.newGame(this.selectedDeckSize, this.selectedDifficulty);
      void this.router.navigate(['/game']);
    } catch {
      this.notificationService.showError('Failed to start game. Please try again.', 'Game Error');
    }
  }

  /**
   * Continues saved game if available
   */
  public continueGame(): void {
    if (this.gameLogic.loadSavedGame() === true) {
      void this.router.navigate(['/game']);
      this.notificationService.showInfo('Resumed saved game', 'Game Restored');
    } else {
      this.notificationService.showWarning('No saved game found', 'Cannot Resume');
    }
  }

  /**
   * Loads user statistics for display
   */
  private loadUserStatistics(): void {
    const stats = this.achievementsService.getDetailedStats() as {
      overview?: { totalGames?: number; totalWins?: number; winRate?: number };
    };

    this.hasGameHistory = (stats?.overview?.totalGames ?? 0) > 0;
    this.totalWins = stats?.overview?.totalWins ?? 0;
    this.winRate = Math.round(stats?.overview?.winRate ?? 0);
    this.achievementCount = this.achievementsService.unlockedCount();
  }

  /**
   * Checks if there's a saved game
   */
  private checkForSavedGame(): void {
    // Only peek at storage: loading here would restore the game and start its timer.
    this.hasSavedGame = this.gameStateManager.hasSavedGame();
  }

  /**
   * Sets default selections based on user history
   */
  private setDefaultSelections(): void {
    // Set recommended defaults
    if (!this.hasGameHistory) {
      this.selectedDeckSize = 12; // Recommended for beginners
      this.selectedDifficulty = GameDifficulty.EASY;
    } else {
      // Keep last selections or set based on user's skill level
      this.selectedDifficulty = GameDifficulty.MEDIUM;
    }
  }

  /**
   * TrackBy function for deck sizes
   */
  public trackByDeckSize(index: number, size: number): number {
    return size;
  }
}
