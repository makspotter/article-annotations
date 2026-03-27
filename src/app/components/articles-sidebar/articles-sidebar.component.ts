import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { DatePipe } from '@angular/common';
import { RuPluralPipe } from '@pipes';
import { ArticlesService } from '@services';

@Component({
  selector: 'articles-sidebar',
  imports: [RouterLink, RouterLinkActive, DatePipe, RuPluralPipe],
  templateUrl: './articles-sidebar.component.html',
  styleUrl: './articles-sidebar.component.scss',
})
export class ArticlesSidebarComponent {
  readonly articlesService: ArticlesService = inject(ArticlesService);
  private readonly router = inject(Router);

  addArticle() {
    const article = this.articlesService.create('Новая статья');

    this.router.navigate(['/article', article.id]);
  }
}
