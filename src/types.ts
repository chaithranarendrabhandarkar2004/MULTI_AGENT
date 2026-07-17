/**
 * Shared Type Declarations for Multi-Agent AI Support & Dashboard
 */

export interface Message {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  rating?: number; // CSAT score 1-5
  trace?: OrchestrationTrace; // Multi-Agent execution trace logs
}

export interface OrchestrationTrace {
  id: string;
  query: string;
  timestamp: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number; // -1 to 1
  detectedIntent: string;
  routedAgents: string[];
  retrievedChunks: RetrievedChunk[];
  agentOutputs: Record<string, string>; // agentName -> raw response snippet
  finalResponse: string;
  tokensUsed?: number;
  responseTimeMs: number;
}

export interface RetrievedChunk {
  fileName: string;
  content: string;
  score: number;
}

export interface KBFile {
  id: string;
  name: string;
  category: 'policy' | 'faq' | 'manual' | 'products' | 'pricing';
  size: string;
  content: string;
  chunksCount: number;
}

export interface KBChunk {
  id: string;
  fileId: string;
  fileName: string;
  content: string;
  embeddingSnippet?: string;
}

export interface Conversation {
  id: string;
  userId: string;
  userName: string;
  messages: Message[];
  status: 'active' | 'resolved' | 'escalated';
  createdAt: string;
  updatedAt: string;
}

export interface AgentMetrics {
  id: string;
  name: string;
  icon: string;
  description: string;
  totalCalls: number;
  resolvedCalls: number;
  escapedCalls: number;
  avgResponseTimeMs: number;
  color: string;
}

export interface AnalyticsSummary {
  totalConversations: number;
  activeConversations: number;
  resolvedConversations: number;
  escalatedConversations: number;
  averageResponseTimeMs: number;
  averageCSAT: number; // 1 to 5
  sentimentTrends: {
    positive: number;
    neutral: number;
    negative: number;
  };
  agentDistribution: {
    agent: string;
    calls: number;
    color: string;
  }[];
  recentTraces: OrchestrationTrace[];
  volumeTimeline: {
    time: string;
    queries: number;
  }[];
}
