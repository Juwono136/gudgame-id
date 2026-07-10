"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AdminDashboardStats } from "@/lib/admin/dashboard/service";
import { cn } from "@/lib/utils";

const CHART_COLORS = {
  primary: "#00BF8B",
  players: "#00BF8B",
  teams: "#f59e0b",
  gear: "#10b981",
  muted: "#64748b",
  grid: "rgba(148, 163, 184, 0.15)",
};

const PIE_COLORS = ["#00BF8B", "#B7F1C9", "#042822", "#032921"];

type ChartCardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

function ChartCard({ title, description, children, className }: ChartCardProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-cp-border bg-cp-card/60 p-4 backdrop-blur-sm sm:p-5",
        className,
      )}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground sm:text-base">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-xs text-cp-muted">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-cp-border bg-cp-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-cp-muted">
          <span
            className="mr-1.5 inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          {entry.name}: <span className="font-semibold text-foreground">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

type AdminDashboardChartsProps = {
  data: AdminDashboardStats;
};

export function AdminDashboardCharts({ data }: AdminDashboardChartsProps) {
  const roleChartData = data.usersByRole.map((r) => ({
    name: r.label,
    value: r.count,
  }));

  const wikiTypeData =
    data.wikiByType.length > 0
      ? data.wikiByType.map((w) => ({ name: w.label, value: w.count }))
      : [{ name: "No entities", value: 1 }];

  const hasWikiActivity = data.wikiActivity.some(
    (p) => p.players + p.teams + p.gear > 0,
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:gap-6">
      <ChartCard
        title="New user registrations"
        description="Accounts created in the selected period"
        className="lg:col-span-2"
      >
        <div className="h-[260px] w-full sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.userSignups} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="userSignupGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: CHART_COLORS.muted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: CHART_COLORS.muted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                name="Users"
                stroke={CHART_COLORS.primary}
                strokeWidth={2}
                fill="url(#userSignupGradient)"
                animationDuration={600}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        title="Wiki content created"
        description={`New entities for ${data.sportSlug} in the selected period`}
      >
        <div className="h-[240px] w-full">
          {hasWikiActivity ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.wikiActivity} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: CHART_COLORS.muted, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: CHART_COLORS.muted, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar
                  dataKey="players"
                  name="Players"
                  stackId="wiki"
                  fill={CHART_COLORS.players}
                  radius={[0, 0, 0, 0]}
                  animationDuration={600}
                />
                <Bar
                  dataKey="teams"
                  name="Teams"
                  stackId="wiki"
                  fill={CHART_COLORS.teams}
                  animationDuration={600}
                />
                <Bar
                  dataKey="gear"
                  name="Gear"
                  stackId="wiki"
                  fill={CHART_COLORS.gear}
                  radius={[4, 4, 0, 0]}
                  animationDuration={600}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-cp-muted">
              No wiki entities created in this period
            </div>
          )}
        </div>
      </ChartCard>

      <ChartCard title="Wiki catalog" description="Current breakdown by entity type">
        <div className="h-[240px] w-full">
          {data.wikiByType.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={wikiTypeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={3}
                  animationDuration={600}
                >
                  {wikiTypeData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-cp-muted">
              No wiki entities for this sport yet
            </div>
          )}
        </div>
      </ChartCard>

      <ChartCard
        title="Users by role"
        description="Role assignments across the platform"
        className="lg:col-span-2 xl:col-span-1"
      >
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={roleChartData}
              layout="vertical"
              margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
            >
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="4 4" horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fill: CHART_COLORS.muted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: CHART_COLORS.muted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={88}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="value"
                name="Users"
                fill={CHART_COLORS.primary}
                radius={[0, 6, 6, 0]}
                animationDuration={600}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}
