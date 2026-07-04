// src/app/app.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { timer, switchMap, catchError, of } from 'rxjs';
import { Api } from './core/api';
import { AlertasApi } from './features/alertas/alertas-api';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  healthStatus = signal('verificando...');
  sinLeer = signal(0);

  private apiService = inject(Api);
  private alertasApi = inject(AlertasApi);

  constructor() {
    // La campanita se refresca sola cada 60s: timer(0, 60000) emite al
    // arrancar y de ahí en más cada minuto; switchMap consulta el contador.
    // catchError DENTRO del switchMap: si una consulta falla (backend
    // caído), muere ESA consulta y el timer sigue intentando.
    timer(0, 60_000)
      .pipe(
        switchMap(() =>
          this.alertasApi.listarNotificaciones(true).pipe(catchError(() => of(null))),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((bandeja) => {
        if (bandeja) this.sinLeer.set(bandeja.sinLeer);
      });
  }

  ngOnInit(): void {
    this.apiService.get<{ status: string }>('health').subscribe({
      next: (res: { status: string }) => this.healthStatus.set(res.status),
      error: () => this.healthStatus.set('error conectando al backend'),
    });
  }
}
