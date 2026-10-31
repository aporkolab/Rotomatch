import { TestBed } from '@angular/core/testing';
import { ConfigService } from './config.service';
import { GameDifficulty } from '../types/game.types';

describe('ConfigService', () => {
  let service: ConfigService;

  beforeEach(() => {
    service = TestBed.inject(ConfigService);
  });

  it.each([4, 6, 12, 20])('should accept deck size %i', size => {
    void expect(service.isValidDeckSize(size)).toBe(true);
  });

  it.each([0, 2, 3, 13, 22])('should reject deck size %i', size => {
    void expect(service.isValidDeckSize(size)).toBe(false);
  });

  it('should reveal cards for less time as difficulty rises', () => {
    const easy = service.getDifficultySettings(GameDifficulty.EASY).cardRevealTimeout;
    const medium = service.getDifficultySettings(GameDifficulty.MEDIUM).cardRevealTimeout;
    const hard = service.getDifficultySettings(GameDifficulty.HARD).cardRevealTimeout;

    void expect(easy).toBeGreaterThan(medium);
    void expect(medium).toBeGreaterThan(hard);
  });
});
