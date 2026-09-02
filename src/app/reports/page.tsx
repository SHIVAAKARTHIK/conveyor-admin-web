"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ProtectedPage } from "@/components/ProtectedPage";
import { StatTile } from "@/components/StatTile";
import { api, apiErrorMessage } from "@/lib/api";
import type { ReportSummary } from "@/lib/types";

const PIE_COLORS = ["#ef4444", "#f59e0b", "#3b82f6"];

function formatSeconds(s: number | null): string {
  if (s == null) return "—";
  if (s < 60) return `${s.toFixed(0)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  return `${m}m ${rem}s`;
}

function ReportsContent() {
  const [days, setDays] = useState(14);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ReportSummary>(`/reports/summary?days=${days}`)
      .then((res) => setSummary(res.data))
      .catch((err) => setError(apiErrorMessage(err)));
  }, [days]);

  const alertData = summary
    ? Object.entries(summary.alert_counts_by_type).map(([type, count]) => ({ type: type.replace(/_/g, " "), count }))
    : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Reports</h1>
          <p className="text-sm text-black/50 dark:text-white/50">Digital records for monitoring and analysis.</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatTile label="Total deliveries" value={summary.total_deliveries} />
            <StatTile label="Avg. delivery time" value={formatSeconds(summary.avg_delivery_seconds)} hint="dispatch → confirmation" />
            <StatTile label="Open alerts" value={summary.open_alerts} />
            <StatTile label="Alert types logged" value={Object.keys(summary.alert_counts_by_type).length} />
          </div>

          <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 bg-white/60 dark:bg-white/5">
            <h2 className="font-medium mb-4">Deliveries per day</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.deliveries_per_day}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 bg-white/60 dark:bg-white/5">
            <h2 className="font-medium mb-4">Alerts by type</h2>
            {alertData.length === 0 ? (
              <p className="text-sm text-black/50 dark:text-white/50">No alerts in this period.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={alertData} dataKey="count" nameKey="type" outerRadius={90} label>
                      {alertData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <ProtectedPage>
      <ReportsContent />
    </ProtectedPage>
  );
}
