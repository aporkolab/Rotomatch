import { TestBed } from '@angular/core/testing';
import { Observable, defer, throwError } from 'rxjs';
import { ErrorCode, ErrorHandlerService } from './error-handler.service';
import { NotificationService } from '../service/notification.service';

describe('ErrorHandlerService', () => {
  let service: ErrorHandlerService;
  let notifications: { showError: ReturnType<typeof vi.fn>; showWarning: ReturnType<typeof vi.fn> };

  const failing = (): { source: Observable<number[]>; subscriptions: () => number } => {
    let count = 0;
    const source = defer(() => {
      count++;
      return throwError(() => new Error('offline'));
    });
    return { source, subscriptions: () => count };
  };

  beforeEach(() => {
    vi.useFakeTimers();
    notifications = { showError: vi.fn(), showWarning: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: NotificationService, useValue: notifications }] });
    service = TestBed.inject(ErrorHandlerService);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // retryWhen used to turn the fallback into one more retry signal, so a
  // persistent failure was retried forever and never produced the fallback.
  it('should retry three times with backoff, then emit the fallback once', () => {
    const { source, subscriptions } = failing();
    const values: number[][] = [];
    let completed = false;

    service.handleHttpError(source, []).subscribe({ next: v => values.push(v), complete: () => (completed = true) });

    vi.advanceTimersByTime(1000 + 2000 + 4000);
    vi.advanceTimersByTime(60_000);

    void expect(subscriptions()).toBe(4);
    void expect(values).toEqual([[]]);
    void expect(completed).toBe(true);
    void expect(notifications.showError).toHaveBeenCalledTimes(1);
  });

  it('should error with a NETWORK_ERROR when there is no fallback', () => {
    const { source } = failing();
    let received: unknown;

    service.handleHttpError(source, undefined, false).subscribe({ error: e => (received = e) });
    vi.advanceTimersByTime(7000);

    void expect(received).toMatchObject({ code: ErrorCode.NETWORK_ERROR, details: 'offline' });
    void expect(notifications.showError).not.toHaveBeenCalled();
  });

  it('should return the fallback and warn when a storage operation throws', () => {
    const result = service.safeStorageOperation(
      () => {
        throw new Error('quota');
      },
      'fallback',
      'Failed'
    );

    void expect(result).toBe('fallback');
    void expect(notifications.showWarning).toHaveBeenCalled();
    void expect(service.getErrorLog()[0]).toMatchObject({ code: ErrorCode.STORAGE_ERROR, details: 'quota' });
  });

  it('should keep only the latest 100 errors', () => {
    for (let i = 0; i < 105; i++) {
      service.createError(ErrorCode.UNEXPECTED_ERROR, `e${i}`);
    }
    const log = service.getErrorLog();
    void expect(log).toHaveLength(100);
    void expect(log[0].message).toBe('e5');
  });
});
