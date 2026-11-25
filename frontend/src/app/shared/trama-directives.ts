import { Directive, ElementRef, TemplateRef, ViewContainerRef, afterNextRender, effect, inject, input } from '@angular/core';
import { AuthService } from '../core/services/auth.service';

@Directive({ selector: '[appSoloAdmin]' })
export class AdminOnlyDirective {
  private readonly template = inject(TemplateRef<unknown>);
  private readonly view = inject(ViewContainerRef);
  private readonly auth = inject(AuthService);

  constructor() {
    effect(() => {
      if (this.auth.user()?.role === 'administrador') {
        if (!this.view.length) this.view.createEmbeddedView(this.template);
      } else {
        this.view.clear();
      }
    });
  }
}

@Directive({ selector: '[appFocoInicial]' })
export class InitialFocusDirective {
  readonly enabled = input(true, { alias: 'appFocoInicial' });
  private readonly field = inject(ElementRef<HTMLElement>);

  constructor() {
    afterNextRender(() => {
      if (this.enabled()) this.field.nativeElement.focus({ preventScroll: true });
    });
  }
}

@Directive({
  selector: '[appEstadoCuenta]',
  host: { '[class.account-state]': 'true', '[class.account-state-inactive]': '!active()' },
})
export class AccountStateDirective {
  readonly active = input.required<boolean>({ alias: 'appEstadoCuenta' });
}
