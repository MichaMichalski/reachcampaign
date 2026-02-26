"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type ChartProps = {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  color?: string;
  height?: number;
};

export function LineChartComponent({
  data,
  xKey,
  yKey,
  color = "#6366f1",
  height = 300,
}: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickLine={false}
          axisLine={{ stroke: "#e2e8f0" }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            fontSize: 13,
          }}
        />
        <Line
          type="monotone"
          dataKey={yKey}
          stroke={color}
          strokeWidth={2}
          dot={{ r: 3, fill: color }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BarChartComponent({
  data,
  xKey,
  yKey,
  color = "#6366f1",
  height = 300,
}: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickLine={false}
          axisLine={{ stroke: "#e2e8f0" }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            fontSize: 13,
          }}
        />
        <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AreaChartComponent({
  data,
  xKey,
  yKey,
  color = "#6366f1",
  height = 300,
}: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickLine={false}
          axisLine={{ stroke: "#e2e8f0" }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            fontSize: 13,
          }}
        />
        <defs>
          <linearGradient id={`gradient-${yKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey={yKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#gradient-${yKey})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

type MultiLineChartProps = {
  data: Record<string, unknown>[];
  xKey: string;
  lines: { key: string; color: string; label?: string }[];
  height?: number;
};

export function MultiLineChartComponent({
  data,
  xKey,
  lines,
  height = 300,
}: MultiLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickLine={false}
          axisLine={{ stroke: "#e2e8f0" }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            fontSize: 13,
          }}
        />
        {lines.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.label ?? line.key}
            stroke={line.color}
            strokeWidth={2}
            dot={{ r: 3, fill: line.color }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
