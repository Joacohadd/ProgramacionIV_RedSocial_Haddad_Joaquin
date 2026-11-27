import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import type { CountByLabel, DailyCount, StatsRange } from '../../core/services/admin.service';

@Component({
  selector: 'app-ranked-activity',
  template: `
    <section class="dashboard-panel chart-panel" [attr.aria-label]="title()">
      <div class="chart-heading">
        <h2>{{ title() }}</h2>
        <p class="chart-total"><strong>{{ total() }}</strong> en el período</p>
      </div>
      @if (rows().length) {
        <ol class="chart-bars">
          @for (row of rows(); track row.id) {
            <li>
              <div><span>{{ row.label }}</span><strong>{{ row.count }}</strong></div>
              <div class="bar-track" aria-hidden="true"><span [style.width.%]="row.count * 100 / max()"></span></div>
            </li>
          }
        </ol>
      } @else { <p class="chart-empty">{{ emptyMessage() }}</p> }
    </section>
  `,
})
export class RankedActivityChart {
  readonly title = input.required<string>();
  readonly emptyMessage = input.required<string>();
  readonly rows = input.required<CountByLabel[]>();
  readonly total = computed(() => this.rows().reduce((sum, row) => sum + row.count, 0));
  readonly max = computed(() => this.rows().reduce((max, row) => Math.max(max, row.count), 1));
}

const day = 86_400_000;

@Component({
  selector: 'app-daily-activity',
  imports: [DatePipe],
  templateUrl: './daily-activity-chart.html',
})
export class DailyActivityChart {
  readonly title = input.required<string>();
  readonly emptyMessage = input.required<string>();
  readonly range = input.required<StatsRange>();
  readonly rows = input.required<DailyCount[]>();
  readonly appearance = input<'line' | 'bars'>('line');
  readonly total = computed(() => this.rows().reduce((sum, row) => sum + row.count, 0));
  readonly max = computed(() => this.rows().reduce((max, row) => Math.max(max, row.count), 1));
  readonly barWidth = computed(() => {
    const range = this.range();
    const days = 1 + (Date.parse(range.to) - Date.parse(range.from)) / day;
    return Math.max(1, Math.min(38, 540 / days));
  });
  readonly points = computed(() => {
    const range = this.range();
    const rows = this.rows();
    if (!rows.length) return [];
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
      y: 155 - count * 130 / this.max(),
      count,
      date,
    }));
  });
  readonly polyline = computed(() => this.points().map(({ x, y }) => `${x},${y}`).join(' '));
}
