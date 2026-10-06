import { TestBed } from '@angular/core/testing';
import { ToastService } from '../service/toast.service';

import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let toastr: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: []
    });
    service = TestBed.inject(NotificationService);
    toastr = TestBed.inject(ToastService);
  });

  it('should be created', () => {
    void expect(service).toBeTruthy();
  });

  // Passing positionClass: undefined shadows the globally configured value.
  // ngx-toastr then defaults it to '' and classList.add('') throws a
  // SyntaxError, which aborts whatever game action raised the notification.
  it('should not send positionClass when the caller does not supply one', () => {
    const success = vi.spyOn(toastr, 'success');

    service.showSuccess('matched');

    const options = success.mock.lastCall?.[2];
    void expect(options).toBeDefined();
    void expect('positionClass' in options!).toBe(false);
  });

  it('should forward positionClass when the caller supplies one', () => {
    const info = vi.spyOn(toastr, 'info');

    service.showInfo('hint', 'Info', { positionClass: 'toast-bottom-right' });

    void expect(info.mock.lastCall?.[2]?.positionClass).toBe('toast-bottom-right');
  });

  it('should show a success toast without throwing', () => {
    void expect(() => service.showSuccess('matched')).not.toThrow();
  });
});
