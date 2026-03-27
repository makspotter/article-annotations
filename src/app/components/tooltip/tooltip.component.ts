import { Component, ElementRef, input, viewChild } from '@angular/core';

@Component({
  selector: 'app-tooltip',
  templateUrl: './tooltip.component.html',
  styleUrl: './tooltip.component.scss',
})
export class TooltipComponent {
  readonly text = input<string>('');
  readonly visible = input<boolean>(false);
  readonly position = input<'above' | 'below'>('above');
  readonly left = input<number>(0);
  readonly top = input<number>(0);
  readonly arrowX = input<number>(12);

  readonly root = viewChild<ElementRef<HTMLElement>>('root');

  getWidth(): number {
    const element = this.root()?.nativeElement;
    return element ? element.offsetWidth || 0 : 0;
  }

  getHeight(): number {
    const element = this.root()?.nativeElement;
    return element ? element.offsetHeight || 0 : 0;
  }
}
