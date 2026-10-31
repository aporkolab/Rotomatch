import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TemplateRef, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { BsModalService } from 'ngx-bootstrap/modal';
import { GameComponent } from './game.component';
import { GameLogicService } from 'src/app/service/game-logic.service';
import { GameStateManagerService } from 'src/app/services/game-state-manager.service';
import { Card } from 'src/app/model/card';
import { GameDifficulty, IGameSession, IGameStats } from 'src/app/types/game.types';

describe('GameComponent', () => {
  let component: GameComponent;
  let fixture: ComponentFixture<GameComponent>;
  let gameLogicService: MockedObject<GameLogicService>;
  let modalService: MockedObject<BsModalService>;
  let cardsSignal: ReturnType<typeof signal<Card[]>>;
  let scoreSignal: ReturnType<typeof signal<number>>;
  let isProcessingSignal: ReturnType<typeof signal<boolean>>;
  let sessionSignal: ReturnType<typeof signal<IGameSession | null>>;
  let gameWon$: Subject<IGameStats>;

  const session = (deckSize: number, difficulty: GameDifficulty): IGameSession =>
    ({ settings: { deckSize, difficulty } }) as IGameSession;

  const configure = async (initialSession: IGameSession | null): Promise<void> => {
    cardsSignal = signal<Card[]>([]);
    scoreSignal = signal(0);
    isProcessingSignal = signal(false);
    sessionSignal = signal(initialSession);
    gameWon$ = new Subject<IGameStats>();

    const gameLogicSpy = {
      newGame: vi.fn().mockName('GameLogicService.newGame'),
      revealCard: vi.fn().mockName('GameLogicService.revealCard'),
      togglePause: vi.fn().mockName('GameLogicService.togglePause'),
      loadSavedGame: vi.fn().mockName('GameLogicService.loadSavedGame').mockReturnValue(false),
      loadBestResults: vi.fn().mockName('GameLogicService.loadBestResults').mockReturnValue({}),
      // The template reads these signals; they are what keeps an OnPush view in sync.
      cards: cardsSignal.asReadonly(),
      score: scoreSignal.asReadonly(),
      isProcessing: isProcessingSignal.asReadonly(),
      gameWon$: gameWon$.asObservable()
    };

    const gameStateManagerStub = {
      currentSession: sessionSignal.asReadonly(),
      gameTimer: signal(0).asReadonly(),
      isPaused: signal(false).asReadonly(),
      isGameActive: signal(true).asReadonly()
    };

    await TestBed.configureTestingModule({
      imports: [GameComponent, BrowserAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: GameLogicService, useValue: gameLogicSpy },
        { provide: GameStateManagerService, useValue: gameStateManagerStub },
        { provide: BsModalService, useValue: { show: vi.fn().mockName('BsModalService.show') } }
      ]
    }).compileComponents();

    gameLogicService = TestBed.inject(GameLogicService) as MockedObject<GameLogicService>;
    modalService = TestBed.inject(BsModalService) as MockedObject<BsModalService>;

    fixture = TestBed.createComponent(GameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  describe('with a running game', () => {
    beforeEach(() => configure(session(12, GameDifficulty.HARD)));

    it('should create', () => {
      void expect(component).toBeTruthy();
    });

    it('should keep the game the home page started instead of starting another', () => {
      void expect(gameLogicService.newGame).not.toHaveBeenCalled();
      void expect(gameLogicService.loadSavedGame).not.toHaveBeenCalled();
      void expect(component.deckSize()).toBe(12);
    });

    it('should call revealCard on the service when a card is clicked', () => {
      const testCard = new Card({ id: 1, name: 'A', icon: '', flipped: false, matched: false });
      component.revealCard(testCard);
      void expect(gameLogicService.revealCard).toHaveBeenCalledWith(testCard);
    });

    it('should call openModal on the modal service', () => {
      const template = {} as TemplateRef<object>;
      component.openModal(template);
      void expect(modalService.show).toHaveBeenCalledWith(template, { class: 'modal-sm' });
    });

    it('should restart with the deck size and difficulty of the running game', () => {
      component.restartGame();
      void expect(gameLogicService.newGame).toHaveBeenCalledWith(12, GameDifficulty.HARD);
    });

    it('should forward pause requests to the game logic', () => {
      component.togglePause();
      void expect(gameLogicService.togglePause).toHaveBeenCalled();
    });

    // The board used to freeze mid-move: the component sampled the state
    // observables with subscribe().unsubscribe() inside template methods, which
    // never marks an OnPush view dirty, so nothing repainted until an unrelated
    // click happened to trigger change detection.
    it('should repaint when game state changes, with no user event in between', async () => {
      fixture.autoDetectChanges(true);

      isProcessingSignal.set(true);
      await fixture.whenStable();
      void expect(fixture.nativeElement.textContent).toContain('Processing');

      isProcessingSignal.set(false);
      await fixture.whenStable();
      void expect(fixture.nativeElement.textContent).not.toContain('Processing');
    });

    it('should reflect attempts and progress from the state signals', async () => {
      fixture.autoDetectChanges(true);

      cardsSignal.set([
        new Card({ id: 1, name: 'A', icon: '', flipped: true, matched: true }),
        new Card({ id: 2, name: 'A', icon: '', flipped: true, matched: true }),
        new Card({ id: 3, name: 'B', icon: '', flipped: false, matched: false }),
        new Card({ id: 4, name: 'B', icon: '', flipped: false, matched: false })
      ]);
      scoreSignal.set(3);
      await fixture.whenStable();

      void expect(component.currentAttempts()).toBe(3);
      void expect(component.gameProgress()).toBe(50);
      void expect(fixture.nativeElement.textContent).toContain('50%');
    });

    it('should not give pairs away through the face-down look or the aria label', async () => {
      fixture.autoDetectChanges(true);
      cardsSignal.set([
        new Card({ id: 3, name: 'B', icon: '', flipped: false, matched: false }),
        new Card({ id: '3_pair', name: 'B', icon: '', flipped: false, matched: false }),
        new Card({ id: 7, name: 'C', icon: '', flipped: false, matched: false })
      ]);
      await fixture.whenStable();

      const element = fixture.nativeElement as HTMLElement;
      const fronts = Array.from(element.querySelectorAll<HTMLElement>('.card-front')).map(el => el.style.background);
      void expect(new Set(fronts).size).toBe(1);

      const labels = Array.from(element.querySelectorAll('.card-flipper')).map(el => el.getAttribute('aria-label'));
      void expect(labels).toEqual(['Card 1, hidden', 'Card 2, hidden', 'Card 3, hidden']);
    });

    it('should flag a new best score against the best from before the win', () => {
      gameLogicService.loadBestResults.mockReturnValue({ 12: 9 });
      component.restartGame(); // reloads best results: 9 attempts
      void expect(component.getBestScoreForCurrentDeck()).toBe(9);

      gameLogicService.loadBestResults.mockReturnValue({ 12: 7 });
      gameWon$.next({ deckSize: 12, attempts: 7 } as IGameStats);

      void expect(component.isNewBestScore()).toBe(true);
      void expect(component.getBestScoreForCurrentDeck()).toBe(7);
    });

    it('should not flag a new best score when the game was worse', () => {
      gameLogicService.loadBestResults.mockReturnValue({ 12: 6 });
      component.restartGame();

      gameWon$.next({ deckSize: 12, attempts: 10 } as IGameStats);

      void expect(component.isNewBestScore()).toBe(false);
    });
  });

  describe('opened directly without a game', () => {
    beforeEach(() => configure(null));

    it('should try the saved game, then start a default one', () => {
      void expect(gameLogicService.loadSavedGame).toHaveBeenCalled();
      void expect(gameLogicService.newGame).toHaveBeenCalledWith(12);
    });
  });
});
