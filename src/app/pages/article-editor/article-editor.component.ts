import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ArticlesService, ModalService } from '@services';
import { Annotation, AnnotationBase, Article, Id, NewAnnotation } from '@models';
import { AnnotatedTextComponent } from '@components';

type EditorModeType = 'annotate' | 'edit';

@Component({
  selector: 'app-article-editor',
  imports: [AnnotatedTextComponent, ReactiveFormsModule],
  templateUrl: './article-editor.component.html',
  styleUrl: './article-editor.component.scss',
})
export class ArticleEditorComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly articlesService: ArticlesService = inject(ArticlesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly modal = inject(ModalService);

  readonly id = computed<Id | null>(() => this.paramMapSignal()?.get('id') ?? null);
  readonly article = computed<Article | undefined>(() => {
    const id = this.id();
    if (!id) {
      return undefined;
    }
    return this.articlesService.articles().find((article) => article.id === id);
  });

  readonly titleControl = new FormControl<string>('', { nonNullable: true });
  readonly textControl = new FormControl<string>('', { nonNullable: true });

  readonly mode = signal<EditorModeType>('annotate');
  readonly isEmpty = computed(() => {
    const article = this.article();
    return !article || article.text.trim().length === 0;
  });
  private lastModeInitForId: Id | null = null;

  private readonly paramMapSignal = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  constructor() {
    effect(() => {
      const article = this.article();
      const id = this.id();

      const nextTitle = article?.title ?? '';
      const nextText = article?.text ?? '';
      if (this.titleControl.value !== nextTitle) {
        this.titleControl.setValue(nextTitle, { emitEvent: false });
      }
      if (this.textControl.value !== nextText) {
        this.textControl.setValue(nextText, { emitEvent: false });
      }

      if (id && id !== this.lastModeInitForId) {
        const isEmpty = !article || article.text.trim().length === 0;
        this.mode.set(isEmpty ? 'edit' : 'annotate');
        this.lastModeInitForId = id;
      }
    });

    this.titleControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((title) => {
      const id = this.id();
      if (!id) {
        return;
      }
      const article = this.article();
      if (article && article.title === title) {
        return;
      }
      this.articlesService.update(id, { title });
    });
  }

  saveText() {
    const id = this.id();
    if (!id) {
      return;
    }
    const newText = this.textControl.value;
    const article = this.article();
    if (!article) {
      return;
    }
    const oldText = article.text;

    if (newText === oldText) {
      return;
    }

    const prefixLength = this.textPrefix(oldText, newText);
    const suffixLength = this.textSuffix(oldText, newText, prefixLength);
    const oldChangeStart = prefixLength;
    const oldChangeEnd = oldText.length - suffixLength;
    const delta = newText.length - oldText.length;

    const mapPosition = (position: number) => {
      if (position <= oldChangeStart) {
        return position;
      }
      if (position >= oldChangeEnd) {
        return position + delta;
      }
      return oldChangeStart;
    };

    const newLength = newText.length;
    const nextAnnotations = article.annotations
      .map((annotation) => {
        const start = Math.max(0, Math.min(newLength, mapPosition(annotation.start)));
        const end = Math.max(0, Math.min(newLength, mapPosition(annotation.end)));
        return start < end ? { ...annotation, start, end } : null;
      })
      .filter((annotation): annotation is Annotation => annotation !== null);

    this.articlesService.update(id, { text: newText, annotations: nextAnnotations });
  }

  addAnnotation(annotation: NewAnnotation) {
    const id = this.id();
    const article = this.article();
    if (!id || !article) {
      return;
    }
    const created: Annotation = { id: crypto.randomUUID(), ...annotation };
    this.articlesService.update(id, { annotations: [created, ...article.annotations] });
  }

  updateAnnotation(patch: AnnotationBase) {
    const id = this.id();
    const article = this.article();
    if (!id || !article) {
      return;
    }
    const annotations = article.annotations.map((annotation) =>
      annotation.id === patch.id
        ? { ...annotation, color: patch.color, note: patch.note }
        : annotation,
    );
    this.articlesService.update(id, { annotations });
  }

  removeAnnotation(annId: Id) {
    const id = this.id();
    const article = this.article();
    if (!id || !article) {
      return;
    }
    this.articlesService.update(id, {
      annotations: article.annotations.filter((annotation) => annotation.id !== annId),
    });
  }

  openDeleteDialog() {
    this.modal
      .confirm({
        title: 'Удалить статью?',
        message: `Действие необратимо. Статья «${this.article()?.title ?? ''}» будет удалена.`,
        confirmText: 'Удалить',
        cancelText: 'Отмена',
      })
      .pipe(
        filter((confirmed) => confirmed),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        const id = this.id();
        if (!id) {
          return;
        }
        this.articlesService.remove(id);
        this.router.navigate(['/']);
      });
  }

  cancelEdit() {
    const article = this.article();
    this.textControl.setValue(article?.text ?? '', { emitEvent: false });
  }

  clickAnnotate() {
    if (this.isEmpty()) {
      return;
    }
    this.mode.set('annotate');
  }

  private textPrefix(oldText: string, newText: string): number {
    const minLength = Math.min(oldText.length, newText.length);
    let i = 0;
    while (i < minLength && oldText.charCodeAt(i) === newText.charCodeAt(i)) {
      i++;
    }
    return i;
  }

  private textSuffix(oldText: string, newText: string, prefixLength: number): number {
    const oldTextLength = oldText.length;
    const newTextLength = newText.length;
    let i = 0;
    while (
      i < oldTextLength - prefixLength &&
      i < newTextLength - prefixLength &&
      oldText.charCodeAt(oldTextLength - 1 - i) === newText.charCodeAt(newTextLength - 1 - i)
    ) {
      i++;
    }
    return i;
  }
}
