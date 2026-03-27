import {
  Component,
  ElementRef,
  ViewChild,
  signal,
  input,
  output,
  effect,
  inject,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AnchorRect } from '@models';
import { DesignTokensService } from '@services';

const CSS_MARGIN_VAR = '--size-50';
const CSS_GAP_VAR = '--gap-popover';

@Component({
  selector: 'app-annotation-popover',
  imports: [ReactiveFormsModule],
  templateUrl: './annotation-popover.component.html',
  styleUrl: './annotation-popover.component.scss',
})
export class AnnotationPopoverComponent {
  readonly visible = input<boolean>(false);
  readonly mode = input<'create' | 'edit'>('create');
  readonly form = input.required<FormGroup>();
  readonly anchorRect = input<AnchorRect | null>(null);

  readonly confirm = output<void>();
  readonly remove = output<void>();
  readonly cancel = output<void>();

  @ViewChild('popover', { static: true }) popoverRef?: ElementRef<HTMLElement>;

  private readonly designTokensService = inject(DesignTokensService);

  left = signal(0);
  top = signal(0);
  ready = signal(false);

  private animationId: number | null = null;

  constructor() {
    effect(() => {
      this.ready.set(false);
      if (this.visible() && this.anchorRect()) {
        this.schedulePosition();
      }
    });
  }

  private schedulePosition(retries = 3): void {
    if (this.animationId != null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.animationId = requestAnimationFrame(() => {
      const element = this.popoverRef?.nativeElement;
      // If element is not yet attached or has no size, try again next frame
      if ((!element || (!element.offsetWidth && !element.offsetHeight)) && retries > 0) {
        this.schedulePosition(retries - 1);
        return;
      }
      this.positionNow();
      this.ready.set(true);
      this.animationId = null;
    });
  }

  private positionNow(): void {
    const element = this.popoverRef?.nativeElement;
    const anchorRect = this.anchorRect();
    if (!element || !anchorRect) {
      return;
    }

    const width = element.offsetWidth || 0;
    const height = element.offsetHeight || 0;
    const margin = this.designTokensService.getNumber(CSS_MARGIN_VAR, 8);
    const gap = this.designTokensService.getNumber(CSS_GAP_VAR, 6);

    // Horizontal clamp to viewport
    const desiredLeft = Math.round(anchorRect.left + window.scrollX);
    const minLeft = window.scrollX + margin;
    const maxLeft = window.scrollX + window.innerWidth - margin - width;
    const left = Math.max(minLeft, Math.min(maxLeft, desiredLeft));

    // Vertical: prefer below, flip above if not enough space
    const viewportTop = window.scrollY + margin;
    const viewportBottom = window.scrollY + window.innerHeight - margin;
    const spaceBelow = viewportBottom - (anchorRect.bottom + window.scrollY);
    const spaceAbove = anchorRect.top + window.scrollY - viewportTop;
    let top: number;
    if (spaceBelow >= height + gap || spaceBelow >= spaceAbove) {
      top = anchorRect.bottom + window.scrollY + gap;
    } else {
      top = anchorRect.top + window.scrollY - gap - height;
    }
    top = Math.max(viewportTop, Math.min(viewportBottom - height, Math.round(top)));

    this.left.set(left);
    this.top.set(top);
  }
}
