import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Cpu, 
  User, 
  Sparkles, 
  Database, 
  Star, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw,
  HelpCircle,
  TrendingDown,
  TrendingUp,
  Meh
} from 'lucide-react';
import { Message, OrchestrationTrace } from '../types';

interface ChatSimulatorProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (text: string, user: { name: string; id: string }) => void;
  onProvideFeedback: (messageId: string, rating: number) => void;
  currentQuery: string;
  onResetQuery: () => void;
}

export default function ChatSimulator({ 
  messages, 
  isLoading, 
  onSendMessage, 
  onProvideFeedback,
  currentQuery,
  onResetQuery
}: ChatSimulatorProps) {
  const [inputText, setInputText] = useState('');
  const [userName, setUserName] = useState('John Doe');
  const [userId, setUserId] = useState('u-john');
  const [activeTrace, setActiveTrace] = useState<OrchestrationTrace | null>(null);
  
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (currentQuery) {
      setInputText(currentQuery);
      onResetQuery();
    }
  }, [currentQuery]);
  
  useEffect(() => {
    const assistantMessages = messages.filter(m => m.sender === 'assistant' && m.trace);
    if (assistantMessages.length > 0) {
      setActiveTrace(assistantMessages[assistantMessages.length - 1].trace || null);
    } else {
      setActiveTrace(null);
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText, { name: userName, id: userId });
    setInputText('');
  };

  const handlePresetClick = (preset: string) => {
    if (isLoading) return;
    onSendMessage(preset, { name: userName, id: userId });
  };

  const samplePresets = [
    "Wi-Fi keeps dropping on my RoboVac X12 and I see a duplicate charge of $249.99 on my account!",
    "How much does the SmartWatch 3 cost? Compare its battery life with the wireless EarBuds Pro.",
    "My SmartTV screen is completely black, and your phone lines are busy! I want a full refund immediately.",
    "What is your refund restocking fee, and do you ship orders to Canada?"
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-fade-in h-[calc(100vh-180px)]">
      {/* LEFT COLUMN: Customer Chat Window (7/12 cols) */}
      <div className="xl:col-span-7 bg-white rounded-[32px] border border-natural-200 shadow-sm flex flex-col h-full overflow-hidden">
        {/* Chat Header & Active Simulation Profile selector */}
        <div className="p-4 border-b border-natural-200 bg-natural-100/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-natural-500 rounded-full animate-pulse" />
            <h4 className="font-bold text-natural-900 text-sm">Customer Chat Window</h4>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-natural-600 font-bold uppercase tracking-wider text-[10px]">Customer Profile:</span>
            <select 
              className="bg-white border border-natural-200 rounded-xl px-3 py-1.5 text-natural-800 font-semibold focus:outline-none focus:ring-1 focus:ring-natural-400"
              value={`${userName}|${userId}`}
              onChange={(e) => {
                const [name, id] = e.target.value.split('|');
                setUserName(name);
                setUserId(id);
              }}
            >
              <option value="John Doe|u-john">🧑 John Doe (Standard User)</option>
              <option value="Sarah Connor|u-sarah">👩 Sarah Connor (Frustrated Customer)</option>
              <option value="Bruce Wayne|u-bruce">🦸 Bruce Wayne (VIP Enterprise Member)</option>
            </select>
          </div>
        </div>

        {/* Message Thread Display Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-natural-50/20">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-3">
              <div className="p-4 bg-natural-100 rounded-full text-natural-600 border border-natural-200">
                <HelpCircle className="w-8 h-8" />
              </div>
              <h5 className="font-bold text-natural-900 text-sm">Start the Support Simulation</h5>
              <p className="text-xs text-natural-600 leading-relaxed">
                Choose one of our complex customer scenarios below or type a custom question to see the Orchestrator split, route, retrieve, and synthesize responses in real-time.
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isUser = msg.sender === 'user';
              const hasTrace = msg.trace !== undefined;

              return (
                <div 
                  key={msg.id || index} 
                  className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  <div className={`p-2 rounded-full h-8 w-8 flex items-center justify-center text-xs shrink-0 ${
                    isUser ? 'bg-natural-500 text-white shadow-xs' : 'bg-natural-100 text-natural-700 border border-natural-200'
                  }`}>
                    {isUser ? <User className="w-4 h-4" /> : <Cpu className="w-4 h-4" />}
                  </div>

                  <div className="space-y-1">
                    <div className="text-[9px] text-natural-500 font-bold uppercase tracking-wider px-1">
                      {isUser ? userName : 'TechMart Support AI'} • {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                    
                    <div className={`p-4 rounded-2xl text-xs leading-relaxed ${
                      isUser 
                        ? 'bg-natural-500 text-white rounded-tr-none' 
                        : 'bg-white text-natural-800 border border-natural-200 shadow-xs rounded-tl-none'
                    }`}>
                      {msg.text.split('\n').map((para, i) => (
                        <p key={i} className={i > 0 ? 'mt-2' : ''}>{para}</p>
                      ))}

                      {/* Display CSAT Stars Picker on the very last assistant message */}
                      {!isUser && !msg.rating && index === messages.length - 1 && (
                        <div className="mt-4 pt-3 border-t border-natural-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="text-[10px] text-natural-500 font-bold">Was this response helpful?</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button 
                                key={star}
                                onClick={() => onProvideFeedback(msg.id, star)}
                                className="p-0.5 hover:scale-125 transition text-natural-300 hover:text-natural-500 focus:outline-none"
                                title={`Rate ${star} Stars`}
                              >
                                <Star className="w-4 h-4 fill-current" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Confirmed CSAT Score */}
                      {!isUser && msg.rating && (
                        <div className="mt-3 pt-2 border-t border-natural-100 flex items-center gap-1.5 text-[10px] text-natural-700 font-bold bg-natural-100 px-2.5 py-1 rounded-xl w-max border border-natural-200">
                          <Star className="w-3.5 h-3.5 fill-natural-500 text-natural-500" /> Rated {msg.rating} / 5.0 Helpful
                        </div>
                      )}
                    </div>

                    {/* Button to click and pull the trace for this historical message */}
                    {hasTrace && (
                      <button 
                        onClick={() => setActiveTrace(msg.trace || null)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-xl transition flex items-center gap-1 ${
                          activeTrace?.id === msg.trace?.id 
                            ? 'text-natural-800 bg-natural-200/60 font-extrabold' 
                            : 'text-natural-500 hover:text-natural-800 hover:bg-natural-100'
                        }`}
                      >
                        <Sparkles className="w-3 h-3 text-natural-500" /> {activeTrace?.id === msg.trace?.id ? 'Viewing execution trace' : 'Inspect orchestration logs'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {isLoading && (
            <div className="flex gap-3 max-w-[80%] mr-auto">
              <div className="p-2 rounded-full h-8 w-8 bg-natural-100 flex items-center justify-center border border-natural-200 shrink-0">
                <Cpu className="w-4 h-4 animate-spin text-natural-500" />
              </div>
              <div className="space-y-1">
                <div className="text-[9px] text-natural-500 font-bold uppercase tracking-wider px-1">Orchestrator Routing...</div>
                <div className="bg-white p-3.5 rounded-2xl border border-natural-200 shadow-xs rounded-tl-none flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-1.5 h-1.5 bg-natural-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-natural-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-natural-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-natural-500 font-mono italic">Invoking multi-agent pipeline...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Suggested presets for easy demo queries */}
        {messages.length === 0 && (
          <div className="p-4 border-t border-natural-200 bg-natural-100/40 space-y-2">
            <span className="text-[10px] text-natural-500 uppercase tracking-[0.1em] font-extrabold block">Select a Demonstration query:</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {samplePresets.map((preset, i) => (
                <button 
                  key={i}
                  onClick={() => handlePresetClick(preset)}
                  className="p-3 bg-white border border-natural-200 hover:border-natural-400 rounded-xl text-left text-[11px] text-natural-700 hover:text-natural-900 hover:bg-natural-100/30 transition shadow-xs font-semibold line-clamp-2"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Typing Form Input */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-natural-200 bg-white flex gap-2">
          <input 
            type="text" 
            placeholder={isLoading ? "Orchestrating..." : "Ask TechMart support..."}
            className="flex-1 px-4 py-2.5 border border-natural-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-natural-400 bg-natural-50 text-natural-800"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
          />
          <button 
            type="submit"
            className="p-2.5 bg-natural-500 hover:bg-natural-600 text-white rounded-xl transition flex items-center justify-center shrink-0 disabled:opacity-50 shadow-xs"
            disabled={isLoading || !inputText.trim()}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* RIGHT COLUMN: Live System Trace Console (5/12 cols) - Styled with Forest dark theme */}
      <div className="xl:col-span-5 bg-forest rounded-[32px] border border-[#2D3025] shadow-xl flex flex-col h-full overflow-hidden text-[#E8E6E0] font-mono text-[11px]">
        {/* Terminal Header */}
        <div className="p-4 border-b border-[#2D3025] bg-[#2D3025] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#A3B18A]" />
            <span className="font-bold text-xs text-[#A3B18A]">System Orchestrator Trace</span>
          </div>
          <span className="bg-[#3D4035] text-[#D4D9C7] px-2 py-0.5 rounded text-[9px] uppercase font-extrabold tracking-wider">
            Live Console
          </span>
        </div>

        {/* Terminal Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-5 bg-forest">
          {!activeTrace ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-[#A3B18A] py-12">
              <Sparkles className="w-8 h-8 mb-2 text-[#5D6D4E]" />
              <p className="text-[10px]">Awaiting query execution...</p>
              <p className="text-[9px] mt-1 max-w-[180px] mx-auto opacity-70">Trace logs will stream here detailing the agent decision tree.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Step 1: Intent & Sentiment */}
              <div className="space-y-1.5 border-b border-[#2D3025]/40 pb-3">
                <div className="flex items-center gap-2 text-[#D4D9C7] font-bold">
                  <span className="opacity-50">1.</span>
                  <span>INTENT_DETECTOR &amp; SENTIMENT</span>
                </div>
                <div className="bg-[#2D3025]/80 p-3 rounded-xl border border-[#2D3025] space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span>Detected Intent:</span>
                    <span className="text-[#F1F3EB] font-bold">{activeTrace.detectedIntent}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Sentiment Assessment:</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        activeTrace.sentiment === 'positive' 
                          ? 'bg-[#8C9E7E]/30 text-[#8C9E7E]' 
                          : activeTrace.sentiment === 'negative' 
                            ? 'bg-red-950/40 text-red-400' 
                            : 'bg-[#5D6D4E]/30 text-[#D4D9C7]'
                      }`}>
                        {activeTrace.sentiment}
                      </span>
                      <span className="text-[9px] opacity-60">Score: {activeTrace.sentimentScore}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Agent Routing Checklist */}
              <div className="space-y-1.5 border-b border-[#2D3025]/40 pb-3">
                <div className="flex items-center gap-2 text-[#D4D9C7] font-bold">
                  <span className="opacity-50">2.</span>
                  <span>ROUTER_DISPATCH_DECISION</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 bg-[#2D3025]/80 p-3 rounded-xl border border-[#2D3025] text-slate-300">
                  {["Billing Agent", "Technical Support Agent", "Product Agent", "Complaint Agent", "FAQ Agent"].map(agent => {
                    const isActive = activeTrace.routedAgents.includes(agent);
                    return (
                      <div key={agent} className={`flex items-center gap-2 ${isActive ? 'text-[#8C9E7E] font-semibold' : 'opacity-30'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#8C9E7E] animate-pulse' : 'bg-slate-600'}`} />
                        <span>{agent}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: RAG Retrieval */}
              <div className="space-y-1.5 border-b border-[#2D3025]/40 pb-3">
                <div className="flex items-center gap-2 text-[#D4D9C7] font-bold">
                  <span className="opacity-50">3.</span>
                  <span>RAG_RETRIEVER_CHUNKS</span>
                </div>
                <div className="space-y-1.5">
                  {activeTrace.retrievedChunks.length === 0 ? (
                    <div className="bg-[#2D3025]/80 p-3 rounded-xl border border-[#2D3025] text-slate-400 italic text-[10px]">
                      No matching company document chunks found in index.
                    </div>
                  ) : (
                    activeTrace.retrievedChunks.map((chunk, idx) => (
                      <div key={idx} className="bg-[#2D3025]/80 p-3 rounded-xl border border-[#2D3025] text-[10px] text-slate-300 space-y-1">
                        <div className="flex justify-between font-bold text-slate-400 text-[9px]">
                          <span>{chunk.fileName}</span>
                          <span className="text-[#8C9E7E]">Rank Score: {chunk.score}</span>
                        </div>
                        <p className="italic opacity-85">"{chunk.content}"</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Step 4: Individual Agent Responses */}
              <div className="space-y-1.5 border-b border-[#2D3025]/40 pb-3">
                <div className="flex items-center gap-2 text-[#D4D9C7] font-bold">
                  <span className="opacity-50">4.</span>
                  <span>SPECIALIZED_AGENT_REPORTS</span>
                </div>
                <div className="space-y-2">
                  {Object.entries(activeTrace.agentOutputs).map(([agent, text]) => (
                    <div key={agent} className="bg-[#2D3025]/80 p-3 rounded-xl border border-[#2D3025] space-y-1 text-slate-300">
                      <div className="font-bold text-[#8C9E7E] text-[10px]">{agent} Result:</div>
                      <p className="italic opacity-85">"{text}"</p>
                    </div>
                  ))}
                  {Object.keys(activeTrace.agentOutputs).length === 0 && (
                    <div className="opacity-50 text-[10px] italic">No active reports received.</div>
                  )}
                </div>
              </div>

              {/* Step 5: Aggregator Synthesis */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[#8C9E7E] font-bold">
                  <span className="opacity-50">5.</span>
                  <span>RESPONSE_AGGREGATOR_COMPOSE</span>
                </div>
                <div className="bg-[#2D3025] p-3 rounded-xl border border-[#3D4035] text-[10px] text-[#F1F3EB] leading-relaxed">
                  <div className="text-[#8C9E7E] font-bold mb-1">AGGREGATOR_SYNTHESIS:</div>
                  "{activeTrace.finalResponse}"
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Console Status Footer */}
        {activeTrace && (
          <div className="p-3 bg-[#2D3025] border-t border-[#3D4035] flex items-center justify-between text-[10px] text-slate-400">
            <span>Trace Session: {activeTrace.id}</span>
            <span>Est. Tokens: {activeTrace.tokensUsed || 310}</span>
          </div>
        )}
      </div>
    </div>
  );
}
