import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { NotificationService } from 'src/app/service/notification.service';
import { GameLogicService } from 'src/app/service/game-logic.service';
import { AchievementsService } from 'src/app/services/achievements.service';
import { GameStateManagerService } from 'src/app/services/game-state-manager.service';
import { HomeComponent } from './home.component';
import { GameDifficulty } from 'src/app/types/game.types';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let notificationService: MockedObject<NotificationService>;

  beforeEach(async () => {
    const notificationSpy = {
      showInfo: vi.fn().mockName('NotificationService.showInfo'),
      showWarning: vi.fn().mockName('NotificationService.showWarning'),
      showError: vi.fn().mockName('NotificationService.showError'),
      showSuccess: vi.fn().mockName('NotificationService.showSuccess')
    };
    const gameLogicSpy = {
      newGame: vi.fn().mockName('GameLogicService.newGame'),
      loadSavedGame: vi.fn().mockName('GameLogicService.loadSavedGame')
    };
    const achievementsSpy = {
      getDetailedStats: vi.fn().mockName('AchievementsService.getDetailedStats'),
      unlockedCount: vi.fn().mockName('AchievementsService.unlockedCount')
    };
    achievementsSpy.getDetailedStats.mockReturnValue({});
    achievementsSpy.unlockedCount.mockReturnValue(0);
    const gameStateManagerSpy = {
      loadGameState: vi.fn().mockName('GameStateManagerService.loadGameState'),
      hasSavedGame: vi.fn().mockName('GameStateManagerService.hasSavedGame')
    };

    const routerSpy = {
      navigate: vi.fn().mockName('Router.navigate')
    };
    const activatedRouteMock = {
      params: of({}),
      queryParams: of({}),
      snapshot: { params: {}, queryParams: {} }
    };

    await TestBed.configureTestingModule({
      imports: [HomeComponent, HttpClientTestingModule],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: NotificationService, useValue: notificationSpy },
        { provide: GameLogicService, useValue: gameLogicSpy },
        { provide: AchievementsService, useValue: achievementsSpy },
        { provide: GameStateManagerService, useValue: gameStateManagerSpy }
      ]
    }).compileComponents();

    notificationService = TestBed.inject(NotificationService) as MockedObject<NotificationService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    void expect(component).toBeTruthy();
  });

  it('should set selectedDeckSize and show notification when selectDeckSize is called', () => {
    const value = 12;
    component.selectDeckSize(value);

    void expect(component.selectedDeckSize).toBe(value);
    void expect(notificationService.showInfo).toHaveBeenCalledWith(
      expect.stringContaining(`${value} cards`),
      'Game Settings'
    );
  });

  it('should start a game with the chosen settings and go to the board', async () => {
    const gameLogic = TestBed.inject(GameLogicService) as MockedObject<GameLogicService>;
    const router = TestBed.inject(Router) as MockedObject<Router>;
    component.selectDeckSize(8);
    component.selectDifficulty(GameDifficulty.HARD);

    await component.startGame();

    void expect(gameLogic.newGame).toHaveBeenCalledWith(8, GameDifficulty.HARD);
    void expect(router.navigate).toHaveBeenCalledWith(['/game']);
  });

  it('should warn instead of starting without a difficulty', async () => {
    const gameLogic = TestBed.inject(GameLogicService) as MockedObject<GameLogicService>;
    component.selectedDifficulty = null;

    await component.startGame();

    void expect(gameLogic.newGame).not.toHaveBeenCalled();
    void expect(notificationService.showWarning).toHaveBeenCalled();
  });

  it('should only peek for a saved game on load, never restore it', () => {
    const gameLogic = TestBed.inject(GameLogicService) as MockedObject<GameLogicService>;
    const manager = TestBed.inject(GameStateManagerService) as MockedObject<GameStateManagerService>;

    void expect(manager.hasSavedGame).toHaveBeenCalled();
    void expect(gameLogic.loadSavedGame).not.toHaveBeenCalled();
  });
});
