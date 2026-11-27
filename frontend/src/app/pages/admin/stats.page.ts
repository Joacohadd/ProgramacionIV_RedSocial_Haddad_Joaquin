import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService, CountByLabel, DailyCount, StatsRange } from '../../core/services/admin.service';
import { errorMessage } from '../../core/services/http-error';
import { ExcerptPipe } from '../../shared/trama-pipes';
import { SiteHeader } from '../../shared/ui';
import { DashboardHeader } from './dashboard-header';
import { DailyActivityChart, RankedActivityChart } from './activity-charts';

const day = 86_400_000;
const chartColors = ['#3048d8', '#c7df40', '#f39874', '#6387b8', '#884578', '#2e806b', '#d1d7e7'];

@Component({
  imports: [SiteHeader, DashboardHeader, ReactiveFormsModule, ExcerptPipe, DailyActivityChart, RankedActivityChart],
  templateUrl: './stats.page.html',
})
export class AdminStatsPage implements OnInit {
  private readonly api = inject(AdminService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly form = this.fb.group({
    from: [new Date(Date.now() - 29 * day).toISOString().slice(0, 10), Validators.required],
    to: [new Date().toISOString().slice(0, 10), Validators.required],
  });
  readonly range = signal<StatsRange | null>(null);
  readonly posts = signal<CountByLabel[]>([]);
  readonly days = signal<DailyCount[]>([]);
  readonly comments = signal<CountByLabel[]>([]);
  readonly logins = signal<CountByLabel[]>([]);
  readonly profileVisits = signal<DailyCount[]>([]);
  readonly likes = signal<DailyCount[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly commentTotal = computed(() => this.days().reduce((sum, row) => sum + row.count, 0));
  readonly slices = computed(() => {
    const rows = this.comments();
    const visible = rows.slice(0, 6);
    if (rows.length > visible.length) {
      visible.push({ id: 'otros', label: 'Otras publicaciones', count: rows.slice(6).reduce((sum, row) => sum + row.count, 0) });
    }
    return visible.map((row, index) => ({ ...row, color: chartColors[index] }));
  });
  readonly ring = computed(() => {
    const slices = this.slices();
    const total = slices.reduce((sum, slice) => sum + slice.count, 0);
    if (total === 0) return '';
    let consumed = 0;
    const segments = slices.map(({ color, count }) => {
      const start = consumed * 100 / total;
      consumed += count;
      return `${color} ${start}% ${consumed * 100 / total}%`;
    });
    return `conic-gradient(${segments.join(', ')})`;
  });

  ngOnInit() { this.load(); }

  load() {
    if (this.loading()) return;
    this.form.markAllAsTouched();
    const range = this.form.getRawValue();
    if (this.form.invalid || range.from > range.to) {
      this.error.set('Elegí un rango válido. Desde debe ser anterior o igual a Hasta.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.api.stats(range).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: data => {
        this.posts.set(data.posts);
        this.days.set(data.days);
        this.comments.set(data.comments);
        this.logins.set(data.logins);
        this.profileVisits.set(data.profileVisits);
        this.likes.set(data.likes);
        this.range.set(range);
        this.loading.set(false);
      },
      error: error => { this.error.set(errorMessage(error)); this.loading.set(false); },
    });
  }
}
