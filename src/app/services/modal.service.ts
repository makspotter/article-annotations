import { Injectable, Renderer2, RendererFactory2, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';

interface ConfirmOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
}

@Injectable({ providedIn: 'root' })
export class ModalService {
  readonly open = signal(false);
  readonly title = signal<string>('');
  readonly message = signal<string>('');
  readonly confirmText = signal<string>('OK');
  readonly cancelText = signal<string>('Отмена');

  private resultSubject: Subject<boolean> | null = null;
  private renderer: Renderer2;
  private prevOverflow: string | null = null;

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  confirm(options: ConfirmOptions = {}): Observable<boolean> {
    this.title.set(options.title ?? 'Подтверждение');
    this.message.set(options.message ?? 'Вы уверены?');
    this.confirmText.set(options.confirmText ?? 'OK');
    this.cancelText.set(options.cancelText ?? 'Отмена');

    this.open.set(true);

    const body = document.body;
    this.prevOverflow = body.style.overflow || '';
    this.renderer.setStyle(body, 'overflow', 'hidden');
    this.renderer.addClass(body, 'modal-open');

    this.resultSubject = new Subject<boolean>();

    return this.resultSubject.asObservable();
  }

  resolve(result: boolean) {
    if (this.resultSubject) {
      this.resultSubject.next(result);
      this.resultSubject.complete();
      this.resultSubject = null;
    }

    this.close();
  }

  close() {
    if (this.open()) {
      this.open.set(false);
      const body = document.body;
      this.renderer.setStyle(body, 'overflow', this.prevOverflow ?? '');
      this.renderer.removeClass(body, 'modal-open');
      this.prevOverflow = null;
    }
  }
}
