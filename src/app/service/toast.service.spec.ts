import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  const toasts = (): HTMLElement[] => Array.from(document.querySelectorAll<HTMLElement>('.app-toast'));

  beforeEach(() => {
    vi.useFakeTimers();
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    service.clear();
    document.querySelector('.app-toast-container')?.remove();
    vi.useRealTimers();
  });

  it('should render message and title as text, never as HTML', () => {
    service.error('<img src=x onerror=alert(1)>', '<b>title</b>');

    const [toast] = toasts();
    void expect(toast.querySelector('img')).toBeNull();
    void expect(toast.querySelector('b')).toBeNull();
    void expect(toast.textContent).toContain('<img src=x onerror=alert(1)>');
    void expect(toast.getAttribute('role')).toBe('alert');
  });

  it('should drop duplicates unless asked not to', () => {
    service.info('same', 't');
    service.info('same', 't');
    void expect(toasts()).toHaveLength(1);

    service.info('same', 't', { preventDuplicates: false });
    void expect(toasts()).toHaveLength(2);
  });

  it('should dismiss after the timeout and on the close button', () => {
    service.success('auto', '', { timeOut: 1000 });
    service.warning('manual', '', { timeOut: 0 });
    void expect(toasts()).toHaveLength(2);

    vi.advanceTimersByTime(1000);
    void expect(toasts().map(t => t.textContent)).toEqual([expect.stringContaining('manual')]);

    toasts()[0].querySelector('button')?.click();
    void expect(toasts()).toHaveLength(0);
  });
});
