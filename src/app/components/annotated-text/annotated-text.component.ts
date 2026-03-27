import {
  Component,
  ElementRef,
  computed,
  input,
  output,
  signal,
  viewChild,
  inject,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, take } from 'rxjs';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalService, DesignTokensService } from '@services';
import { AnchorRect, Annotation, AnnotationBase, Id, NewAnnotation, Segment } from '@models';
import { TooltipComponent, AnnotationPopoverComponent } from '@components';

const CSS_MARGIN_VAR = '--size-50';
const CSS_TOP_GUARD_VAR = '--tooltip-top-guard';
const CSS_ARROW_SIZE_VAR = '--tooltip-arrow-size';

@Component({
  selector: 'annotated-text',
  imports: [TooltipComponent, AnnotationPopoverComponent, ReactiveFormsModule],
  templateUrl: './annotated-text.component.html',
  styleUrl: './annotated-text.component.scss',
})
export class AnnotatedTextComponent {
  readonly text = input.required<string>();
  readonly annotations = input.required<Annotation[]>();

  readonly addAnnotation = output<NewAnnotation>();
  readonly updateAnnotation = output<AnnotationBase>();
  readonly removeAnnotation = output<Id>();

  private readonly modal = inject(ModalService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly tokens = inject(DesignTokensService);

  readonly host = viewChild<ElementRef<HTMLElement>>('host');
  readonly tooltipRef = viewChild<TooltipComponent>('tip');

  anchorRect: AnchorRect | null = null;

  readonly segments = computed<Segment[]>(() => {
    const text = this.text();
    const annotations = [...this.annotations()].sort((a, b) => a.start - b.start);
    const segments: Segment[] = [];
    let i = 0;
    for (const annotation of annotations) {
      if (annotation.start > i) {
        segments.push({
          type: 'plain',
          text: text.slice(i, annotation.start),
        });
      }

      if (annotation.end > annotation.start) {
        segments.push({
          type: 'annotation',
          text: text.slice(annotation.start, annotation.end),
          id: annotation.id,
          color: annotation.color,
          note: annotation.note,
        });
      }
      i = Math.max(i, annotation.end);
    }

    if (i < text.length) {
      segments.push({
        type: 'plain',
        text: text.slice(i),
      });
    }

    return segments;
  });

  readonly popover = {
    visible: signal(false),
    left: signal(0),
    top: signal(0),
    mode: signal<'create' | 'edit'>('create'),
    targetId: signal<Id | null>(null),
    range: null as null | { start: number; end: number },
  };

  readonly popoverForm = new FormGroup({
    color: new FormControl<string>('#ff0000', { nonNullable: true }),
    note: new FormControl<string>('', {
      validators: [Validators.pattern(/\S/), Validators.required],
      nonNullable: true,
    }),
  });

  readonly tooltip = {
    visible: signal(false),
    left: signal(0),
    top: signal(0),
    text: signal(''),
    pos: signal<'above' | 'below'>('above'),
    arrowX: signal(12),
    follow: signal(false),
  };

  private pointerDownOnAnnotation = false;

  constructor() {
    fromEvent(window, 'resize')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.popover.visible()) {
          this.hidePopover();
        }
        if (this.tooltip.visible()) {
          this.hideTooltip();
        }
      });
  }

  pointerDown(event: PointerEvent) {
    const target = event.target as HTMLElement | null;
    if (target && target.closest('.annotation')) {
      this.pointerDownOnAnnotation = true;
      return;
    }
    this.pointerDownOnAnnotation = false;
    this.hidePopover();
  }

  pointerUp() {
    if (this.pointerDownOnAnnotation) {
      this.pointerDownOnAnnotation = false;
      return;
    }

    const container = this.host()?.nativeElement;
    if (!container) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (range.collapsed) {
      this.hidePopover();
      return;
    }

    if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
      this.hidePopover();
      return;
    }

    const start0 = this.offsetFromRangeBoundary(container, range.startContainer, range.startOffset);
    const end0 = this.offsetFromRangeBoundary(container, range.endContainer, range.endOffset);
    if (start0 === null || end0 === null || end0 <= start0) {
      this.hidePopover();
      return;
    }

    // Trim leading and trailing whitespace from the selected range
    const article = this.text();
    let start = start0;
    let end = end0;
    while (start < end && /\s/.test(article[start])) {
      start++;
    }
    while (end > start && /\s/.test(article[end - 1])) {
      end--;
    }

    if (end <= start) {
      this.hidePopover();
      try {
        const selection = window.getSelection();
        selection?.removeAllRanges();
      } catch {}

      this.modal
        .confirm({
          title: 'Пустое выделение',
          message: 'Выделение содержит только пробелы. Пожалуйста, уточните выделение.',
          confirmText: 'OK',
          cancelText: '',
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();

      return;
    }

    const overlaps = this.annotations().some(
      (annotation) => Math.max(annotation.start, start) < Math.min(annotation.end, end),
    );

    if (overlaps) {
      this.hidePopover();
      try {
        const selection = window.getSelection();
        selection?.removeAllRanges();
      } catch {}

      this.suppressNextClick();
      this.modal
        .confirm({
          title: 'Конфликт аннотаций',
          message: 'Новая аннотация пересекается с существующей. Сначала уточните выделение.',
          confirmText: 'OK',
          cancelText: '',
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();
      return;
    }

    const rect = range.getBoundingClientRect();
    this.anchorRect = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    this.popoverForm.setValue({ color: '#ff0000', note: '' }, { emitEvent: false });
    this.popover.mode.set('create');
    this.popover.targetId.set(null);
    this.popover.range = { start, end };
    this.popover.visible.set(true);
  }

  hidePopover() {
    this.popover.visible.set(false);
    this.popover.mode.set('create');
    this.popover.targetId.set(null);
    this.popover.range = null;
  }

  confirmPopover() {
    if (this.popoverForm.invalid) {
      return;
    }

    const color = this.normalizeColor(this.popoverForm.controls.color.value);
    const note = this.popoverForm.controls.note.value.trim();
    if (this.popover.mode() === 'create') {
      if (!this.popover.range) {
        return;
      }
      const { start, end } = this.popover.range;
      this.addAnnotation.emit({ start, end, color, note });
    } else {
      const id = this.popover.targetId();
      if (!id) {
        return;
      }
      this.updateAnnotation.emit({ id, color, note });
    }
    this.hidePopover();
  }

  onPopoverDelete() {
    const id = this.popover.targetId();
    if (id) {
      this.removeAnnotation.emit(id);
      this.hidePopover();
    }
  }

  showTooltip(event: MouseEvent, text: string | undefined) {
    if (!text) {
      return;
    }
    const element = (event.currentTarget || event.target) as HTMLElement;
    const rects = Array.from(element.getClientRects());
    let boundingRect = element.getBoundingClientRect();
    const y = event.clientY;
    // Try to find the line box under cursor; otherwise pick the nearest by center Y
    let bestIdx = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    rects.forEach((rect, i) => {
      if (y >= rect.top && y <= rect.bottom) {
        bestIdx = i;
        bestDistance = 0;
      } else {
        const cy = (rect.top + rect.bottom) / 2;
        const d = Math.abs(cy - y);
        if (d < bestDistance) {
          bestDistance = d;
          bestIdx = i;
        }
      }
    });

    if (bestIdx >= 0) {
      boundingRect = rects[bestIdx] as DOMRect;
    }

    const isMultiline = rects.length > 1;
    const margin = this.tokens.getNumber(CSS_MARGIN_VAR, 8);
    const topGuard = this.tokens.getNumber(CSS_TOP_GUARD_VAR, 40);
    const anchorX =
      (isMultiline ? event.clientX : (boundingRect.left + boundingRect.right) / 2) + window.scrollX;
    // Place above for multiline; otherwise choose based on available space
    const placeBelow = isMultiline ? false : boundingRect.top < topGuard;
    const top = isMultiline
      ? event.clientY + window.scrollY - margin
      : placeBelow
        ? boundingRect.bottom + window.scrollY + margin
        : boundingRect.top + window.scrollY - margin;

    this.tooltip.pos.set(placeBelow ? 'below' : 'above');
    this.tooltip.top.set(top);
    this.tooltip.text.set(text);
    this.tooltip.visible.set(false);
    this.tooltip.follow.set(isMultiline);

    // Wait for DOM to update, then center and clamp horizontally around anchorX
    requestAnimationFrame(() => {
      this.placeTooltipX(anchorX);
      this.tooltip.visible.set(true);
    });
  }

  tooltipMove(event: MouseEvent) {
    if (!this.tooltip.visible() || !this.tooltip.follow()) {
      return;
    }

    const tip = this.tooltipRef();
    if (!tip) {
      return;
    }

    const margin = this.tokens.getNumber(CSS_MARGIN_VAR, 8);
    const anchorX = event.clientX + window.scrollX;
    const anchorY = event.clientY + window.scrollY;
    this.placeTooltipX(anchorX);
    // keep tooltip above cursor and in viewport vertically
    const tipHeight = tip.getHeight() || 0;
    const minTop = window.scrollY + margin + tipHeight; // because translateY(-100%)
    const desiredTop = anchorY - margin;
    this.tooltip.top.set(Math.max(minTop, desiredTop));
  }

  hideTooltip() {
    this.tooltip.visible.set(false);
  }

  annotationClick(event: MouseEvent, id: Id) {
    if (this.modal.open()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const annotation = this.annotations().find((a) => a.id === id);
    if (!annotation) {
      return;
    }

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const wasVisible = this.popover.visible();
    const prevId = this.popover.targetId();

    this.popoverForm.setValue(
      { color: annotation.color, note: annotation.note },
      { emitEvent: false },
    );
    this.popover.mode.set('edit');
    this.popover.range = null;

    // If already open for the same annotation — keep position intact to prevent drift
    if (wasVisible && prevId === id) {
      return;
    }

    this.popover.targetId.set(id);
    this.anchorRect = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    this.popover.visible.set(true);
  }

  private suppressNextClick() {
    fromEvent<MouseEvent>(window, 'click', { capture: true })
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        event.preventDefault();
        event.stopPropagation();
      });
  }

  private normalizeColor(hex: string): string {
    const color = hex.trim().toLowerCase();
    if (color === '#fff' || color === '#ffffff') {
      return '#e5e7eb'; // light gray instead of white for visibility on a white background
    }
    return color;
  }

  private offsetFromRangeBoundary(
    container: HTMLElement,
    node: Node,
    nodeOffset: number,
  ): number | null {
    // Traverse only text nodes that belong to our segment spans to avoid
    // counting template whitespaces/newlines introduced by Angular.
    let offset = 0;
    const filter = {
      acceptNode: (node: Node) => {
        const parent = (node as Text).parentElement;
        return parent && parent.classList.contains('segment')
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      },
    } as unknown as NodeFilter;

    const treeWalker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, filter);
    let current: Node | null = treeWalker.nextNode();
    while (current) {
      const textContent = current.textContent ?? '';
      if (current === node) {
        return offset + Math.min(nodeOffset, textContent.length);
      }
      offset += textContent.length;
      current = treeWalker.nextNode();
    }
    return null;
  }

  private placeTooltipX(anchorX: number): void {
    const tip = this.tooltipRef();
    const width = tip ? tip.getWidth() : 0;
    if (!width) {
      return;
    }

    const margin = this.tokens.getNumber(CSS_MARGIN_VAR, 8);
    const arrowSize = this.tokens.getNumber(CSS_ARROW_SIZE_VAR, 6);
    const minLeft = window.scrollX + margin;
    const maxLeft = window.scrollX + window.innerWidth - width - margin;
    let left = Math.round(anchorX - width / 2);
    left = Math.max(minLeft, Math.min(maxLeft, left));
    let arrowX = Math.round(anchorX - left);
    arrowX = Math.max(arrowSize, Math.min(width - arrowSize, arrowX));
    this.tooltip.left.set(left);
    this.tooltip.arrowX.set(arrowX);
  }
}
