'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, MessageSquare, FolderOpen, Clock, Plus, Trash2, BarChart3
} from 'lucide-react';

interface QueryHistoryItem {
  id: string;
  query: string;
  timestamp: Date;
}

const Sidebar = () => {
  const pathname = usePathname();
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([]);

  // Load query history from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cricket-query-history');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setQueryHistory(parsed.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp)
          })));
        } catch (e) {
          console.error('Failed to parse query history');
        }
      }
    }
  }, []);

  // Clear history
  const clearHistory = () => {
    setQueryHistory([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cricket-query-history');
    }
  };

  // Navigation items
  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/chat', label: 'New Analysis', icon: MessageSquare },
  ];

  // Published projects
  const projects = [
    { slug: 'nervous-nineties', title: 'Nervous Nineties' },
    { slug: 'ashwin-jadeja', title: 'Ashwin-Jadeja' },
  ];

  return (
    <div className="w-64 bg-gray-900 text-white h-screen flex flex-col">

      {/* Logo */}
      <div className="p-4 border-b border-gray-800">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg group-hover:text-purple-400 transition-colors">CricketAI</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Analytics Engine</p>
          </div>
        </Link>
      </div>

      {/* New Analysis Button */}
      <div className="p-3">
        <Link
          href="/chat"
          className="flex items-center justify-center gap-2 w-full border border-gray-700 rounded-lg py-3 hover:bg-gray-800 hover:border-purple-500 transition-all text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Analysis
        </Link>
      </div>

      {/* Navigation */}
      <nav className="px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    isActive
                      ? 'bg-purple-600/20 text-purple-400 font-medium'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Published Projects */}
      <div className="px-3 mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3">
            Published
          </h2>
          <FolderOpen className="w-3 h-3 text-gray-600" />
        </div>
        <ul className="space-y-1">
          {projects.map((project) => {
            const isActive = pathname === `/projects/${project.slug}`;
            return (
              <li key={project.slug}>
                <Link
                  href={`/projects/${project.slug}`}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                    isActive
                      ? 'bg-green-600/20 text-green-400 font-medium'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400' : 'bg-gray-600'}`} />
                  {project.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Query History */}
      <div className="flex-1 overflow-hidden flex flex-col px-3 mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 flex items-center gap-2">
            <Clock className="w-3 h-3" />
            Recent Queries
          </h2>
          {queryHistory.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-gray-600 hover:text-red-400 transition-colors p-1"
              title="Clear history"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {queryHistory.length === 0 ? (
            <p className="text-xs text-gray-600 px-3 py-2">No recent queries</p>
          ) : (
            <ul className="space-y-1">
              {queryHistory.slice(0, 10).map((item) => (
                <li
                  key={item.id}
                  className="px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white cursor-pointer transition-all truncate"
                  title={item.query}
                >
                  {item.query}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 p-4">
        {/* Database Status */}
        <div className="px-1">
          <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500 mb-1.5">
            <span>Database</span>
            <span className="text-green-400">Connected</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            11,535 matches | 5M+ balls
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
