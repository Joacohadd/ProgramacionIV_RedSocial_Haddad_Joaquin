import { Component, DestroyRef, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminService, AdminUser } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';
import { errorMessage } from '../../core/services/http-error';
import { AccountForm } from '../../shared/account-form';
import { AccountStateDirective } from '../../shared/trama-directives';
import { FullNamePipe, RoleLabelPipe } from '../../shared/trama-pipes';
import { Avatar, SiteHeader } from '../../shared/ui';
import { DashboardHeader } from './dashboard-header';

@Component({
  imports: [SiteHeader, DashboardHeader, Avatar, AccountForm, AccountStateDirective, FullNamePipe, RoleLabelPipe],
  templateUrl: './users.page.html',
})
export class AdminUsersPage implements OnInit {
  private readonly api = inject(AdminService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly createDialog = viewChild.required<ElementRef<HTMLDialogElement>>('createDialog');
  private readonly statusDialog = viewChild.required<ElementRef<HTMLDialogElement>>('statusDialog');
  readonly auth = inject(AuthService);
  readonly users = signal<AdminUser[]>([]);
  readonly query = signal('');
  readonly loading = signal(false);
  readonly loadError = signal('');
  readonly creating = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal('');
  readonly target = signal<AdminUser | null>(null);
  readonly updating = signal(false);
  readonly statusError = signal('');
  readonly notice = signal('');
  readonly activeCount = computed(() => this.users().filter(user => user.active).length);
  readonly visibleUsers = computed(() => {
    const query = this.query().trim().toLocaleLowerCase('es').replace(/^@/, '');
    return this.users().filter(user =>
      `${user.nombre} ${user.apellido} ${user.username} ${user.email}`.toLocaleLowerCase('es').includes(query));
  });

  ngOnInit() { this.load(); }

  search(event: Event) { this.query.set((event.target as HTMLInputElement).value); }

  load() {
    if (this.loading()) return;
    this.loading.set(true);
    this.loadError.set('');
    this.api.users().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: users => { this.users.set(users); this.loading.set(false); },
      error: error => { this.loadError.set(errorMessage(error)); this.loading.set(false); },
    });
  }

  openForm() {
    this.saveError.set('');
    this.notice.set('');
    this.creating.set(true);
    this.createDialog().nativeElement.showModal();
  }

  closeForm(event?: Event) {
    event?.preventDefault();
    if (this.saving()) return;
    this.createDialog().nativeElement.close();
    this.creating.set(false);
  }

  createUser(data: FormData) {
    if (this.saving()) return;
    this.saving.set(true);
    this.saveError.set('');
    this.api.createUser(data).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: user => {
        this.saving.set(false);
        this.closeForm();
        this.query.set('');
        this.notice.set(`Cuenta de ${user.nombre} ${user.apellido} creada.`);
        this.load();
      },
      error: error => { this.saveError.set(errorMessage(error)); this.saving.set(false); },
    });
  }

  askStatus(user: AdminUser) {
    this.target.set(user);
    this.statusError.set('');
    this.notice.set('');
    this.statusDialog().nativeElement.showModal();
  }

  closeStatus(event?: Event) {
    event?.preventDefault();
    if (this.updating()) return;
    this.statusDialog().nativeElement.close();
    this.target.set(null);
  }

  updateStatus() {
    const target = this.target();
    if (!target || this.updating()) return;
    this.updating.set(true);
    this.statusError.set('');
    this.api.setActive(target.id, !target.active).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: user => {
        this.users.update(users => users.map(item => item.id === user.id ? user : item));
        this.updating.set(false);
        this.closeStatus();
        this.notice.set(user.active ? 'Cuenta habilitada.' : 'Cuenta deshabilitada.');
      },
      error: error => { this.statusError.set(errorMessage(error)); this.updating.set(false); },
    });
  }
}
