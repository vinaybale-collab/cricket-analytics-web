'use client';

import React, { useState, useRef, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import RichChart from '@/components/RichChart';
import DataTable from '@/components/DataTable';
import {
  ArrowRight, User, Bot, Database, Code, Table2, BarChart3,
  Copy, Check, Loader, AlertCircle, Sparkles, FileCheck, Upload,
  CheckCircle, XCircle, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';

// Message types
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sql?: string;
  data?: any[];
  error?: string;
  isLoading?: boolean;
}

// Validation claim type
interface ClaimVerification {
  claim_id: number;
  claim_text: string;
  claim_type: string;
  is_verified: boolean;
  actual_value?: string;
  expected_value?: string;
  discrepancy_percent?: number;
  notes: string;
}

// Validation response type
interface ValidationResponse {
  overall_status: string;
  total_claims: number;
  verified_claims: number;
  failed_claims: number;
  verification_score: number;
  claims: ClaimVerification[];
  recommendation: string;
  summary: string;
}

// Finalized project type
interface FinalizedProject {
  slug: string;
  title: string;
  author: string;
  date: string;
  executive_summary: string;
  article_markdown: string;
  tweet: string;
  key_stats: any[];
  charts: any[];
  data_tables: any[];
  methodology: string;
  limitations: string;
}

// Workflow states
type WorkflowState = 'exploring' | 'finalizing' | 'finalized' | 'validating' | 'validated' | 'publishing' | 'published';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Workflow state
  const [workflowState, setWorkflowState] = useState<WorkflowState>('exploring');
  const [projectTitle, setProjectTitle] = useState('');
  const [finalizedProject, setFinalizedProject] = useState<FinalizedProject | null>(null);
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [showValidationDetails, setShowValidationDetails] = useState(false);

  // Load initial prompt from landing page
  useEffect(() => {
    const initialPrompt = sessionStorage.getItem('initialPrompt');
    if (initialPrompt) {
      sessionStorage.removeItem('initialPrompt');
      setInput(initialPrompt);
      // Auto-submit after a brief delay
      setTimeout(() => {
        handleSendWithPrompt(initialPrompt);
      }, 500);
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Copy SQL to clipboard
  const copySQL = (sql: string, id: string) => {
    navigator.clipboard.writeText(sql);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle sending a message
  const handleSendWithPrompt = async (promptText: string) => {
    if (!promptText.trim() || isAnalyzing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: promptText.trim(),
      timestamp: new Date(),
    };

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInput('');
    setIsAnalyzing(true);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

      // Use deep analysis for first message or complex queries
      const isDeepAnalysis = messages.length === 0 && promptText.length > 200;
      const endpoint = isDeepAnalysis ? '/analyze-deep' : '/analyze';

      const response = await fetch(`${backendUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Analysis failed');
      }

      const data = await response.json();

      // Handle deep analysis response differently
      if (isDeepAnalysis && data.steps) {
        // Combine all step data
        const allData = data.steps.flatMap((s: any) => s.results || []);
        setMessages(prev => prev.map(msg =>
          msg.id === loadingMessage.id
            ? {
                ...msg,
                isLoading: false,
                content: data.executive_summary || `Deep analysis completed with ${data.steps.length} steps`,
                sql: data.steps.map((s: any) => s.sql_query).filter(Boolean).join('\n\n-- Step ---\n\n'),
                data: allData.slice(0, 100), // Limit for display
              }
            : msg
        ));
      } else {
        setMessages(prev => prev.map(msg =>
          msg.id === loadingMessage.id
            ? {
                ...msg,
                isLoading: false,
                content: data.markdown || `Found ${data.data?.length || 0} results`,
                sql: data.sql_used,
                data: data.data,
              }
            : msg
        ));
      }

    } catch (err) {
      setMessages(prev => prev.map(msg =>
        msg.id === loadingMessage.id
          ? {
              ...msg,
              isLoading: false,
              content: 'Failed to analyze query',
              error: err instanceof Error ? err.message : 'Unknown error',
            }
          : msg
      ));
    } finally {
      setIsAnalyzing(false);
      inputRef.current?.focus();
    }
  };

  const handleSend = () => handleSendWithPrompt(input);

  // Handle Finalize
  const handleFinalize = async () => {
    if (!projectTitle.trim()) {
      alert('Please enter a project title');
      return;
    }

    setWorkflowState('finalizing');

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

      // Convert messages to conversation format
      const conversation = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        sql_query: msg.sql || null,
        data: msg.data || null,
      }));

      const response = await fetch(`${backendUrl}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_title: projectTitle.trim(),
          conversation,
          author: 'Vinay Bale'
        })
      });

      if (!response.ok) {
        throw new Error('Finalization failed');
      }

      const project = await response.json();
      setFinalizedProject(project);
      setWorkflowState('finalized');

      // Auto-trigger validation
      handleValidate(project);

    } catch (err) {
      console.error('Finalize error:', err);
      setWorkflowState('exploring');
      alert('Finalization failed. Please try again.');
    }
  };

  // Handle Validation
  const handleValidate = async (project: FinalizedProject) => {
    setWorkflowState('validating');

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

      const response = await fetch(`${backendUrl}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article_markdown: project.article_markdown,
          data_tables: project.data_tables,
          key_stats: project.key_stats
        })
      });

      if (!response.ok) {
        throw new Error('Validation failed');
      }

      const validationResult = await response.json();
      setValidation(validationResult);
      setWorkflowState('validated');

    } catch (err) {
      console.error('Validation error:', err);
      setWorkflowState('finalized');
    }
  };

  // Handle Publish
  const handlePublish = async () => {
    if (!finalizedProject || !validation) return;
    if (validation.recommendation !== 'READY_TO_PUBLISH') {
      alert('Cannot publish: Validation did not pass. Fix issues and re-finalize.');
      return;
    }

    setWorkflowState('publishing');

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

      const response = await fetch(`${backendUrl}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: finalizedProject,
          validation: validation
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Publish failed');
      }

      const result = await response.json();
      setWorkflowState('published');
      alert(`Published successfully!\n\nProject saved to: ${result.project_path}\n\nFiles created:\n${result.files_created.join('\n')}`);

    } catch (err) {
      console.error('Publish error:', err);
      setWorkflowState('validated');
      alert(err instanceof Error ? err.message : 'Publish failed');
    }
  };

  // Render data visualization
  const renderDataVisualization = (data: any[], sql: string) => {
    if (!data || data.length === 0) return null;

    const columns = Object.keys(data[0]);
    const numericColumns = columns.filter(col =>
      data.some(row => typeof row[col] === 'number')
    );
    const labelColumn = columns.find(col =>
      data.every(row => typeof row[col] === 'string')
    ) || columns[0];

    return (
      <div className="space-y-6 mt-6">
        <DataTable
          title={`Query Results (${data.length} rows)`}
          columns={columns.map(col => ({
            key: col,
            label: col.replace(/_/g, ' '),
            align: numericColumns.includes(col) ? 'right' as const : 'left' as const,
            format: numericColumns.includes(col)
              ? (v: number) => typeof v === 'number' ? v.toLocaleString() : v
              : undefined,
          }))}
          data={data}
          maxRows={10}
          highlightFirst={true}
        />

        {numericColumns.length > 0 && data.length <= 20 && (
          <RichChart
            title="Visual Summary"
            data={data.slice(0, 10)}
            type="bar"
            xKey={labelColumn}
            yKeys={numericColumns.slice(0, 2)}
            height={300}
          />
        )}
      </div>
    );
  };

  // Check if we can finalize
  const canFinalize = messages.length >= 2 && !isAnalyzing && workflowState === 'exploring';
  const canPublish = validation?.recommendation === 'READY_TO_PUBLISH' && workflowState === 'validated';

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Database className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Cricket Analytics Chat</h1>
                <p className="text-sm text-gray-500">
                  {workflowState === 'exploring' && 'Ask questions, then click Finalize when ready'}
                  {workflowState === 'finalizing' && 'Creating your analysis...'}
                  {workflowState === 'finalized' && 'Analysis created, validating...'}
                  {workflowState === 'validating' && 'Validation agent checking claims...'}
                  {workflowState === 'validated' && (validation?.recommendation === 'READY_TO_PUBLISH' ? 'Ready to publish!' : 'Issues found - review below')}
                  {workflowState === 'publishing' && 'Publishing...'}
                  {workflowState === 'published' && 'Published successfully!'}
                </p>
              </div>
            </div>

            {/* Workflow Buttons */}
            <div className="flex items-center gap-3">
              {/* Finalize Button */}
              {canFinalize && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Project title..."
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={handleFinalize}
                    disabled={!projectTitle.trim()}
                    className="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <FileCheck className="w-4 h-4" />
                    Finalize
                  </button>
                </div>
              )}

              {/* Loading States */}
              {(workflowState === 'finalizing' || workflowState === 'validating' || workflowState === 'publishing') && (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="text-sm">
                    {workflowState === 'finalizing' && 'Synthesizing...'}
                    {workflowState === 'validating' && 'Validating...'}
                    {workflowState === 'publishing' && 'Publishing...'}
                  </span>
                </div>
              )}

              {/* Publish Button */}
              {workflowState === 'validated' && (
                <button
                  onClick={handlePublish}
                  disabled={!canPublish}
                  className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                    canPublish
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Publish
                </button>
              )}

              {/* Published Badge */}
              {workflowState === 'published' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg">
                  <CheckCircle className="w-4 h-4" />
                  Published
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Validation Results Panel */}
        {validation && workflowState !== 'exploring' && (
          <div className={`border-b px-6 py-4 ${
            validation.recommendation === 'READY_TO_PUBLISH'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
              : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {validation.recommendation === 'READY_TO_PUBLISH' ? (
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                )}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Validation: {validation.overall_status}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {validation.verified_claims}/{validation.total_claims} claims verified ({validation.verification_score.toFixed(1)}%)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowValidationDetails(!showValidationDetails)}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                {showValidationDetails ? 'Hide' : 'Show'} Details
                {showValidationDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {/* Validation Details */}
            {showValidationDetails && (
              <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                {validation.claims.map((claim) => (
                  <div
                    key={claim.claim_id}
                    className={`p-3 rounded-lg text-sm ${
                      claim.is_verified
                        ? 'bg-emerald-100 dark:bg-emerald-900/30'
                        : 'bg-red-100 dark:bg-red-900/30'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {claim.is_verified ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="text-gray-900 dark:text-white font-medium">{claim.claim_text}</p>
                        <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">{claim.notes}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Re-analyze button if issues found */}
            {validation.recommendation !== 'READY_TO_PUBLISH' && (
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => {
                    setWorkflowState('exploring');
                    setFinalizedProject(null);
                    setValidation(null);
                  }}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Continue Exploring
                </button>
                <span className="text-sm text-gray-600">Fix issues and finalize again</span>
              </div>
            )}
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-4xl mx-auto space-y-6">

            {/* Empty state */}
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-4">
                  <Sparkles className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Start Your Analysis
                </h2>
                <p className="text-gray-500 mb-4 max-w-md mx-auto">
                  Ask questions about cricket data. After exploring, click <strong>Finalize</strong> to create a rich article.
                </p>
              </div>
            )}

            {/* Message list */}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                )}

                <div className={`flex-1 max-w-3xl ${message.role === 'user' ? 'text-right' : ''}`}>
                  {message.role === 'user' && (
                    <div className="inline-block bg-purple-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm">
                      {message.content}
                    </div>
                  )}

                  {message.role === 'assistant' && (
                    <div className="space-y-4">
                      {message.isLoading && (
                        <div className="flex items-center gap-3 text-gray-500">
                          <Loader className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Analyzing your question...</span>
                        </div>
                      )}

                      {message.error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
                            <AlertCircle className="w-4 h-4" />
                            <span className="font-medium">Error</span>
                          </div>
                          <p className="text-red-600 dark:text-red-300 text-sm">{message.error}</p>
                        </div>
                      )}

                      {!message.isLoading && !message.error && (
                        <>
                          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                            <p className="text-gray-700 dark:text-gray-300">{message.content}</p>
                          </div>

                          {message.sql && (
                            <div className="bg-gray-900 rounded-xl overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
                                <div className="flex items-center gap-2 text-gray-400 text-xs">
                                  <Code className="w-4 h-4" />
                                  <span>SQL Query</span>
                                </div>
                                <button
                                  onClick={() => copySQL(message.sql!, message.id)}
                                  className="flex items-center gap-1 text-gray-400 hover:text-white text-xs"
                                >
                                  {copiedId === message.id ? (
                                    <><Check className="w-3 h-3" /> Copied</>
                                  ) : (
                                    <><Copy className="w-3 h-3" /> Copy</>
                                  )}
                                </button>
                              </div>
                              <pre className="p-4 text-sm text-green-400 overflow-x-auto max-h-40">
                                <code>{message.sql}</code>
                              </pre>
                            </div>
                          )}

                          {message.data && message.sql && renderDataVisualization(message.data, message.sql)}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                )}
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        {workflowState === 'exploring' && (
          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask a follow-up question..."
                  disabled={isAnalyzing}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 pr-12 resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none dark:text-white disabled:opacity-50"
                  rows={2}
                />
                <button
                  onClick={handleSend}
                  disabled={isAnalyzing || !input.trim()}
                  className="absolute right-2 bottom-2 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <ArrowRight className="w-5 h-5" />
                  )}
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-400">
                  Enter to send | After exploring, enter title and click Finalize
                </p>
                {messages.length >= 2 && (
                  <p className="text-xs text-amber-600 font-medium">
                    {messages.length} messages - Ready to finalize
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </MainLayout>
  );
}
