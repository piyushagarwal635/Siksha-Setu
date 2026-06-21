import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'dashboard/braille-testing',
    renderMode: RenderMode.Client
  },
  {
    path: 'dashboard/studentdashboard/course/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'dashboard/studentdashboard/course/:id/braille/:resourceId',
    renderMode: RenderMode.Server
  },
  {
    path: 'secure-test/:courseId',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
