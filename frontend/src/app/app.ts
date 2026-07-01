// src/app/app.ts

import { Component, OnInit } from '@angular/core';
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
  healthStatus = 'verificando...';

  private apiService = inject(Api);  // ← inject() en lugar de constructor

  ngOnInit(): void {
    this.apiService.get<{ status: string }>('health').subscribe({
      next: (res) => (this.healthStatus = res.status),
      error: () => (this.healthStatus = 'error conectando al backend'),
    });
  }
}