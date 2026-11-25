import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService, CountByLabel, DailyCount, StatsRange } from '../../core/services/admin.service';
import { errorMessage } from '../../core/services/http-error';
import { ExcerptPipe } from '../../shared/trama-pipes';
import { SiteHeader } from '../../shared/ui';
import { DashboardHeader } from './dashboard-header';

const day = 86_400_000;
const chartColors = ['#3048d8', '#c7df40', '#f39874', '#6387b8', '#884578', '#2e806b', '#d1d7e7'];

@Component({
  imports: [SiteHeader, DashboardHeader, DatePipe, ReactiveFormsModule, ExcerptPipe],
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
  readonly loading = signal(false);
  readonly error = signal('');
  readonly postTotal = computed(() => this.posts().reduce((sum, row) => sum + row.count, 0));
  readonly commentTotal = computed(() => this.days().reduce((sum, row) => sum + row.count, 0));
  readonly maxPosts = computed(() => this.posts().reduce((max, row) => Math.max(max, row.count), 1));
  readonly maxDaily = computed(() => this.days().reduce((max, row) => Math.max(max, row.count), 1));
  readonly linePoints = computed(() => {
    const range = this.range();
    const rows = this.days();
    if (!range || !rows.length) return [];
    const first = Date.parse(range.from);
    const last = Date.parse(range.to);
    const positions = new Map<number, number>([[first, 0], [last, 0]]);
    for (const { date, count } of rows) {
      const time = Date.parse(date);
      if (time > first && !positions.has(time - day)) positions.set(time - day, 0);
      if (time < last && !positions.has(time + day)) positions.set(time + day, 0);
      positions.set(time, count);
    }
    return [...positions].sort(([a], [b]) => a - b).map(([date, count]) => ({
      x: first === last ? 350 : 20 + (date - first) * 660 / (last - first),
      y: 155 - count * 130 / this.maxDaily(),
      count,
      date,
    }));
  });
  readonly polyline = computed(() => this.linePoints().map(({ x, y }) => `${x},${y}`).join(' '));
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
        this.range.set(range);
        this.loading.set(false);
      },
      error: error => { this.error.set(errorMessage(error)); this.loading.set(false); },
    });
  }
}
