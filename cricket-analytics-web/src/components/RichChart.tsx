'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, ComposedChart, ScatterChart, Scatter
} from 'recharts';

interface ChartProps {
  data: any[];
  type: 'bar' | 'line' | 'pie' | 'area' | 'radar' | 'composed' | 'scatter' | 'horizontal-bar';
  title: string;
  subtitle?: string;
  xKey: string;
  yKeys: string[];
  colors?: string[];
  height?: number;
  showLegend?: boolean;
  stacked?: boolean;
}

const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];

const RichChart: React.FC<ChartProps> = ({
  data,
  type,
  title,
  subtitle,
  xKey,
  yKeys,
  colors = CHART_COLORS,
  height = 400,
  showLegend = true,
  stacked = false
}) => {
  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
            <Tooltip
              cursor={{fill: 'rgba(139, 92, 246, 0.1)'}}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', background: '#fff' }}
            />
            {showLegend && <Legend verticalAlign="top" align="right" height={36} />}
            {yKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[index % colors.length]}
                radius={[6, 6, 0, 0]}
                barSize={stacked ? undefined : 40}
                stackId={stacked ? 'stack' : undefined}
              />
            ))}
          </BarChart>
        );

      case 'horizontal-bar':
        return (
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
            <YAxis dataKey={xKey} type="category" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} width={100} />
            <Tooltip
              cursor={{fill: 'rgba(139, 92, 246, 0.1)'}}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}
            />
            {showLegend && <Legend verticalAlign="top" align="right" height={36} />}
            {yKeys.map((key, index) => (
              <Bar key={key} dataKey={key} fill={colors[index % colors.length]} radius={[0, 6, 6, 0]} barSize={24} />
            ))}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }} />
            {showLegend && <Legend verticalAlign="top" align="right" height={36} />}
            {yKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={3}
                dot={{ r: 5, strokeWidth: 2, fill: '#fff' }}
                activeDot={{ r: 8, stroke: colors[index % colors.length], strokeWidth: 3 }}
              />
            ))}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={data}>
            <defs>
              {yKeys.map((key, index) => (
                <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors[index % colors.length]} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={colors[index % colors.length]} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }} />
            {showLegend && <Legend verticalAlign="top" align="right" height={36} />}
            {yKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#gradient-${key})`}
              />
            ))}
          </AreaChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              paddingAngle={4}
              dataKey={yKeys[0]}
              nameKey={xKey}
              label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
              labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="none" />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }} />
            {showLegend && <Legend verticalAlign="bottom" height={36} />}
          </PieChart>
        );

      case 'radar':
        return (
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey={xKey} tick={{fill: '#6b7280', fontSize: 12}} />
            <PolarRadiusAxis tick={{fill: '#9ca3af', fontSize: 10}} />
            {yKeys.map((key, index) => (
              <Radar
                key={key}
                name={key}
                dataKey={key}
                stroke={colors[index % colors.length]}
                fill={colors[index % colors.length]}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            ))}
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }} />
            {showLegend && <Legend verticalAlign="bottom" height={36} />}
          </RadarChart>
        );

      case 'scatter':
        return (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} name={xKey} />
            <YAxis dataKey={yKeys[0]} axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} name={yKeys[0]} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }} />
            <Scatter data={data} fill={colors[0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Scatter>
          </ScatterChart>
        );

      case 'composed':
        return (
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }} />
            {showLegend && <Legend verticalAlign="top" align="right" height={36} />}
            {yKeys.map((key, index) => (
              index === 0 ? (
                <Bar key={key} dataKey={key} fill={colors[index % colors.length]} radius={[4, 4, 0, 0]} barSize={30} />
              ) : (
                <Line key={key} type="monotone" dataKey={key} stroke={colors[index % colors.length]} strokeWidth={3} dot={{ r: 4 }} />
              )
            ))}
          </ComposedChart>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div style={{ height: height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RichChart;
