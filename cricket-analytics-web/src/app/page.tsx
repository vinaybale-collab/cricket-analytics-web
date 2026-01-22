'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';
import {
  ArrowRight,
  Sparkles,
  Database,
  BarChart3,
  CheckCircle,
  MessageSquare,
  FileCheck,
  Upload,
  Circle,
  ChevronRight
} from 'lucide-react';

// Deep analysis examples - comprehensive prompts
const deepExamples = [
  {
    title: "The Nervous Nineties",
    prompt: `I want to understand batsman psychology as they approach 100 in ODIs.

Analyze: Do players slow down or accelerate between 90-99? Who are the best converters vs worst? How does this behavior correlate with team wins? Has this evolved over decades?

Give me a data-backed psychological profile of the "nervous nineties" phenomenon.`,
    tags: ["Psychology", "Batting", "Historical"]
  },
  {
    title: "Death Overs Mastery",
    prompt: `Analyze death overs specialists in ODIs (overs 45-50).

Who scores fastest under pressure? How does required run rate affect shot selection? Which players maintain strike rate when wickets are falling?

I want a complete profile of what makes a great finisher.`,
    tags: ["Death Overs", "Pressure", "Finishers"]
  },
  {
    title: "The Chase Factor",
    prompt: `Does chasing change how batsmen play?

Compare batting behavior when setting vs chasing targets. How does the required run rate affect aggression? Who are the best chasers vs target setters?

Show me the psychology of chasing in cricket.`,
    tags: ["Chasing", "Strategy", "Psychology"]
  }
];

// Existing published projects
const publishedProjects = [
  {
    slug: 'nervous-nineties',
    title: 'The Nervous Nineties Paradox',
    finding: 'Playing safe is 7x more dangerous',
    verified: true
  },
  {
    slug: 'ashwin-jadeja',
    title: 'The Ashwin-Jadeja Paradox',
    finding: '44.2% improvement when paired',
    verified: true
  }
];

// Workflow steps for the sidebar
const workflowSteps = [
  {
    number: 1,
    title: "Share Your Thought",
    description: "Enter a deep question or hypothesis",
    icon: MessageSquare,
    color: "purple"
  },
  {
    number: 2,
    title: "Explore & Refine",
    description: "Ask follow-up questions, add context",
    icon: Sparkles,
    color: "blue"
  },
  {
    number: 3,
    title: "Finalize",
    description: "Click to synthesize into rich article",
    icon: FileCheck,
    color: "amber"
  },
  {
    number: 4,
    title: "Auto-Validate",
    description: "System verifies all claims automatically",
    icon: CheckCircle,
    color: "green"
  },
  {
    number: 5,
    title: "Publish",
    description: "Save your verified analysis",
    icon: Upload,
    color: "emerald"
  }
];

export default function Home() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleStartAnalysis = async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);

    // Store prompt in sessionStorage and navigate to chat
    sessionStorage.setItem('initialPrompt', prompt.trim());
    router.push('/chat');
  };

  const handleExampleClick = (examplePrompt: string) => {
    setPrompt(examplePrompt);
  };

  return (
    <MainLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-12 py-10">

          {/* Main Grid: Content + Workflow Sidebar */}
          <div className="grid lg:grid-cols-4 gap-10">

            {/* Left Column: Main Content (3/4 width) */}
            <div className="lg:col-span-3 space-y-10">

              {/* Header - Larger */}
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-base font-medium mb-6">
                  <Database className="w-5 h-5" />
                  11,336 matches | 5M+ balls | 1990-2025
                </div>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-5 leading-tight">
                  Cricket Analytics Engine
                </h1>
                <p className="text-2xl text-gray-600 dark:text-gray-400 max-w-3xl">
                  Ask deep questions. Get publication-ready analysis with verified data.
                </p>
              </div>

              {/* Input Area - Larger and More Prominent */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg p-8">
                <textarea
                  className="w-full bg-transparent border-0 focus:ring-0 outline-none resize-none text-gray-900 dark:text-white placeholder:text-gray-400 text-2xl leading-relaxed"
                  placeholder="What cricket insight do you want to uncover?"
                  rows={5}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.metaKey) {
                      handleStartAnalysis();
                    }
                  }}
                />
                <div className="flex items-center justify-between pt-5 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-base text-gray-400">
                    Press Cmd+Enter to start
                  </span>
                  <button
                    onClick={handleStartAnalysis}
                    disabled={!prompt.trim() || isLoading}
                    className="px-10 py-4 bg-purple-600 text-white rounded-xl font-semibold text-xl hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-3"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Starting...
                      </>
                    ) : (
                      <>
                        Start Analysis
                        <ArrowRight className="w-6 h-6" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Example Prompts - Cards */}
              <div>
                <h2 className="text-lg font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-6">
                  Example Deep Thoughts
                </h2>
                <div className="grid gap-5">
                  {deepExamples.map((example, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleExampleClick(example.prompt)}
                      className="text-left bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-6 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-lg transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {example.title}
                          </h3>
                          <p className="text-lg text-gray-600 dark:text-gray-400 line-clamp-2">
                            {example.prompt.split('\n')[0]}
                          </p>
                          <div className="flex gap-3 mt-4">
                            {example.tags.map((tag, tidx) => (
                              <span key={tidx} className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <ChevronRight className="w-7 h-7 text-gray-400 group-hover:text-purple-600 transition-colors flex-shrink-0 mt-2" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Published Projects */}
              <div>
                <h2 className="text-lg font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-3">
                  <BarChart3 className="w-5 h-5" />
                  Published Analyses
                </h2>
                <div className="grid md:grid-cols-2 gap-5">
                  {publishedProjects.map((project) => (
                    <Link
                      key={project.slug}
                      href={`/projects/${project.slug}`}
                      className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 px-6 py-5 hover:border-purple-400 hover:shadow-lg transition-all group"
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-bold text-xl text-gray-900 dark:text-white group-hover:text-purple-600 transition-colors">
                            {project.title}
                          </span>
                          {project.verified && (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          )}
                        </div>
                        <span className="text-base text-gray-500">{project.finding}</span>
                      </div>
                      <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-purple-600 transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>

            </div>

            {/* Right Column: Workflow Sidebar (1/4 width) */}
            <div className="lg:col-span-1">
              <div className="sticky top-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-8">

                <h2 className="font-bold text-xl text-gray-900 dark:text-white mb-2">
                  How It Works
                </h2>
                <p className="text-base text-gray-500 dark:text-gray-400 mb-8">
                  From question to publication
                </p>

                {/* Workflow Steps */}
                <div className="space-y-6">
                  {workflowSteps.map((step, idx) => {
                    const Icon = step.icon;
                    const isLast = idx === workflowSteps.length - 1;

                    return (
                      <div key={step.number} className="relative">
                        {/* Connector Line */}
                        {!isLast && (
                          <div className="absolute left-5 top-12 w-0.5 h-10 bg-gray-200 dark:bg-gray-700" />
                        )}

                        <div className="flex items-start gap-4">
                          {/* Step Icon */}
                          <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                            ${step.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400' : ''}
                            ${step.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : ''}
                            ${step.color === 'amber' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' : ''}
                            ${step.color === 'green' ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' : ''}
                            ${step.color === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' : ''}
                          `}>
                            <Icon className="w-5 h-5" />
                          </div>

                          {/* Step Content */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                              {step.title}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Key Actions Highlight */}
                <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg font-semibold text-sm">
                        Finalize
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 text-sm">
                        Creates rich article + charts
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg font-semibold text-sm">
                        Publish
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 text-sm">
                        After validation passes
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tip */}
                <div className="mt-8 p-5 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                  <p className="text-base text-purple-700 dark:text-purple-300">
                    <strong>Tip:</strong> Ask multiple follow-up questions before clicking Finalize to build a richer analysis.
                  </p>
                </div>

              </div>
            </div>

          </div>

          {/* Footer Attribution */}
          <div className="text-center mt-16 pb-10">
            <p className="text-sm text-gray-400 uppercase tracking-widest font-medium">
              Powered by DuckDB + Gemini AI | $0 Infrastructure Cost
            </p>
          </div>

        </div>
      </div>
    </MainLayout>
  );
}
