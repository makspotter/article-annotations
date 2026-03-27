import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/welcome/welcome.component').then((m) => m.WelcomeComponent),
      },
      {
        path: 'article/:id',
        loadComponent: () =>
          import('./pages/article-editor/article-editor.component').then(
            (m) => m.ArticleEditorComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
