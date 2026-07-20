import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  MessageSquareCode, 
  BookOpen, 
  Sparkles, 
  Cpu, 
  AlertTriangle,
  Github,
  Lock,
  UserPlus,
  LogIn,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  CheckCircle,
  Clock
} from 'lucide-react';
import { AnalyticsSummary, KBFile, Message } from './types';
import Dashboard from './components/Dashboard';
import ChatSimulator from './components/ChatSimulator';
import KnowledgeBase from './components/KnowledgeBase';
import SimulationCenter from './components/SimulationCenter';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<{ username: string } | null>(null);

  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'knowledge' | 'simulation'>('dashboard');
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [files, setFiles] = useState<KBFile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isSimulatingBatch, setIsSimulatingBatch] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [geminiActive, setGeminiActive] = useState(false);

  useEffect(() => {
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          setUser({ username: payload.username });
        }
      } catch (e) {
        console.error("Token decode error", e);
        handleLogout();
      }
      fetchInitialData();
    } else {
      setUser(null);
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setAnalytics(null);
    setFiles([]);
    setMessages([]);
    setErrorMessage('');
  };

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
      handleLogout();
      throw new Error("Session expired. Please log in again.");
    }
    return res;
  };

  const fetchInitialData = async () => {
    if (!token) return;
    try {
      const healthRes = await fetch('/api/health');
      const healthData = await healthRes.json();
      setGeminiActive(healthData.geminiActive);

      const analyticsRes = await authFetch('/api/analytics');
      const analyticsData = await analyticsRes.json();
      setAnalytics(analyticsData);

      const kbRes = await authFetch('/api/knowledge-base');
      const kbData = await kbRes.json();
      setFiles(kbData.files || []);
    } catch (err) {
      console.error("Error loading initial data", err);
      if (token) {
        setErrorMessage("Could not connect to backend server or session expired.");
      }
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUsername.trim() || !authPassword.trim()) return;
    setAuthLoading(true);
    setAuthError('');
    setAuthSuccess('');

    const endpoint = authTab === 'login' ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authUsername, password: authPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      if (authTab === 'login') {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setAuthUsername('');
        setAuthPassword('');
      } else {
        setAuthSuccess("Account registered! You can now log in.");
        setAuthTab('login');
        setAuthPassword('');
      }
    } catch (err: any) {
      setAuthError(err.message || "An authentication error occurred.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSendMessage = async (text: string, userProfile: { name: string; id: string }) => {
    setIsLoadingChat(true);
    setErrorMessage('');

    const userMsg: Message = {
      id: `m-user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await authFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text })
      });

      if (!res.ok) throw new Error("Failed to process message with AI Orchestrator.");

      const data = await res.json();
      if (data.assistantMessage) {
        setMessages(prev => [...prev, data.assistantMessage]);
      }
      if (data.analytics) {
        setAnalytics(data.analytics);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An error occurred executing your multi-agent routing.");
      setMessages(prev => [...prev, {
        id: `m-sys-${Date.now()}`,
        sender: 'system',
        text: `Error: ${err.message || "Failed to fetch response."}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  const handleProvideFeedback = async (messageId: string, rating: number) => {
    const activeConvId = messages.length > 0 ? messages[messages.length - 1].trace?.id : null;
    const assistantMsg = messages.find(m => m.id === messageId);
    const traceId = assistantMsg?.trace?.id;

    if (!traceId) return;

    try {
      const res = await authFetch('/api/chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: traceId || activeConvId,
          messageId,
          rating
        })
      });

      const data = await res.json();
      if (data.success) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, rating } : m));
        if (data.analytics) {
          setAnalytics(data.analytics);
        }
      }
    } catch (err) {
      console.error("Error logging feedback rating", err);
    }
  };

  const handleAddDocument = async (docOrFormData: any) => {
    try {
      const isFormData = docOrFormData instanceof FormData;
      const res = await authFetch(
        isFormData ? '/api/knowledge-base/upload-file' : '/api/knowledge-base/upload',
        {
          method: 'POST',
          headers: isFormData ? {} : { 'Content-Type': 'application/json' },
          body: isFormData ? docOrFormData : JSON.stringify(docOrFormData)
        }
      );
      const data = await res.json();
      if (data.success) {
        fetchInitialData();
      } else {
        setErrorMessage(data.error || "Failed to upload document.");
      }
    } catch (err: any) {
      console.error("Failed uploading custom document context", err);
      setErrorMessage(err.message || "Failed to upload document.");
    }
  };

  const handleRunBatchSimulation = async () => {
    setIsSimulatingBatch(true);
    try {
      const res = await authFetch('/api/simulation/run', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.analytics) {
        setAnalytics(data.analytics);
      }
    } catch (err) {
      console.error("Failed running simulator script batch", err);
    } finally {
      setIsSimulatingBatch(false);
    }
  };

  const handleResetSimulatorData = async () => {
    try {
      const res = await authFetch('/api/simulation/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.analytics) {
        setAnalytics(data.analytics);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed resetting dataset", err);
    }
  };

  const handleSelectQuery = (query: string) => {
    setCurrentQuery(query);
    setActiveTab('chat');
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-natural-100 flex flex-col justify-center items-center p-4 font-sans text-natural-800 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[#8C9E7E]/10 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#5D6D4E]/10 blur-3xl" />

        <div className="w-full max-w-md bg-white/80 backdrop-blur-md p-8 rounded-[32px] border border-white/50 shadow-2xl space-y-6 relative z-10">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-12 h-12 bg-natural-500 text-white rounded-2xl flex items-center justify-center shadow-md">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-bold text-natural-900 text-xl tracking-tight mt-2">
              TechMart Orchestrator
            </h1>
            <p className="text-xs text-natural-600 font-medium">
              Multi-Agent Support &amp; RAG System Portal
            </p>
          </div>

          <div className="flex bg-natural-100 p-1.5 rounded-2xl border border-natural-200/50">
            <button
              onClick={() => { setAuthTab('login'); setAuthError(''); setAuthSuccess(''); }}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition ${
                authTab === 'login' ? 'bg-[#8C9E7E] text-white shadow-sm' : 'text-natural-600 hover:text-natural-900'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthTab('register'); setAuthError(''); setAuthSuccess(''); }}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition ${
                authTab === 'register' ? 'bg-[#8C9E7E] text-white shadow-sm' : 'text-natural-600 hover:text-natural-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {authError && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccess && (
            <div className="p-3.5 bg-green-50 border border-green-200 text-green-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
              <span>{authSuccess}</span>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] text-natural-500 font-extrabold uppercase tracking-wider block mb-1">Username</label>
              <input
                type="text"
                placeholder="Enter username"
                className="w-full px-4 py-3 border border-natural-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#8C9E7E] bg-natural-50/50 text-natural-800"
                value={authUsername}
                onChange={e => setAuthUsername(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-[10px] text-natural-500 font-extrabold uppercase tracking-wider block mb-1">Password</label>
              <input
                type="password"
                placeholder="Enter password"
                className="w-full px-4 py-3 border border-natural-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#8C9E7E] bg-natural-50/50 text-natural-800"
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-natural-500 hover:bg-natural-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
            >
              {authLoading ? (
                <span>Processing...</span>
              ) : authTab === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" /> Sign In
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Create Account
                </>
              )}
            </button>
          </form>

          {authTab === 'login' && (
            <p className="text-[10px] text-center text-natural-500 font-medium">
              Demo admin credentials: <strong className="text-natural-700">admin / admin123</strong>
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-natural-50 flex flex-col font-sans text-natural-800">
      <header className="bg-white border-b border-natural-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-natural-500 text-white rounded-xl flex items-center justify-center shadow-sm">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-natural-900 text-sm tracking-tight sm:text-base">
              TechMart Support Orchestrator
            </h1>
            <p className="text-[10px] sm:text-xs text-natural-600 font-medium">
              Multi-Agent Support &amp; RAG Capstone
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${
            geminiActive 
              ? 'bg-natural-100 text-natural-700 border border-natural-300' 
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${geminiActive ? 'bg-natural-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>{geminiActive ? 'Gemini 3.5 AI Pipeline Active' : 'Semantic Keyword Fallback Active'}</span>
          </div>

          {user && (
            <div className="flex items-center gap-2.5 pl-3 border-l border-natural-200">
              <div className="flex flex-col text-right">
                <span className="text-[10px] font-bold text-natural-800 font-mono">@{user.username}</span>
                <span className="text-[9px] text-natural-500 font-medium uppercase tracking-wider">Session Active</span>
              </div>
              <button 
                onClick={handleLogout}
                title="Log Out"
                className="p-1.5 border border-natural-200 hover:bg-red-50 hover:border-red-200 text-natural-600 hover:text-red-600 rounded-xl transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <nav className="md:w-60 bg-natural-100/70 border-r border-natural-200 p-4 shrink-0 flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible">
          <div className="hidden md:block mb-3 px-3">
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-natural-400">Navigation</h3>
          </div>

          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition w-full shrink-0 text-left ${
              activeTab === 'dashboard' 
                ? 'bg-[#8C9E7E] text-white shadow-sm' 
                : 'text-natural-600 hover:text-natural-900 hover:bg-natural-200/50'
            }`}
          >
            <BarChart3 className="w-4.5 h-4.5" />
            <span>Analytics Dashboard</span>
          </button>

          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition w-full shrink-0 text-left ${
              activeTab === 'chat' 
                ? 'bg-[#8C9E7E] text-white shadow-sm' 
                : 'text-natural-600 hover:text-natural-900 hover:bg-natural-200/50'
            }`}
          >
            <MessageSquareCode className="w-4.5 h-4.5" />
            <span>Support Chat Simulator</span>
          </button>

          <button 
            onClick={() => setActiveTab('knowledge')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition w-full shrink-0 text-left ${
              activeTab === 'knowledge' 
                ? 'bg-[#8C9E7E] text-white shadow-sm' 
                : 'text-natural-600 hover:text-natural-900 hover:bg-natural-200/50'
            }`}
          >
            <BookOpen className="w-4.5 h-4.5" />
            <span>Knowledge Base (RAG)</span>
          </button>

          <button 
            onClick={() => setActiveTab('simulation')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition w-full shrink-0 text-left ${
              activeTab === 'simulation' 
                ? 'bg-[#8C9E7E] text-white shadow-sm' 
                : 'text-natural-600 hover:text-natural-900 hover:bg-natural-200/50'
            }`}
          >
            <Sparkles className="w-4.5 h-4.5" />
            <span>Simulation Center</span>
          </button>

          <div className="hidden md:block mt-auto bg-[#8C9E7E] rounded-2xl p-4 text-white">
            <p className="text-[10px] opacity-80 mb-1 font-bold uppercase tracking-wider">Weekly Insight</p>
            <p className="text-xs font-serif italic leading-relaxed">
              "Sustainability isn't just a trend, it's the new baseline for consumer trust."
            </p>
          </div>
        </nav>

        <main className="flex-1 p-6 overflow-y-auto bg-natural-50">
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4.5 h-4.5 text-red-600" /> {errorMessage}
            </div>
          )}

          {analytics === null ? (
            <div className="h-64 flex flex-col items-center justify-center text-center space-y-2">
              <Cpu className="w-8 h-8 text-natural-400 animate-spin" />
              <p className="text-xs text-natural-600">Booting support database and preloading trends metrics...</p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <Dashboard 
                  analytics={analytics} 
                  onSelectQuery={handleSelectQuery}
                  onReset={handleResetSimulatorData}
                />
              )}

              {activeTab === 'chat' && (
                <ChatSimulator 
                  messages={messages}
                  isLoading={isLoadingChat}
                  onSendMessage={handleSendMessage}
                  onProvideFeedback={handleProvideFeedback}
                  currentQuery={currentQuery}
                  onResetQuery={() => setCurrentQuery('')}
                />
              )}

              {activeTab === 'knowledge' && (
                <KnowledgeBase 
                  files={files}
                  onAddDocument={handleAddDocument}
                />
              )}

              {activeTab === 'simulation' && (
                <SimulationCenter 
                  onRunBatch={handleRunBatchSimulation}
                  onResetAll={handleResetSimulatorData}
                  isSimulating={isSimulatingBatch}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
