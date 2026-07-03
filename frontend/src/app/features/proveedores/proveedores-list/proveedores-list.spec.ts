import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProveedoresList } from './proveedores-list';

describe('ProveedoresList', () => {
  let component: ProveedoresList;
  let fixture: ComponentFixture<ProveedoresList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProveedoresList],
    }).compileComponents();

    fixture = TestBed.createComponent(ProveedoresList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
