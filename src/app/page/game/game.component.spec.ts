import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { GameComponent } from './game.component';
import { GameStateService } from 'src/app/service/game-state.service';
import { GameLogicService } from 'src/app/service/game-logic.service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { Card } from 'src/app/model/card';
import { signal } from '@angular/core';
import { of, Subject } from 'rxjs';

describe('GameComponent', () => {
  let component: GameComponent;
  let fixture: ComponentFixture<GameComponent>;
  let gameLogicService: jasmine.SpyObj<GameLogicService>;
  let modalService: jasmine.SpyObj<BsModalService>;
  let cardsSignal: ReturnType<typeof signal<Card[]>>;
  let scoreSignal: ReturnType<typeof signal<number>>;
  let isProcessingSignal: ReturnType<typeof signal<boolean>>;

  beforeEach(async () => {
    cardsSignal = signal<Card[]>([]);
    scoreSignal = signal(0);
    isProcessingSignal = signal(false);

    const gameLogicSpy = jasmine.createSpyObj('GameLogicService', ['newGame', 'revealCard', 'loadBestResults'], {
      // The template reads these signals; they are what keeps an OnPush view in sync.
      cards: cardsSignal.asReadonly(),
      score: scoreSignal.asReadonly(),
      isProcessing: isProcessingSignal.asReadonly(),
      cardList$: of([]),
      score$: of(0),
      isProcessing$: of(false),
      gameWon$: new Subject<void>().asObservable()
    });

    const gameStateSpy = jasmine.createSpyObj('GameStateService', [], {
      currentSelectedDeckSize: of(12), // Provide a default deck size
      currentNewGameWanted: of(false)
    });

    const modalSpy = jasmine.createSpyObj('BsModalService', ['show']);

    await TestBed.configureTestingModule({
      imports: [GameComponent, RouterTestingModule, BrowserAnimationsModule],
      providers: [
        { provide: GameLogicService, useValue: gameLogicSpy },
        { provide: GameStateService, useValue: gameStateSpy },
        { provide: BsModalService, useValue: modalSpy }
      ]
    }).compileComponents();

    gameLogicService = TestBed.inject(GameLogicService) as jasmine.SpyObj<GameLogicService>;
    modalService = TestBed.inject(BsModalService) as jasmine.SpyObj<BsModalService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    void expect(component).toBeTruthy();
  });

  it('should start a new game on init', () => {
    void expect(gameLogicService.newGame).toHaveBeenCalledWith(12);
  });

  it('should call revealCard on the service when a card is clicked', () => {
    const testCard = new Card({ id: 1, name: 'A', icon: '', flipped: false, matched: false });
    component.revealCard(testCard);
    void expect(gameLogicService.revealCard).toHaveBeenCalledWith(testCard);
  });

  it('should call openModal on the modal service', () => {
    const template: any = 'mockTemplate';
    component.openModal(template);
    void expect(modalService.show).toHaveBeenCalledWith(template, { class: 'modal-sm' });
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

  it('should call newGame when restartGame is called', () => {
    component.deckSize = 12; // ensure deckSize is set
    component.restartGame();
    // It should have been called once on init, and once on restart
    void expect(gameLogicService.newGame.calls.count()).toBe(2);
    void expect(gameLogicService.newGame).toHaveBeenCalledWith(12);
  });
});
