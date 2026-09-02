import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Card } from 'src/app/model/card';
import { Subscription } from 'rxjs';
import { GameStateService } from 'src/app/service/game-state.service';
import { GameLogicService } from 'src/app/service/game-logic.service';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule],
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
export class GameComponent implements OnInit, OnDestroy {
  public deckSize = 0;
  private readonly subscriptions = new Subscription();
  public modalRef?: BsModalRef;

  public bestResults: { [key: number]: number } = {};

  public constructor(
    private readonly data: GameStateService,
    public gameLogic: GameLogicService,
    private readonly modalService: BsModalService
  ) {}

  public ngOnInit(): void {
    const deckSizeSub = this.data.currentSelectedDeckSize.subscribe(deckSize => {
      if (deckSize > 0) {
        this.deckSize = deckSize;
        void this.restartGame();
      }
    });
    this.subscriptions.add(deckSizeSub);

    const newGameSub = this.data.currentNewGameWanted.subscribe(isANewGameWanted => {
      if (isANewGameWanted) {
        void this.restartGame();
      }
    });
    this.subscriptions.add(newGameSub);

    const gameWonSub = this.gameLogic.gameWon$.subscribe(() => {
      this.loadBestScore();
    });
    this.subscriptions.add(gameWonSub);

    this.loadBestScore();
  }

  public ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  public openModal(template: TemplateRef<object>): void {
    this.modalRef = this.modalService.show(template, { class: 'modal-sm' });
  }

  private loadBestScore(): void {
    this.bestResults = this.gameLogic.loadBestResults();
  }

  public getBestScoreForCurrentDeck(): number {
    if (this.bestResults == null || this.deckSize <= 0) {
      return 0;
    }
    return this.bestResults[this.deckSize] ?? 0;
  }

  public restartGame(): void {
    this.modalRef?.hide();
    if (this.deckSize > 0) {
      void this.gameLogic.newGame(this.deckSize);
      this.loadBestScore();
    }
  }

  public revealCard(card: Card): void {
    this.gameLogic.revealCard(card);
  }

  public trackByCardId(index: number, card: Card): number | string {
    return card.id;
  }

  public trackByIndex(index: number): number {
    return index;
  }

  public getGameStatusClass(): string {
    // Placeholder method for template compatibility
    return 'game-active';
  }

  public getStatusIcon(): string {
    return 'fas fa-gamepad';
  }

  public getStatusTitle(): string {
    return 'Memory Game';
  }

  public getStatusSubtitle(): string {
    return 'Match all cards to win!';
  }

  public gameTimer(): number {
    return 0; // TODO: Implement timer
  }

  public isGameActive(): boolean {
    return true; // TODO: Implement game state
  }

  public formatTime(time: number): string {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  public currentAttempts(): number {
    return this.gameLogic.score();
  }

  public gameProgress(): number {
    const cards = this.cards();
    if (cards.length === 0) return 0;
    const matchedCards = cards.filter(card => card.matched).length;
    return (matchedCards / cards.length) * 100;
  }

  public getProgressRingColor(): string {
    const progress = this.gameProgress();
    if (progress < 30) return '#ff6b6b';
    if (progress < 70) return '#feca57';
    return '#48dbfb';
  }

  public isPaused(): boolean {
    return false; // TODO: Implement pause functionality
  }

  public togglePause(): void {
    // TODO: Implement pause functionality
  }

  public isProcessing(): boolean {
    return this.gameLogic.isProcessing();
  }

  public cards(): Card[] {
    return this.gameLogic.cards();
  }

  public shouldAnimateCardIn(_index: number): boolean {
    return true; // Simple animation trigger
  }

  public isCardBeingProcessed(card: Card): boolean {
    return card.flipped && !card.matched;
  }

  public canFlipCard(): boolean {
    return !this.isProcessing();
  }

  public getCardAriaLabel(card: Card): string {
    if (card.flipped) {
      return `Card ${card.name}, revealed`;
    }
    return `Card ${card.id}, hidden`;
  }

  public getCardFrontGradient(card: Card): string {
    // Generate a subtle gradient based on card ID
    const cardIdNum = typeof card.id === 'string' ? parseInt(card.id, 10) || 1 : card.id;
    const hue = (cardIdNum * 137) % 360;
    return `linear-gradient(135deg, hsl(${hue}, 20%, 25%), hsl(${hue}, 25%, 35%))`;
  }

  public isGameWon(): boolean {
    const cards = this.cards();
    return cards.length > 0 && cards.every(card => card.matched);
  }

  public isNewBestScore(): boolean {
    const current = this.currentAttempts();
    const best = this.getBestScoreForCurrentDeck();
    return best === 0 || current < best;
  }

  // Make Math available in template
  public Math = Math;
}
