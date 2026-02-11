import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly pendingRequestsCounter = new BehaviorSubject(0);
  private readonly isLoadingStream: Observable<boolean> = this.pendingRequestsCounter.pipe(
    map(counter => counter > 0),
    distinctUntilChanged()
  );

  readonly isLoading$ = this.isLoadingStream;

  show(): void {
    const current = this.pendingRequestsCounter.value;
    this.pendingRequestsCounter.next(current + 1);
  }

  hide(): void {
    const current = this.pendingRequestsCounter.value;
    this.pendingRequestsCounter.next(Math.max(0, current - 1));
  }

  reset(): void {
    this.pendingRequestsCounter.next(0);
  }
}
