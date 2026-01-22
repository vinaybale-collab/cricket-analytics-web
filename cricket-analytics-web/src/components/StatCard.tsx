'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  color?: 'purple' | 'blue' | 'green' | 'red' | 'amber' | 'cyan';
  size?: 'sm' | 'md' | 'lg';
}

const colorMap = {
  purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  green: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
  red: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  cyan: { bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-800' },
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon,
  color = 'purple',
  size = 'md'
}) => {
  const colorClasses = colorMap[color];
  const valueSize = size === 'lg' ? 'text-4xl' : size === 'md' ? 'text-3xl' : 'text-2xl';
  const padding = size === 'lg' ? 'p-8' : size === 'md' ? 'p-6' : 'p-4';

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400';

  return (
    <div className={`${colorClasses.bg} ${padding} rounded-xl border ${colorClasses.border} hover:shadow-md transition-all`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
          {title}
        </span>
        {icon && (
          <div className={`p-2 rounded-lg ${colorClasses.bg}`}>
            {icon}
          </div>
        )}
      </div>

      <div className={`${valueSize} font-bold ${colorClasses.text} mb-2`}>
        {value}
      </div>

      {(subtitle || trend) && (
        <div className="flex items-center gap-2 text-sm">
          {trend && (
            <span className={`flex items-center gap-1 ${trendColor}`}>
              <TrendIcon className="w-4 h-4" />
              {trendValue}
            </span>
          )}
          {subtitle && (
            <span className="text-gray-500 dark:text-gray-400">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;
