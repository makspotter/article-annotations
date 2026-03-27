import { Injectable, effect, signal } from '@angular/core';
import { Article, Id } from '@models';
import { StorageService } from './storage.service';

const STORAGE_KEY = 'articles';

@Injectable({ providedIn: 'root' })
export class ArticlesService {
  readonly articles = signal<Article[]>([]);

  constructor(private storage: StorageService) {
    const articles = storage.getItem<Article[]>(STORAGE_KEY, []);
    this.articles.set(articles);

    effect(() => {
      const articles = this.articles();
      this.storage.setItem(STORAGE_KEY, articles);
    });
  }

  create(title: string, text = ''): Article {
    const now = Date.now();
    const article: Article = {
      id: crypto.randomUUID(),
      title: title.trim() || 'Без названия',
      text,
      annotations: [],
      createdAt: now,
      updatedAt: now,
    };

    this.articles.update((articles) => [article, ...articles]);

    return article;
  }

  update(id: Id, patchArticle: Partial<Pick<Article, 'title' | 'text' | 'annotations'>>): void {
    this.articles.update((list) =>
      list.map((article) =>
        article.id === id
          ? {
              ...article,
              ...patchArticle,
              updatedAt: Date.now(),
            }
          : article,
      ),
    );
  }

  remove(id: Id): void {
    this.articles.update((articles) => articles.filter((a) => a.id !== id));
  }
}
