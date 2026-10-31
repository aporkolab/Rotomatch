import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  TemplateRef,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { Card } from 'src/app/model/card';
import { GameLogicService } from 'src/app/service/game-logic.service';
import { GameStateManagerService } from 'src/app/services/game-state-manager.service';
import { GameDifficulty } from 'src/app/types/game.types';

/** Deck used when /game is opened directly, with neither a running nor a saved game. */
const DEFAULT_DECK_SIZE = 12;

/** Every face-down card looks the same; anything derived from the card would give pairs away. */
const CARD_FRONT_GRADIENT = 'linear-gradient(135deg, hsl(220, 20%, 25%), hsl(220, 25%, 35%))';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('celebrationAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate('300ms ease-in', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class GameComponent implements OnInit {
  public readonly gameLogic = inject(GameLogicService);
  private readonly gameStateManager = inject(GameStateManagerService);
  private readonly modalService = inject(BsModalService);
  private readonly destroyRef = inject(DestroyRef);

  public modalRef?: BsModalRef;

  private readonly bestResults = signal<{ [deckSize: number]: number }>({});
  private readonly newBestScore = signal(false);

  public readonly cards = this.gameLogic.cards;
  public readonly isProcessing = this.gameLogic.isProcessing;
  public readonly currentAttempts = this.gameLogic.score;
  public readonly gameTimer = this.gameStateManager.gameTimer;
  public readonly isPaused = this.gameStateManager.isPaused;
  public readonly isGameActive = this.gameStateManager.isGameActive;
  public readonly cardFrontGradient = CARD_FRONT_GRADIENT;

  public readonly deckSize = computed(() => this.gameStateManager.currentSession()?.settings.deckSize ?? 0);
  private readonly difficulty = computed(
    () => this.gameStateManager.currentSession()?.settings.difficulty ?? GameDifficulty.EASY
  );

  public readonly gameProgress = computed(() => {
    const cards = this.cards();
    if (cards.length === 0) return 0;
    return (cards.filter(card => card.matched).length / cards.length) * 100;
  });

  public readonly isGameWon = computed(() => {
    const cards = this.cards();
    return cards.length > 0 && cards.every(card => card.matched);
  });

  // Make Math available in template
  public readonly Math = Math;

  public ngOnInit(): void {
    if (this.gameStateManager.currentSession() == null && !this.gameLogic.loadSavedGame()) {
      void this.gameLogic.newGame(DEFAULT_DECK_SIZE);
    }

    this.gameLogic.gameWon$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(stats => {
      // Compare against the best score as it was before this game was recorded.
      const previousBest = this.bestResults()[stats.deckSize] ?? 0;
      this.newBestScore.set(previousBest === 0 || stats.attempts < previousBest);
      this.loadBestScore();
    });

    this.loadBestScore();
  }

  public openModal(template: TemplateRef<object>): void {
    this.modalRef = this.modalService.show(template, { class: 'modal-sm' });
  }

  private loadBestScore(): void {
    this.bestResults.set(this.gameLogic.loadBestResults());
  }

  public getBestScoreForCurrentDeck(): number {
    const deckSize = this.deckSize();
    return deckSize > 0 ? (this.bestResults()[deckSize] ?? 0) : 0;
  }

  public restartGame(): void {
    this.modalRef?.hide();
    const deckSize = this.deckSize();
    if (deckSize > 0) {
      this.newBestScore.set(false);
      void this.gameLogic.newGame(deckSize, this.difficulty());
      this.loadBestScore();
    }
  }

  public revealCard(card: Card): void {
    this.gameLogic.revealCard(card);
  }

  public togglePause(): void {
    this.gameLogic.togglePause();
  }

  public formatTime(time: number): string {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  public getProgressRingColor(): string {
    const progress = this.gameProgress();
    if (progress < 30) return '#ff6b6b';
    if (progress < 70) return '#feca57';
    return '#48dbfb';
  }

  public isCardBeingProcessed(card: Card): boolean {
    return card.flipped && !card.matched;
  }

  public canFlipCard(): boolean {
    return !this.isProcessing() && !this.isPaused();
  }

  public getCardAriaLabel(card: Card, position: number): string {
    // Hidden cards are labelled by position only: the id ("3" / "3_pair")
    // would tell a screen reader user which cards belong together.
    if (card.flipped) {
      return `Card ${position + 1}, ${card.name}, revealed`;
    }
    return `Card ${position + 1}, hidden`;
  }

  public isNewBestScore(): boolean {
    return this.newBestScore();
  }
}
