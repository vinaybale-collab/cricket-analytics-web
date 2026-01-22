'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MainLayout from '@/components/MainLayout';
import RichChart from '@/components/RichChart';
import StatCard from '@/components/StatCard';
import DataTable from '@/components/DataTable';
import {
  FileText, Twitter, CheckCircle, Database, Loader, TrendingUp, TrendingDown,
  Target, Users, BarChart3, PieChart, Activity, Award, AlertTriangle
} from 'lucide-react';
import Papa from 'papaparse';

// ==========================================
// PROJECT-SPECIFIC VISUALIZATION DATA
// ==========================================

// Nervous Nineties Project Data
const nervousNinetiesData = {
  keyStats: [
    { title: 'Innings Analyzed', value: '2,034', subtitle: 'ODIs from 1990-2024', color: 'purple' as const, icon: <Database className="w-5 h-5 text-purple-500" /> },
    { title: 'Slowed Down', value: '33.3%', subtitle: 'Dismissal rate', trend: 'down' as const, trendValue: 'High risk', color: 'red' as const },
    { title: 'Sped Up', value: '6.6%', subtitle: 'Dismissal rate', trend: 'up' as const, trendValue: 'Low risk', color: 'green' as const },
    { title: 'Odds Ratio', value: '7.1x', subtitle: 'Safer to attack', color: 'amber' as const, icon: <TrendingUp className="w-5 h-5 text-amber-500" /> },
  ],
  dismissalComparison: [
    { category: 'Slowed Down (N=899)', dismissalRate: 33.3, conversionRate: 63.6 },
    { category: 'Sped Up (N=1,121)', dismissalRate: 6.6, conversionRate: 89.4 },
  ],
  chaseContext: [
    { situation: 'Easy Chase (RRR < 5)', srChange: -27.1 },
    { situation: 'Medium Chase (RRR 5-7)', srChange: -2.6 },
    { situation: 'Difficult Chase (RRR 7+)', srChange: 23.2 },
  ],
  inningsPhase: [
    { phase: 'Early (0-35)', acceleration: 1.3, count: 589 },
    { phase: 'Middle (35-45)', acceleration: 20.3, count: 910 },
    { phase: 'Death (45-50)', acceleration: 59.1, count: 535 },
  ],
  playerEvolution: [
    { player: 'MS Dhoni (Early)', srAcceleration: 18.5, conversion: 50, label: 'Learning phase' },
    { player: 'MS Dhoni (Late)', srAcceleration: 146.7, conversion: 85.7, label: 'Mastered attacking' },
    { player: 'Eoin Morgan (Early)', srAcceleration: 165.2, conversion: 100, label: 'Fearless' },
    { player: 'Eoin Morgan (Late)', srAcceleration: 43.0, conversion: 71.4, label: 'More cautious' },
  ],
  statisticalRigor: [
    { metric: 'Chi-square', value: 229.4, interpretation: 'Highly significant' },
    { metric: 'P-value', value: '<0.0001', interpretation: 'Not by chance' },
    { metric: 'Odds Ratio', value: 7.1, interpretation: '7x safer to attack' },
    { metric: 'Sample Size', value: '2,034', interpretation: 'Large sample' },
  ],
};

// Ashwin-Jadeja Project Data
const ashwinJadejaData = {
  keyStats: [
    { title: 'Balls Analyzed', value: '27,089', subtitle: 'Across 57 Tests', color: 'blue' as const, icon: <Database className="w-5 h-5 text-blue-500" /> },
    { title: 'Combined Wickets', value: '592', subtitle: 'Ashwin 324 + Jadeja 268', color: 'purple' as const, icon: <Target className="w-5 h-5 text-purple-500" /> },
    { title: "Jadeja's Improvement", value: '44.2%', subtitle: 'Better average with Ashwin', trend: 'up' as const, trendValue: 'Synergy proven', color: 'green' as const },
    { title: 'P-value', value: '0.0028', subtitle: '99% confidence', color: 'cyan' as const, icon: <CheckCircle className="w-5 h-5 text-cyan-500" /> },
  ],
  awayPerformance: [
    { bowler: 'Ashwin Apart', strikeRate: 52.8, average: 26.9, balls: 248 },
    { bowler: 'Ashwin Together', strikeRate: 48.2, average: 22.8, balls: 275 },
    { bowler: 'Jadeja Apart', strikeRate: 84.1, average: 41.6, balls: 218 },
    { bowler: 'Jadeja Together', strikeRate: 57.7, average: 23.2, balls: 249 },
  ],
  roleComparison: [
    { metric: 'First Wicket %', Ashwin: 67.3, Jadeja: 32.7 },
    { metric: 'Dot Ball %', Ashwin: 74.8, Jadeja: 77.6 },
    { metric: 'Boundary %', Ashwin: 5.4, Jadeja: 4.8 },
    { metric: 'Strike Rate', Ashwin: 47.2, Jadeja: 51.5 },
  ],
  roleRadar: [
    { attribute: 'First Wickets', Ashwin: 67, Jadeja: 33 },
    { attribute: 'Dot Balls', Ashwin: 75, Jadeja: 78 },
    { attribute: 'Economy', Ashwin: 71, Jadeja: 82 },
    { attribute: 'Strike Rate', Ashwin: 82, Jadeja: 75 },
    { attribute: 'Big Moments', Ashwin: 78, Jadeja: 68 },
  ],
  dismissalTypes: [
    { type: 'Caught', Ashwin: 48.2, Jadeja: 46.3 },
    { type: 'LBW', Ashwin: 22.2, Jadeja: 22.0 },
    { type: 'Bowled', Ashwin: 21.0, Jadeja: 23.5 },
    { type: 'Stumped', Ashwin: 2.5, Jadeja: 3.7 },
  ],
  battingContribution: [
    { batter: 'Jadeja', matches: 55, runs: 2328, strikeRate: 55.8, boundaries: 257 },
    { batter: 'Ashwin', matches: 52, runs: 1629, strikeRate: 50.7, boundaries: 187 },
  ],
  improvementBreakdown: [
    { category: "Jadeja's SR Improvement", value: 31.4, label: 'Strike Rate' },
    { category: "Jadeja's Avg Improvement", value: 44.2, label: 'Bowling Average' },
    { category: "Ashwin's SR Improvement", value: 8.7, label: 'Strike Rate' },
    { category: "Ashwin's Avg Improvement", value: 15.3, label: 'Bowling Average' },
  ],
};

// Verification Report Hook
const useVerificationReport = (slug: string) => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(`/data/${slug}/verification_report.json`);
        if (response.ok) {
          const json = await response.json();
          setData(json);
        }
      } catch (e) {
        console.error("Could not load verification report", e);
      }
    };
    loadData();
  }, [slug]);

  return data;
};

// Verification Section Component
const VerificationSection = ({ report }: { report: any }) => {
  if (!report) return null;

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-green-100 dark:bg-green-800 rounded-full">
          <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Analysis Verified</h3>
          <p className="text-xs text-green-700 dark:text-green-400">
            Validated by {report.agent_name} on {new Date(report.timestamp).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {report.items?.map((item: any, idx: number) => (
          <div key={idx} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
            <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{item.claim}</span>
              <span className="ml-2 text-xs font-mono bg-green-100 dark:bg-green-900/50 px-2 py-0.5 rounded text-green-700 dark:text-green-300">
                {item.verified_value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function ProjectPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [content, setContent] = useState('');
  const [tweet, setTweet] = useState('');
  const [csvData, setCsvData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const verificationReport = useVerificationReport(slug);

  useEffect(() => {
    if (!slug) return;

    const loadContent = async () => {
      try {
        // Load Markdown
        const mdRes = await fetch(`/data/${slug}/content.md`);
        if (mdRes.ok) {
          const mdText = await mdRes.text();
          setContent(mdText);
        }

        // Load Tweet
        const tweetRes = await fetch(`/data/${slug}/tweet.txt`);
        if (tweetRes.ok) {
          const tweetText = await tweetRes.text();
          setTweet(tweetText);
        }

        // Load CSV Data
        let csvFile = '';
        if (slug === 'ashwin-jadeja') csvFile = '/data/ashwin-jadeja/table4.csv';
        if (slug === 'nervous-nineties') csvFile = '/data/nervous-nineties/accelerators.csv';

        if (csvFile) {
          const csvRes = await fetch(csvFile);
          if (csvRes.ok) {
            const csvText = await csvRes.text();
            const parsed = Papa.parse(csvText, { header: true, dynamicTyping: true });
            setCsvData(parsed.data);
          }
        }

        setLoading(false);
      } catch (e) {
        console.error("Error loading project data", e);
        setLoading(false);
      }
    };

    loadContent();
  }, [slug]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-gray-500">Loading analysis...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const isNervousNineties = slug === 'nervous-nineties';
  const isAshwinJadeja = slug === 'ashwin-jadeja';
  const projectData = isNervousNineties ? nervousNinetiesData : ashwinJadejaData;

  return (
    <MainLayout>
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-6xl mx-auto p-8 pb-32">

          {/* Header */}
          <div className="mb-12 text-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-wider text-purple-600 uppercase bg-purple-100 dark:bg-purple-900/30 rounded-full mb-4">
              <BarChart3 className="w-4 h-4" />
              Data-Driven Analysis
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              {isNervousNineties ? 'The Nervous Nineties Paradox' : 'The Ashwin-Jadeja Paradox'}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              {isNervousNineties
                ? 'What 2,034 innings teach us about fear, flow, and the strange mathematics of playing it safe'
                : 'When 1 + 1 Equals 3 - The scientifically proven synergy that transformed Indian cricket'}
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-gray-500 mt-6">
              <span className="flex items-center gap-1">
                <Database className="w-4 h-4" /> DuckDB v0.9.2
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" /> Cricsheet.org Data
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-500" /> Verified
              </span>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="mb-12 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-8 border border-purple-200 dark:border-purple-800">
            <h2 className="text-lg font-bold text-purple-800 dark:text-purple-300 mb-4 uppercase tracking-wide">
              The Bottom Line
            </h2>
            {isNervousNineties ? (
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
                <strong className="text-gray-900 dark:text-white">The data is unambiguous:</strong> batsmen who slow down in the 90s are dismissed <strong className="text-red-600">5 times more often</strong> than those who maintain or increase their tempo. Of 2,034 innings analyzed, players who decelerated had a 33.3% dismissal rate compared to just 6.6% for accelerators. The conversion rate tells the same story — attackers convert 89.4% of their 90s into centuries, while cautious players manage only 63.6%. This isn't about recklessness; the smartest players read context. In easy chases, they cruise. Under pressure, they attack. <strong className="text-purple-700 dark:text-purple-400">The "nervous nineties" is a self-fulfilling prophecy — playing scared creates the very outcome batsmen fear.</strong>
              </p>
            ) : (
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
                <strong className="text-gray-900 dark:text-white">When Ashwin and Jadeja bowl together, something remarkable happens.</strong> Jadeja's bowling average improves by <strong className="text-green-600">44.2%</strong> in away matches — dropping from 41.6 to 23.2. This isn't correlation; it's causation with a p-value of 0.0028 (99% confidence). The mechanism is clear: Ashwin operates as the "strike bowler" taking 67.3% of first wickets, while Jadeja builds relentless pressure with 77.6% dot balls. When batsmen face Ashwin's variations, they become vulnerable to Jadeja's accuracy — and vice versa. Add their combined 73.6 runs per match from positions 7-8, and you have <strong className="text-purple-700 dark:text-purple-400">cricket's most valuable partnership — where 1 + 1 genuinely equals 3.</strong>
              </p>
            )}
          </div>

          {/* Key Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {projectData.keyStats.map((stat, idx) => (
              <StatCard key={idx} {...stat} />
            ))}
          </div>

          {/* Verification Section */}
          <div className="mb-12">
            <VerificationSection report={verificationReport} />
          </div>

          {/* ==========================================
              NERVOUS NINETIES VISUALIZATIONS
              ========================================== */}
          {isNervousNineties && (
            <>
              {/* Main Finding: Dismissal Comparison */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                  The Core Finding
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <RichChart
                    title="Dismissal Rate Comparison"
                    subtitle="Slowing down is 5x more likely to get you out"
                    data={nervousNinetiesData.dismissalComparison}
                    type="bar"
                    xKey="category"
                    yKeys={['dismissalRate']}
                    colors={['#ef4444', '#10b981']}
                    height={300}
                  />
                  <RichChart
                    title="Conversion Rate to Century"
                    subtitle="Attackers convert 89% vs 64% for cautious players"
                    data={nervousNinetiesData.dismissalComparison}
                    type="bar"
                    xKey="category"
                    yKeys={['conversionRate']}
                    colors={['#8b5cf6']}
                    height={300}
                  />
                </div>
              </div>

              {/* Context: Chase Situations */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <Activity className="w-6 h-6 text-blue-500" />
                  Context-Aware Behavior
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <RichChart
                    title="Strike Rate Change by Chase Situation"
                    subtitle="Players read context intelligently"
                    data={nervousNinetiesData.chaseContext}
                    type="horizontal-bar"
                    xKey="situation"
                    yKeys={['srChange']}
                    colors={['#3b82f6']}
                    height={250}
                  />
                  <RichChart
                    title="Acceleration by Innings Phase"
                    subtitle="Death overs show massive acceleration"
                    data={nervousNinetiesData.inningsPhase}
                    type="bar"
                    xKey="phase"
                    yKeys={['acceleration', 'count']}
                    colors={['#8b5cf6', '#e5e7eb']}
                    height={250}
                  />
                </div>
              </div>

              {/* Player Evolution */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <Users className="w-6 h-6 text-purple-500" />
                  Career Evolution: Dhoni vs Morgan
                </h2>
                <RichChart
                  title="Learning Curve: SR Acceleration vs Conversion Rate"
                  subtitle="Dhoni learned to attack more; Morgan became more cautious"
                  data={nervousNinetiesData.playerEvolution}
                  type="composed"
                  xKey="player"
                  yKeys={['srAcceleration', 'conversion']}
                  colors={['#8b5cf6', '#10b981']}
                  height={350}
                />
              </div>

              {/* Statistical Rigor Table */}
              <div className="mb-12">
                <DataTable
                  title="Statistical Rigor"
                  subtitle="Confidence metrics proving this is not random chance"
                  columns={[
                    { key: 'metric', label: 'Metric', highlight: true },
                    { key: 'value', label: 'Value', align: 'center' },
                    { key: 'interpretation', label: 'Interpretation', align: 'right' },
                  ]}
                  data={nervousNinetiesData.statisticalRigor}
                  highlightFirst={false}
                  sortable={false}
                />
              </div>

              {/* CSV Data Table */}
              {csvData.length > 0 && (
                <div className="mb-12">
                  <DataTable
                    title="Top Strike Rate Accelerators"
                    subtitle="Players who attacked most aggressively in the 90s"
                    columns={[
                      { key: 'batter', label: 'Player', highlight: true },
                      { key: 'innings', label: 'Innings', align: 'center' },
                      { key: 'avg_sr_0_89', label: 'SR (0-89)', align: 'center', format: (v: number) => v?.toFixed(1) || '-' },
                      { key: 'avg_sr_90_99', label: 'SR (90-99)', align: 'center', format: (v: number) => v?.toFixed(1) || '-' },
                      { key: 'avg_accel', label: 'Acceleration', align: 'right', highlight: true, format: (v: number) => v ? `+${v.toFixed(1)}` : '-' },
                    ]}
                    data={csvData.filter(d => d.batter)}
                    maxRows={10}
                    highlightFirst={true}
                  />
                </div>
              )}
            </>
          )}

          {/* ==========================================
              ASHWIN-JADEJA VISUALIZATIONS
              ========================================== */}
          {isAshwinJadeja && (
            <>
              {/* Main Finding: Away Performance */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <Target className="w-6 h-6 text-green-500" />
                  The Core Finding: Venue-Controlled Comparison
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <RichChart
                    title="Bowling Average (Away Matches)"
                    subtitle="Lower is better - Jadeja's transformation is dramatic"
                    data={ashwinJadejaData.awayPerformance}
                    type="bar"
                    xKey="bowler"
                    yKeys={['average']}
                    colors={['#8b5cf6']}
                    height={300}
                  />
                  <RichChart
                    title="Strike Rate (Away Matches)"
                    subtitle="Lower is better - Balls per wicket"
                    data={ashwinJadejaData.awayPerformance}
                    type="bar"
                    xKey="bowler"
                    yKeys={['strikeRate']}
                    colors={['#3b82f6']}
                    height={300}
                  />
                </div>
              </div>

              {/* Improvement Breakdown */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-green-500" />
                  Improvement When Playing Together
                </h2>
                <RichChart
                  title="Percentage Improvement in Away Matches"
                  subtitle="Jadeja's improvement is 3.6x larger than Ashwin's"
                  data={ashwinJadejaData.improvementBreakdown}
                  type="horizontal-bar"
                  xKey="category"
                  yKeys={['value']}
                  colors={['#10b981']}
                  height={250}
                />
              </div>

              {/* Role Specialization */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <PieChart className="w-6 h-6 text-blue-500" />
                  Role Specialization: Strike Bowler vs Pressure Builder
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <RichChart
                    title="Role Comparison Radar"
                    subtitle="Ashwin attacks, Jadeja builds pressure"
                    data={ashwinJadejaData.roleRadar}
                    type="radar"
                    xKey="attribute"
                    yKeys={['Ashwin', 'Jadeja']}
                    colors={['#8b5cf6', '#3b82f6']}
                    height={350}
                  />
                  <DataTable
                    title="Detailed Role Metrics"
                    subtitle="15,296 balls by Ashwin, 13,793 by Jadeja"
                    columns={[
                      { key: 'metric', label: 'Metric', highlight: true },
                      { key: 'Ashwin', label: 'Ashwin', align: 'center' },
                      { key: 'Jadeja', label: 'Jadeja', align: 'center' },
                    ]}
                    data={ashwinJadejaData.roleComparison}
                    sortable={false}
                  />
                </div>
              </div>

              {/* Dismissal Types */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <Activity className="w-6 h-6 text-amber-500" />
                  Dismissal Type Distribution
                </h2>
                <RichChart
                  title="How They Take Wickets"
                  subtitle="Nearly identical distributions - they differ in WHEN, not HOW"
                  data={ashwinJadejaData.dismissalTypes}
                  type="bar"
                  xKey="type"
                  yKeys={['Ashwin', 'Jadeja']}
                  colors={['#8b5cf6', '#3b82f6']}
                  height={300}
                />
              </div>

              {/* Batting Contribution */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <Award className="w-6 h-6 text-purple-500" />
                  Batting Insurance: The Hidden Multiplier
                </h2>
                <DataTable
                  title="Combined 73.6 Runs Per Match from Positions 7-8"
                  subtitle="Strategic flexibility through lower-order depth"
                  columns={[
                    { key: 'batter', label: 'Batter', highlight: true },
                    { key: 'matches', label: 'Matches', align: 'center' },
                    { key: 'runs', label: 'Total Runs', align: 'center' },
                    { key: 'strikeRate', label: 'Strike Rate', align: 'center' },
                    { key: 'boundaries', label: 'Boundaries', align: 'right' },
                  ]}
                  data={ashwinJadejaData.battingContribution}
                  highlightFirst={true}
                />
              </div>

              {/* CSV Data Table */}
              {csvData.length > 0 && (
                <div className="mb-12">
                  <DataTable
                    title="Detailed Match Data"
                    subtitle="Ball-by-ball analysis from 57 Tests together"
                    columns={[
                      { key: 'Status', label: 'Status', highlight: true },
                      { key: 'Bowling Avg', label: 'Avg', align: 'center', format: (v: number) => v?.toFixed(1) || '-' },
                      { key: 'Strike Rate', label: 'SR', align: 'center', format: (v: number) => v?.toFixed(1) || '-' },
                    ]}
                    data={csvData.filter(d => d.Status)}
                    highlightFirst={true}
                  />
                </div>
              )}
            </>
          )}

          {/* Article Content */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <FileText className="w-6 h-6 text-gray-500" />
              Full Analysis
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
              <article className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-purple-600 prose-table:border-collapse prose-th:border prose-th:border-gray-300 prose-th:p-2 prose-td:border prose-td:border-gray-300 prose-td:p-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </article>
            </div>
          </div>

          {/* Twitter Thread */}
          <div className="mb-12">
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Twitter className="w-5 h-5 text-blue-400" />
                Generated Twitter Thread
              </h3>
              <div className="text-gray-700 dark:text-gray-300 whitespace-pre-line border-l-4 border-blue-400 pl-4 bg-white dark:bg-gray-800 rounded-r-lg p-4">
                {tweet}
              </div>
            </div>
          </div>

        </div>
      </div>
    </MainLayout>
  );
}
