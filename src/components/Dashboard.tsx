import React, { useState } from 'react';
import { 
  Users, 
  MessageSquare, 
  Clock, 
  Star, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  Cpu, 
  CheckCircle, 
  AlertTriangle, 
  Sparkles,
  Database,
  RefreshCw,
  TrendingUp,
  Smile,
  ShieldAlert
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { AnalyticsSummary, OrchestrationTrace } from '../types';

interface DashboardProps {
  analytics: AnalyticsSummary;
  onSelectQuery: (query: string) => void;
  onReset: () => void;
}

export default function Dashboard({ analytics, onSelectQuery, onReset }: DashboardProps) {
  const [search, setSearch] = useState('');
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);
  const [intentFilter, setIntentFilter] = useState<string>('All');

  const filteredTraces = analytics.recentTraces.filter(trace => {
    const matchesSearch = trace.query.toLowerCase().includes(search.toLowerCase()) || 
                          trace.detectedIntent.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = intentFilter === 'All' || trace.routedAgents.includes(intentFilter);
    return matchesSearch && matchesFilter;
  });

  const sentimentData = [
    { name: 'Positive', value: analytics.sentimentTrends.positive, color: '#10B981' },
    { name: 'Neutral', value: analytics.sentimentTrends.neutral, color: '#6B7280' },
    { name: 'Negative', value: analytics.sentimentTrends.negative, color: '#EF4444' }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-natural-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-natural-400 mb-1">Total Conversations</p>
            <h3 className="text-3xl font-light text-natural-800">{analytics.totalConversations}</h3>
            <div className="flex gap-2 mt-2 text-[10px]">
              <span className="flex items-center text-natural-700 font-bold bg-natural-100 px-2 py-0.5 rounded">
                {analytics.resolvedConversations} Resolved
              </span>
              <span className="flex items-center text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded">
                {analytics.escalatedConversations} Escalated
              </span>
            </div>
          </div>
          <div className="p-3.5 bg-natural-100 rounded-2xl text-natural-500">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-natural-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-natural-400 mb-1">Customer CSAT Score</p>
            <div className="flex items-baseline gap-1">
              <h3 className="text-3xl font-light text-natural-800">{analytics.averageCSAT}</h3>
              <span className="text-xs text-natural-500 font-medium">/ 5.0</span>
            </div>
            <div className="flex items-center gap-0.5 mt-2 text-natural-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star 
                  key={i} 
                  className={`w-3 h-3 ${i < Math.round(analytics.averageCSAT) ? 'fill-natural-500 text-natural-500' : 'text-natural-200'}`} 
                />
              ))}
              <span className="text-[10px] text-natural-600 ml-1 font-semibold">CSAT Feedback</span>
            </div>
          </div>
          <div className="p-3.5 bg-natural-100 rounded-2xl text-natural-500">
            <Star className="w-5 h-5 fill-current" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-natural-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-natural-400 mb-1">Response Latency</p>
            <h3 className="text-3xl font-light text-natural-800">
              {(analytics.averageResponseTimeMs / 1000).toFixed(2)}s
            </h3>
            <p className="text-[10px] text-natural-700 mt-2 font-semibold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-natural-500" /> Complies with store SLA
            </p>
          </div>
          <div className="p-3.5 bg-natural-100 rounded-2xl text-natural-500">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-natural-100 p-6 rounded-[32px] border border-natural-300 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-natural-700 mb-1">RAG Resolution Rate</p>
            <h3 className="text-3xl font-light text-natural-800">
              {Math.round(((analytics.resolvedConversations) / (analytics.totalConversations || 1)) * 100)}%
            </h3>
            <p className="text-[10px] text-natural-600 mt-2 font-semibold flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-natural-500" /> Intelligent Routing
            </p>
          </div>
          <div className="p-3.5 bg-white rounded-2xl text-natural-500 shadow-xs">
            <Cpu className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-[32px] border border-natural-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-natural-900 text-sm">Multi-Agent Routing Distribution</h4>
              <p className="text-xs text-natural-600">Queries resolved by specialized task units</p>
            </div>
            <span className="text-[10px] bg-natural-50 text-natural-700 px-2 py-1 rounded border border-natural-200 flex items-center gap-1 font-mono font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-natural-500" /> Auto-classified
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.agentDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E6E0" />
                <XAxis dataKey="agent" tick={{ fill: '#6B705C', fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B705C', fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#2D3025', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Bar dataKey="calls" radius={[6, 6, 0, 0]}>
                  {analytics.agentDistribution.map((entry, index) => {
                    const naturalColors = ['#8C9E7E', '#A3B18A', '#5D6D4E', '#6B705C', '#344E41'];
                    const color = naturalColors[index % naturalColors.length];
                    return (
                      <Cell key={`cell-${index}`} fill={color} />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-natural-200 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-natural-900 text-sm">Customer Sentiment Trend</h4>
            <p className="text-xs text-natural-600 mb-4">Inferred satisfaction levels</p>
          </div>
          <div className="h-44 relative flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Positive', value: analytics.sentimentTrends.positive, color: '#8C9E7E' },
                    { name: 'Neutral', value: analytics.sentimentTrends.neutral, color: '#A3B18A' },
                    { name: 'Negative', value: analytics.sentimentTrends.negative, color: '#3D4035' }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {[
                    { name: 'Positive', color: '#8C9E7E' },
                    { name: 'Neutral', color: '#A3B18A' },
                    { name: 'Negative', color: '#3D4035' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#2D3025', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <Smile className="w-5 h-5 text-natural-400" />
              <span className="text-[10px] text-natural-600 font-bold uppercase tracking-wider">Tone Map</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            {[
              { name: 'Positive', value: analytics.sentimentTrends.positive, color: 'bg-[#8C9E7E]' },
              { name: 'Neutral', value: analytics.sentimentTrends.neutral, color: 'bg-[#A3B18A]' },
              { name: 'Negative', value: analytics.sentimentTrends.negative, color: 'bg-[#3D4035]' }
            ].map(d => (
              <div key={d.name} className="p-2 bg-natural-50 rounded-xl border border-natural-200">
                <div className="text-[9px] font-bold text-natural-600 flex items-center justify-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${d.color}`} /> {d.name}
                </div>
                <div className="text-sm font-extrabold text-natural-800 mt-0.5">{d.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[32px] border border-natural-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h4 className="font-bold text-natural-900 text-sm flex items-center gap-2">
              <Cpu className="w-5 h-5 text-natural-500" />
              Orchestrator Executions Trace Feed
            </h4>
            <p className="text-xs text-natural-600">Study the decision log of RAG retrieval, intent classification, and multi-agent responses</p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search className="w-4 h-4 text-natural-400 absolute left-3 top-2.5" />
              <input 
                type="text" 
                placeholder="Search queries..." 
                className="pl-9 pr-4 py-1.5 border border-natural-200 rounded-xl text-xs w-52 focus:outline-none focus:ring-1 focus:ring-natural-400 bg-natural-50"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select 
              className="border border-natural-200 rounded-xl text-xs px-3 py-1.5 focus:outline-none bg-white text-natural-700 font-medium"
              value={intentFilter}
              onChange={e => setIntentFilter(e.target.value)}
            >
              <option value="All">All Agents</option>
              <option value="Billing Agent">Billing</option>
              <option value="Technical Support Agent">Technical</option>
              <option value="Product Agent">Product</option>
              <option value="Complaint Agent">Complaint</option>
              <option value="FAQ Agent">FAQ</option>
            </select>
            <button 
              onClick={onReset}
              className="p-1.5 border border-natural-200 hover:bg-natural-50 text-natural-600 hover:text-natural-800 rounded-xl transition text-xs flex items-center gap-1 font-bold"
              title="Reset metrics"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        </div>

        <div className="border border-natural-200 rounded-2xl overflow-hidden divide-y divide-natural-200">
          {filteredTraces.length === 0 ? (
            <div className="p-8 text-center text-natural-500 text-xs font-medium">
              No trace logs matched search criteria or filters. Submit a query in Chat or run Simulation!
            </div>
          ) : (
            filteredTraces.map(trace => {
              const isExpanded = expandedTraceId === trace.id;
              const sentimentColor = trace.sentiment === 'positive' 
                ? 'text-natural-700 bg-natural-100' 
                : trace.sentiment === 'negative' 
                  ? 'text-red-700 bg-red-50' 
                  : 'text-natural-600 bg-natural-50';

              return (
                <div key={trace.id} className={`transition duration-150 ${isExpanded ? 'bg-natural-50/50' : 'hover:bg-natural-50/20'}`}>
                  <div 
                    className="p-4 flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedTraceId(isExpanded ? null : trace.id)}
                  >
                    <div className="space-y-1 flex-1 pr-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full ${sentimentColor}`}>
                          {trace.sentiment} ({trace.sentimentScore > 0 ? '+' : ''}{trace.sentimentScore})
                        </span>
                        <span className="text-xs font-semibold text-natural-800 line-clamp-1">{trace.query}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-natural-500 font-mono font-medium">
                        <span>{new Date(trace.timestamp).toLocaleTimeString()}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-natural-600 font-semibold">
                          <Cpu className="w-3 h-3 text-natural-500" /> Routed: {trace.routedAgents.join(', ')}
                        </span>
                        <span>•</span>
                        <span>Latency: {trace.responseTimeMs}ms</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectQuery(trace.query);
                        }}
                        className="text-[10px] font-bold text-white bg-natural-500 hover:bg-natural-600 px-3 py-1 rounded-lg transition"
                      >
                        Try In Chat
                      </button>
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-natural-500" /> : <ChevronRight className="w-4 h-4 text-natural-500" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-natural-200 bg-natural-50/20 grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs">
                      <div className="lg:col-span-5 space-y-4">
                        <div className="bg-white p-4 rounded-2xl border border-natural-200 shadow-sm space-y-2">
                          <h5 className="font-bold text-natural-800 flex items-center gap-1 text-xs">
                            <Sparkles className="w-3.5 h-3.5 text-natural-500" /> Intent &amp; Routing decision
                          </h5>
                          <div className="space-y-1 bg-natural-50 p-2.5 rounded-xl font-mono text-[11px] text-natural-700 border border-natural-200">
                            <div><strong className="text-natural-900">Classified Intent:</strong> {trace.detectedIntent}</div>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {trace.routedAgents.map(a => (
                                <span key={a} className="bg-natural-100 text-natural-800 text-[9px] font-extrabold px-2 py-0.5 rounded border border-natural-200">
                                  {a}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-natural-200 shadow-sm space-y-2">
                          <h5 className="font-bold text-natural-800 flex items-center gap-1 text-xs">
                            <Database className="w-3.5 h-3.5 text-natural-500" /> RAG Context Retrieval ({trace.retrievedChunks.length} chunks)
                          </h5>
                          {trace.retrievedChunks.length === 0 ? (
                            <p className="text-[10px] text-natural-500 italic">No exact company documents matched. Fallback reasoning applied.</p>
                          ) : (
                            <div className="space-y-2 max-h-44 overflow-y-auto">
                              {trace.retrievedChunks.map((chunk, idx) => (
                                <div key={idx} className="bg-natural-50 p-2.5 rounded-xl border border-natural-200 text-[11px]">
                                  <div className="flex justify-between font-bold text-natural-500 text-[9px] mb-1">
                                    <span>{chunk.fileName}</span>
                                    <span className="text-natural-700">Score: {chunk.score}</span>
                                  </div>
                                  <p className="text-natural-700 line-clamp-3 italic">"{chunk.content}"</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="lg:col-span-7 space-y-4">
                        <div className="bg-white p-4 rounded-2xl border border-natural-200 shadow-sm space-y-2">
                          <h5 className="font-bold text-natural-800 flex items-center gap-1 text-xs">
                            <Cpu className="w-3.5 h-3.5 text-natural-500" /> Specialized Agent Internal Voices
                          </h5>
                          <div className="space-y-2">
                            {Object.entries(trace.agentOutputs).map(([agent, response]) => (
                              <div key={agent} className="border-l-2 border-natural-400 pl-3 py-0.5">
                                <div className="text-[10px] font-extrabold text-natural-700 mb-0.5">{agent} Output:</div>
                                <p className="text-natural-600 text-[11px] line-clamp-3 italic">"{response}"</p>
                              </div>
                            ))}
                            {Object.keys(trace.agentOutputs).length === 0 && (
                              <p className="text-[10px] text-natural-500 italic">No agent reports recorded.</p>
                            )}
                          </div>
                        </div>

                        <div className="bg-natural-100 p-4 rounded-2xl border border-natural-300 shadow-sm space-y-1">
                          <h5 className="font-bold text-natural-800 flex items-center gap-1 text-xs">
                            <CheckCircle className="w-3.5 h-3.5 text-natural-600" /> Aggregated Final Customer Response
                          </h5>
                          <p className="text-natural-800 text-[11px] leading-relaxed bg-white p-3 rounded-xl border border-natural-200">
                            {trace.finalResponse}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
