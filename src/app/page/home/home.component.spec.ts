import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { GameStateService } from 'src/app/service/game-state.service';
import { NotificationService } from 'src/app/service/notification.service';
import { GameLogicService } from 'src/app/service/game-logic.service';
import { AchievementsService } from 'src/app/services/achievements.service';
import { GameStateManagerService } from 'src/app/services/game-state-manager.service';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let notificationService: MockedObject<NotificationService>;

  beforeEach(async () => {
    const gameStateSpy = {
      selectDeckSize: vi.fn().mockName('GameStateService.selectDeckSize')
    };
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
      loadGameState: vi.fn().mockName('GameStateManagerService.loadGameState')
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
        { provide: GameStateService, useValue: gameStateSpy },
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
});
