import { Component, DestroyRef, ElementRef, inject, viewChild } from '@angular/core';
import { fromEvent, EMPTY, filter, switchMap, tap } from 'rxjs';
import { ModalService } from '@services';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-modal-host',
  templateUrl: './modal-host.component.html',
  styleUrl: './modal-host.component.scss',
})
export class ModalHostComponent {
  protected readonly modalService = inject(ModalService);
  private readonly destroyRef = inject(DestroyRef);

  readonly modalRef = viewChild<ElementRef<HTMLDivElement>>('dialog');
  readonly guardStart = viewChild<ElementRef<HTMLDivElement>>('guardStart');
  readonly guardEnd = viewChild<ElementRef<HTMLDivElement>>('guardEnd');

  constructor() {
    const open$ = toObservable(this.modalService.open);
    open$
      .pipe(
        tap((isOpen) => {
          if (isOpen) {
            queueMicrotask(() => this.focusFirst());
          }
        }),
        switchMap((isOpen) => (isOpen ? fromEvent<KeyboardEvent>(window, 'keydown') : EMPTY)),
        filter((evt) => evt.key === 'Escape'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        event.preventDefault();
        event.stopPropagation();
        this.modalService.resolve(false);
      });

    this.destroyRef.onDestroy(() => {
      this.modalService.close();
    });
  }

  focusFirst() {
    const root = this.modalRef()?.nativeElement;
    if (!root) {
      return;
    }

    const focusable = this.getFocusable(root);
    (focusable[0] ?? root).focus();
  }

  focusLast() {
    const root = this.modalRef()?.nativeElement;
    if (!root) {
      return;
    }

    const focusable = this.getFocusable(root);
    (focusable[focusable.length - 1] ?? root).focus();
  }

  modalKeydown(event: KeyboardEvent) {
    if (event.key !== 'Tab') {
      return;
    }

    const root = this.modalRef()?.nativeElement;
    if (!root) {
      return;
    }

    const focusables = this.getFocusable(root);
    if (!focusables.length) {
      event.preventDefault();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey) {
      if (!active || active === first) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (!active || active === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  confirm() {
    this.modalService.resolve(true);
  }

  cancel() {
    this.modalService.resolve(false);
  }

  private getFocusable(root: HTMLElement): HTMLElement[] {
    const list = Array.from(
      root.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    );
    return list.filter(
      (element) =>
        !element.hasAttribute('disabled') && element.tabIndex !== -1 && this.isVisible(element),
    );
  }

  private isVisible(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    return !!(rect.width || rect.height || element.getClientRects().length);
  }
}
