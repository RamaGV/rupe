// src/app/app.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Api } from './core/api';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  healthStatus = signal('verificando...');  // ← Signal en lugar de string

  private apiService = inject(Api);

  ngOnInit(): void {
    this.apiService.get<{ status: string }>('health').subscribe({
      next: (res: { status: string }) => this.healthStatus.set(res.status),  // ← .set()
      error: () => this.healthStatus.set('error conectando al backend'),
    });
  }
}