// src/app/features/guardadas/guardadas-page.ts
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Guardadas } from '../../core/guardadas';

@Component({ selector: 'app-guardadas-page', standalone: true, imports: [RouterLink], templateUrl: './guardadas-page.html' })
export class GuardadasPage {
  guardadas = inject(Guardadas);
}
