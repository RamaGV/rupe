// src/app/core/organismos-api.ts
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs';
import { Api } from './api';

// Espejo de GET /organismos (la codiguera oficial de incisos).
// Vive en core/ y no en una feature: es dato de REFERENCIA que
// consumen tanto los filtros de licitaciones como el form de alertas.
export interface OrganismoCodiguera {
  inciso: number;
  nombre: string;
}

@Service()
export class OrganismosApi {
  private api = inject(Api);

  // shareReplay(1): la codiguera son 73 filas que cambian un puñado de
  // veces al año — una sola request por sesión aunque la pidan varios
  // componentes; todos comparten la misma respuesta cacheada.
  private organismos$ = this.api
    .get<OrganismoCodiguera[]>('organismos')
    .pipe(shareReplay(1));

  getOrganismos(): Observable<OrganismoCodiguera[]> {
    return this.organismos$;
  }
}
