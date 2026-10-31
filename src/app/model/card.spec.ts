import { Card } from './card';
import { CardState } from '../types/game.types';

describe('Card', () => {
  const card = (id: number | string, name = 'A'): Card => new Card({ id, name, icon: 'a.png' });

  it('should start face down', () => {
    const c = card(1);
    void expect(c.flipped).toBe(false);
    void expect(c.matched).toBe(false);
    void expect(c.state).toBe(CardState.FACE_DOWN);
    void expect(c.isClickable()).toBe(true);
  });

  it('should flip into a new instance without mutating the original', () => {
    const c = card(1);
    const flipped = c.flip();
    void expect(flipped).not.toBe(c);
    void expect(flipped.flipped).toBe(true);
    void expect(flipped.state).toBe(CardState.FACE_UP);
    void expect(flipped.isClickable()).toBe(false);
    void expect(c.flipped).toBe(false);
    void expect(flipped.flip().state).toBe(CardState.FACE_DOWN);
  });

  it('should match its pair but not itself or another name', () => {
    void expect(card(1).matches(card('1_pair'))).toBe(true);
    void expect(card(1).matches(card(1))).toBe(false);
    void expect(card(1).matches(card(2, 'B'))).toBe(false);
  });

  it('should stay face up and unclickable once matched, until reset', () => {
    const matched = card(1).markAsMatched();
    void expect(matched.flipped).toBe(true);
    void expect(matched.isClickable()).toBe(false);
    const reset = matched.reset();
    void expect(reset.matched).toBe(false);
    void expect(reset.isClickable()).toBe(true);
  });

  it('should not be clickable while animating', () => {
    void expect(card(1).clone({ state: CardState.ANIMATING }).isClickable()).toBe(false);
  });
});
