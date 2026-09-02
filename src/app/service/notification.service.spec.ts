import { TestBed } from '@angular/core/testing';
import { ToastrModule, ToastrService } from 'ngx-toastr';

import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let toastr: ToastrService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ToastrModule.forRoot({ positionClass: 'toast-top-center' })]
    });
    service = TestBed.inject(NotificationService);
    toastr = TestBed.inject(ToastrService);
  });

  it('should be created', () => {
    void expect(service).toBeTruthy();
  });

  // Passing positionClass: undefined shadows the globally configured value.
  // ngx-toastr then defaults it to '' and classList.add('') throws a
  // SyntaxError, which aborts whatever game action raised the notification.
  it('should not send positionClass when the caller does not supply one', () => {
    const success = spyOn(toastr, 'success').and.callThrough();

    service.showSuccess('matched');

    const options = success.calls.mostRecent().args[2];
    void expect(options).toBeDefined();
    void expect('positionClass' in options!).toBeFalse();
  });

  it('should forward positionClass when the caller supplies one', () => {
    const info = spyOn(toastr, 'info').and.callThrough();

    service.showInfo('hint', 'Info', { positionClass: 'toast-bottom-right' });

    void expect(info.calls.mostRecent().args[2]?.positionClass).toBe('toast-bottom-right');
  });

  it('should show a success toast without throwing', () => {
    void expect(() => service.showSuccess('matched')).not.toThrow();
  });
});
