import { Component, ElementRef, signal, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ArticlesSidebarComponent, ModalHostComponent } from '@components';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, ArticlesSidebarComponent, ModalHostComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  readonly sidebarPanelRef = viewChild<ElementRef<HTMLElement>>('sidebarPanel');
  readonly burgerRef = viewChild<ElementRef<HTMLButtonElement>>('burger');
  readonly sidebarOpen = signal(false);

  private openerElement: HTMLElement | null = null;

  toggleSidebar() {
    if (this.sidebarOpen()) {
      this.closeSidebar();
    } else {
      this.openSidebar();
    }
  }

  openSidebar() {
    this.openerElement = (document.activeElement as HTMLElement) ?? null;
    this.sidebarOpen.set(true);
    queueMicrotask(() => this.sidebarPanelRef()?.nativeElement?.focus());
  }

  closeSidebar() {
    this.sidebarOpen.set(false);
    const element = this.openerElement || this.burgerRef()?.nativeElement || null;
    this.openerElement = null;
    queueMicrotask(() => element?.focus());
  }

  sidebarKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.closeSidebar();
    }
  }
}
