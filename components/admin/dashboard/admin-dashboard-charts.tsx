"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AdminDashboardStats } from "@/lib/admin/dashboard/service";
import { cn } from "@/lib/utils";

const CHART = {
  primary: "var(--cp-primary, #00BF8B)",
  players: "#14b8a6",
  teams: "#f59e0b",
  gear: "#6366f1",
  muted: "var(--cp-muted, #64748b)",
  grid: "color-mix(in srgb, var(--cp-border, #cbd5e1) 70%, transparent)",
  roles: ["#00BF8B", "#0d9488", "#f59e0b", "#6366f1", "#94a3b8"],
};

const PIE_COLORS = ["#00BF8B", "#14b8a6", "#6366f1", "#f59e0b", "#94a3b8"];

type ChartCardProps = {
  title: string;
  description?: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
};

function ChartCard({
  title,
  description,
  meta,
  children,
  className,
  bodyClassName,
}: ChartCardProps) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-cp-border bg-cp-card shadow-sm",
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-cp-border/70 px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs text-cp-muted">{description}</p>
          ) : null}
        </div>
        {meta ? <div className="shrink-0">{meta}</div> : null}
      </header>
      <div className={cn("min-h-0 flex-1 p-3 sm:p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string; dataKey?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-cp-border bg-cp-card px-3 py-2 text-xs shadow-xl">
      {label ? <p className="mb-1.5 font-semibold text-foreground">{label}</p> : null}
      <ul className="space-y-1">
        {payload.map((entry) => (
          <li key={`${entry.name}-${entry.dataKey}`} className="flex items-center gap-2 text-cp-muted">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="flex-1">{entry.name}</span>
            <span className="font-semibold tabular-nums text-foreground">
              {Number(entry.value ?? 0).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[180px] items-center justify-center rounded-xl border border-dashed border-cp-border bg-cp-elevated/20 px-4 text-center text-sm text-cp-muted">
      {message}
    </div>
  );
}

type AdminDashboardChartsProps = {
  data: AdminDashboardStats;
};

export function AdminDashboardCharts({ data }: AdminDashboardChartsProps) {
  const periodHint = data.period?.label ?? "selected period";
  const signupTotal = useMemo(
    () => data.userSignups.reduce((sum, p) => sum + p.count, 0),
    [data.userSignups],
  );
  const wikiCreatedTotal = useMemo(
    () =>
      data.wikiActivity.reduce(
        (sum, p) => sum + p.players + p.teams + p.gear,
        0,
      ),
    [data.wikiActivity],
  );

  const hasSignups = signupTotal > 0;
  const hasWikiActivity = wikiCreatedTotal > 0;

  const wikiTypeData = useMemo(() => {
    const total = data.wikiByType.reduce((s, w) => s + w.count, 0);
    return data.wikiByType.map((w) => ({
      name: w.label,
      value: w.count,
      pct: total > 0 ? Math.round((w.count / total) * 100) : 0,
    }));
  }, [data.wikiByType]);

  const roleRows = useMemo(() => {
    const total = data.usersByRole.reduce((s, r) => s + r.count, 0) || 1;
    return [...data.usersByRole]
      .sort((a, b) => b.count - a.count)
      .map((r, i) => ({
        ...r,
        pct: Math.round((r.count / total) * 1000) / 10,
        color: CHART.roles[i % CHART.roles.length]!,
      }));
  }, [data.usersByRole]);

  /** Fewer x ticks on dense daily series so labels stay readable. */
  const xInterval = data.userSignups.length > 14 ? Math.ceil(data.userSignups.length / 7) - 1 : 0;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
      <ChartCard
        title="New user registrations"
        description={periodHint}
        className="lg:col-span-12"
        meta={
          <span className="rounded-lg bg-cp-primary/10 px-2.5 py-1 text-xs font-bold tabular-nums text-cp-primary">
            {signupTotal.toLocaleString()} total
          </span>
        }
      >
        <div className="h-[220px] w-full sm:h-[260px]">
          {hasSignups ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.userSignups}
                margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="userSignupGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00BF8B" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#00BF8B" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 6" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "currentColor", fontSize: 10, opacity: 0.55 }}
                  axisLine={false}
                  tickLine={false}
                  interval={xInterval}
                  minTickGap={28}
                  height={28}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "currentColor", fontSize: 10, opacity: 0.55 }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#00BF8B", strokeOpacity: 0.25 }} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Users"
                  stroke="#00BF8B"
                  strokeWidth={2.5}
                  fill="url(#userSignupGradient)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  animationDuration={500}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No new registrations in this period" />
          )}
        </div>
      </ChartCard>

      <ChartCard
        title="Wiki content created"
        description={`${data.sportSlug} · ${periodHint}`}
        className="lg:col-span-7"
        meta={
          <span className="rounded-lg bg-cp-elevated px-2.5 py-1 text-xs font-bold tabular-nums text-foreground">
            {wikiCreatedTotal.toLocaleString()} created
          </span>
        }
      >
        <div className="mb-2 flex flex-wrap gap-3 text-[11px] text-cp-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-teal-500" /> Players
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Teams
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-indigo-500" /> Gear
          </span>
        </div>
        <div className="h-[200px] w-full sm:h-[220px]">
          {hasWikiActivity ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.wikiActivity}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                barCategoryGap="28%"
              >
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 6" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "currentColor", fontSize: 10, opacity: 0.55 }}
                  axisLine={false}
                  tickLine={false}
                  interval={xInterval}
                  minTickGap={24}
                  height={28}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "currentColor", fontSize: 10, opacity: 0.55 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--cp-elevated)", opacity: 0.4 }} />
                <Bar dataKey="players" name="Players" stackId="wiki" fill={CHART.players} maxBarSize={28} />
                <Bar dataKey="teams" name="Teams" stackId="wiki" fill={CHART.teams} maxBarSize={28} />
                <Bar
                  dataKey="gear"
                  name="Gear"
                  stackId="wiki"
                  fill={CHART.gear}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No wiki entities created in this period" />
          )}
        </div>
      </ChartCard>

      <ChartCard
        title="Wiki catalog"
        description="Current breakdown by type"
        className="lg:col-span-5"
      >
        {wikiTypeData.length > 0 ? (
          <div className="flex h-full min-h-[220px] flex-col gap-4 sm:flex-row sm:items-center">
            <div className="mx-auto h-[160px] w-full max-w-[180px] shrink-0 sm:h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={wikiTypeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="58%"
                    outerRadius="88%"
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {wikiTypeData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="min-w-0 flex-1 space-y-2.5">
              {wikiTypeData.map((row, i) => (
                <li key={row.name} className="flex items-center gap-2.5 text-sm">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="min-w-0 flex-1 truncate text-cp-muted">{row.name}</span>
                  <span className="tabular-nums font-semibold text-foreground">
                    {row.value.toLocaleString()}
                  </span>
                  <span className="w-10 text-right text-xs tabular-nums text-cp-text-dim">
                    {row.pct}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <EmptyChart message="No wiki entities for this sport yet" />
        )}
      </ChartCard>

      <ChartCard
        title="Users by role"
        description="Share of role assignments across the platform"
        className="lg:col-span-12"
      >
        {roleRows.length > 0 ? (
          <ul className="space-y-3.5">
            {roleRows.map((row) => (
              <li key={row.role}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-foreground">{row.label}</span>
                  <span className="tabular-nums text-cp-muted">
                    <span className="font-semibold text-foreground">
                      {row.count.toLocaleString()}
                    </span>
                    <span className="ml-2 text-xs">{row.pct}%</span>
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-cp-elevated">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${Math.max(row.pct, row.count > 0 ? 1.5 : 0)}%`,
                      backgroundColor: row.color,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyChart message="No role assignments yet" />
        )}
      </ChartCard>
    </div>
  );
}
