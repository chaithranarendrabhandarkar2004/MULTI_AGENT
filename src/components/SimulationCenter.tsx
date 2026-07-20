import React, { useState } from 'react';
import { 
  Play, 
  RotateCcw, 
  Sparkles, 
  Code, 
  BookOpen, 
  Cpu, 
  CheckCircle, 
  AlertTriangle,
  Info
} from 'lucide-react';

interface SimulationCenterProps {
  onRunBatch: () => void;
  onResetAll: () => void;
  isSimulating: boolean;
}

export default function SimulationCenter({ onRunBatch, onResetAll, isSimulating }: SimulationCenterProps) {
  const [successMsg, setSuccessMsg] = useState(false);

  const handleRun = async () => {
    onRunBatch();
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
    }, 3000);
  };

  const modules = [
    {
      step: "Module 1 & 2",
      title: "Authentication & UI",
      desc: "Implement a secure session login and standard React chat thread displaying historical support cards."
    },
    {
      step: "Module 3 & 4",
      title: "Intent Detector & Agent Router",
      desc: "Parse user queries with Gemini JSON schema tools to classify core domains and dispatch execution tokens to specialized AI agent agents."
    },
    {
      step: "Module 5 & 6",
      title: "RAG Pipeline & Documents Index",
      desc: "Process TechMart's PDF policies (FAQ, Refund, Specs, etc.) into discrete paragraphs, index them, and match queries with semantic vector reranking."
    },
    {
      step: "Module 7 & 8",
      title: "Aggregated Completion & Memory",
      desc: "Inject retrieved RAG document snippets as prompt parameters to individual agent voices. Consolidate separate outputs into a singular polite response, storing traces in conversation session databases."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-[32px] border border-natural-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-natural-200 pb-4 mb-4">
          <div>
            <h4 className="font-bold text-natural-900 text-sm flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-natural-500 animate-pulse" />
              Automated Support Scenario Simulator
            </h4>
            <p className="text-xs text-natural-600">Generate simulated user scenarios to examine routing algorithms and fill dashboard statistics</p>
          </div>
          
          <div className="flex gap-2 shrink-0">
            <button 
              onClick={handleRun}
              disabled={isSimulating}
              className="px-4 py-2.5 bg-natural-500 hover:bg-natural-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
            >
              <Play className="w-4 h-4 fill-current text-white" /> 
              {isSimulating ? 'Simulating Batch...' : 'Generate 5 Support Chats'}
            </button>
            
            <button 
              onClick={onResetAll}
              className="px-4 py-2.5 border border-natural-200 hover:bg-natural-50 text-natural-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 bg-white"
            >
              <RotateCcw className="w-4 h-4" /> Reset Simulator Data
            </button>
          </div>
        </div>

        {isSimulating && (
          <div className="p-4 bg-natural-100 border border-natural-300 text-natural-800 rounded-2xl text-xs space-y-2 animate-pulse">
            <div className="font-bold flex items-center gap-1.5 text-natural-900">
              <Cpu className="w-4 h-4 animate-spin text-natural-500" /> Batch Simulation active on Server
            </div>
            <p className="leading-relaxed text-natural-750">
              Synthesizing random customer profiles using Gemini. The orchestrator is running automated intent detection, routing specialized agents, fetching RAG documents, and compiling aggregated responses...
            </p>
          </div>
        )}

        {successMsg && !isSimulating && (
          <div className="p-4 bg-natural-100 border border-natural-300 text-natural-800 rounded-2xl text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-natural-500" /> Batch completed successfully! Metrics, sentiment, and Multi-Agent traces have been updated in the Analytics Dashboard.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 text-xs text-natural-700 leading-relaxed">
          <div className="bg-natural-50 p-5 rounded-2xl border border-natural-200 space-y-2">
            <h5 className="font-bold text-natural-900 text-xs flex items-center gap-1">
              <Cpu className="w-4 h-4 text-natural-500" /> Multi-Agent Collaboration
            </h5>
            <p>
              When a query covers multiple fields, the central **Orchestration Router** spawns concurrent sub-tasks. For instance, 'I bought a vacuum and got double charged but it won't connect to Wi-Fi' activates both the **Billing Agent** and **Technical Support Agent** to draft context-specific responses, compiled seamlessly by the **Response Aggregator**.
            </p>
          </div>

          <div className="bg-natural-50 p-5 rounded-2xl border border-natural-200 space-y-2">
            <h5 className="font-bold text-natural-900 text-xs flex items-center gap-1">
              <BookOpen className="w-4 h-4 text-natural-500" /> RAG-Driven Responses
            </h5>
            <p>
              Rather than replying with generic LLM knowledge, our specialized support agents search our custom **TechMart Knowledge Base** for exact matching manual paragraphs. This prevents AI hallucination and guarantees all warranty, pricing, setup, and refund info aligns with store policies.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[32px] border border-natural-200 shadow-sm space-y-4">
        <div>
          <h4 className="font-bold text-natural-900 text-sm">Capstone Implementation Modules</h4>
          <p className="text-xs text-natural-600">Fulfill the rubrics of the customer-support-ai industry project</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((m, idx) => (
            <div key={idx} className="p-4 border border-natural-200 rounded-2xl space-y-1.5 hover:border-natural-400 hover:bg-natural-50/40 transition bg-white">
              <div className="flex justify-between items-center text-[9px] font-extrabold text-natural-500 tracking-wider uppercase">
                <span>{m.step}</span>
                <span className="bg-natural-100 border border-natural-200 px-1.5 py-0.5 rounded text-natural-700 font-mono font-bold">Module</span>
              </div>
              <h5 className="font-bold text-natural-800 text-xs">{m.title}</h5>
              <p className="text-xs text-natural-600 leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
