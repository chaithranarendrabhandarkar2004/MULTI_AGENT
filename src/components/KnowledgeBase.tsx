import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Search, 
  FileText, 
  Plus, 
  CheckCircle, 
  ArrowRight, 
  Sparkles, 
  Tag,
  Eye,
  Info,
  Upload,
  File
} from 'lucide-react';
import { KBFile, KBChunk, RetrievedChunk } from '../types';

interface KnowledgeBaseProps {
  onAddDocument: (docOrFormData: any) => void;
  files: KBFile[];
}

export default function KnowledgeBase({ onAddDocument, files }: KnowledgeBaseProps) {
  const [selectedFile, setSelectedFile] = useState<KBFile | null>(null);
  const [sandboxQuery, setSandboxQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMethod, setSearchMethod] = useState('');
  const [uploadMode, setUploadMode] = useState<'text' | 'file'>('file');
  const [newDocName, setNewDocName] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [newDocCategory, setNewDocCategory] = useState('policy');
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    if (files.length > 0 && !selectedFile) {
      setSelectedFile(files[0]);
    }
  }, [files]);

  const handleSearchSandbox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sandboxQuery.trim()) return;
    setIsSearching(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch("/api/knowledge-base/search", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ query: sandboxQuery })
      });
      const data = await res.json();
      setSearchResults(data.results || []);
      setSearchMethod(data.method || 'Search');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (uploadMode === 'file') {
      if (!selectedUploadFile) return;
      const formData = new FormData();
      formData.append('file', selectedUploadFile);
      formData.append('category', newDocCategory);
      onAddDocument(formData);
    } else {
      if (!newDocName.trim() || !newDocContent.trim()) return;
      onAddDocument({
        name: newDocName,
        content: newDocContent,
        category: newDocCategory
      });
    }

    setUploadSuccess(true);
    setNewDocName('');
    setNewDocContent('');
    setSelectedUploadFile(null);
    setTimeout(() => {
      setUploadSuccess(false);
      setShowUploadForm(false);
    }, 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
      <div className="lg:col-span-4 bg-white p-6 rounded-[32px] border border-natural-200 shadow-sm flex flex-col h-[calc(100vh-180px)] overflow-hidden">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h4 className="font-bold text-natural-900 text-sm">Indexed Files</h4>
            <p className="text-[10px] text-natural-600">Core TechMart documents for RAG context</p>
          </div>
          <button 
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="p-1.5 bg-natural-100 hover:bg-natural-200 text-natural-800 rounded-xl text-[10px] font-bold flex items-center gap-1 transition border border-natural-200"
          >
            <Plus className="w-3.5 h-3.5" /> Index File
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {files.map((file) => {
            const isSelected = selectedFile?.id === file.id;
            return (
              <div 
                key={file.id}
                onClick={() => {
                  setSelectedFile(file);
                  setShowUploadForm(false);
                }}
                className={`p-3.5 rounded-2xl border text-left cursor-pointer transition ${
                  isSelected 
                    ? 'bg-natural-100 border-natural-300 shadow-xs' 
                    : 'border-natural-200 hover:bg-natural-50/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-natural-200 text-natural-800' : 'bg-natural-100 text-natural-500'}`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-bold text-natural-800 text-xs">{file.name}</h5>
                    <div className="flex items-center gap-2 text-[9px] text-natural-500 font-bold font-mono">
                      <span className="uppercase tracking-wider bg-natural-100 text-natural-600 px-1.5 py-0.5 rounded border border-natural-200/50">
                        {file.category}
                      </span>
                      <span>Size: {file.size}</span>
                      <span>•</span>
                      <span className="text-natural-700">{file.chunksCount || 0} chunks</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="lg:col-span-8 space-y-6 flex flex-col h-[calc(100vh-180px)] overflow-hidden">
        {showUploadForm ? (
          <div className="bg-white p-6 rounded-[32px] border border-natural-200 shadow-sm flex-1 overflow-y-auto">
            <h4 className="font-bold text-natural-900 text-sm mb-1">Index Custom Documents</h4>
            <p className="text-[10px] text-natural-600 mb-5">
              Upload PDF/TXT manuals or copy raw text. The system automatically extracts, embeds, and indexes document segments.
            </p>

            {uploadSuccess ? (
              <div className="p-8 text-center text-natural-800 bg-natural-100 rounded-[24px] border border-natural-300 flex flex-col items-center justify-center space-y-2">
                <CheckCircle className="w-8 h-8 text-natural-500" />
                <h5 className="font-bold text-sm">Document Indexed!</h5>
                <p className="text-xs text-natural-600">File is processed and vector embeddings are saved.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex bg-natural-100 p-1 rounded-xl border border-natural-200/50 w-max">
                  <button
                    type="button"
                    onClick={() => setUploadMode('file')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      uploadMode === 'file' ? 'bg-[#8C9E7E] text-white shadow-xs' : 'text-natural-600 hover:text-natural-900'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload PDF/TXT
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode('text')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      uploadMode === 'text' ? 'bg-[#8C9E7E] text-white shadow-xs' : 'text-natural-600 hover:text-natural-900'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" /> Paste Raw Text
                  </button>
                </div>

                <form onSubmit={handleUploadSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-natural-500 font-extrabold uppercase tracking-wider block mb-1">Doc Category</label>
                      <select 
                        className="w-full border border-natural-200 rounded-xl text-xs px-3 py-2.5 focus:outline-none bg-white text-natural-800 font-semibold"
                        value={newDocCategory}
                        onChange={e => setNewDocCategory(e.target.value)}
                      >
                        <option value="policy">Policy / Returns</option>
                        <option value="products">Hardware Catalog</option>
                        <option value="pricing">Sub Tiers &amp; SLAs</option>
                        <option value="manual">Operation manual</option>
                      </select>
                    </div>
                  </div>

                  {uploadMode === 'file' ? (
                    <div className="space-y-2">
                      <label className="text-[10px] text-natural-500 font-extrabold uppercase tracking-wider block">Document File (.pdf, .txt)</label>
                      <div className="border-2 border-dashed border-natural-200 hover:border-natural-400 rounded-2xl p-8 text-center cursor-pointer transition bg-natural-50 relative">
                        <input 
                          type="file" 
                          accept=".pdf,.txt" 
                          onChange={e => {
                            if (e.target.files && e.target.files[0]) {
                              setSelectedUploadFile(e.target.files[0]);
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          required
                        />
                        <div className="flex flex-col items-center space-y-2 text-natural-500">
                          <Upload className="w-8 h-8 text-natural-400" />
                          {selectedUploadFile ? (
                            <div className="flex items-center gap-1.5 text-natural-800 font-bold text-xs">
                              <File className="w-4 h-4 text-natural-500" />
                              {selectedUploadFile.name} ({(selectedUploadFile.size / 1024).toFixed(1)} KB)
                            </div>
                          ) : (
                            <>
                              <p className="text-xs font-bold text-natural-700">Click or drag PDF/TXT file here to upload</p>
                              <p className="text-[10px]">Maximum file size: 10MB</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="text-[10px] text-natural-500 font-extrabold uppercase tracking-wider block mb-1">File Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. SmartWatchWarrantyExtension.pdf" 
                          className="w-full px-3 py-2 border border-natural-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-natural-400 bg-natural-50 text-natural-800"
                          value={newDocName}
                          onChange={e => setNewDocName(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-natural-500 font-extrabold uppercase tracking-wider block mb-1">Raw Text Contents</label>
                        <textarea 
                          rows={8}
                          placeholder="Write or copy company policies here..."
                          className="w-full px-3 py-2 border border-natural-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-natural-400 bg-natural-50 text-natural-800 font-sans"
                          value={newDocContent}
                          onChange={e => setNewDocContent(e.target.value)}
                          required
                        />
                      </div>
                    </>
                  )}

                  <button 
                    type="submit"
                    className="px-4 py-2.5 bg-[#8C9E7E] hover:bg-[#7b8c6e] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs mt-4"
                  >
                    Confirm Indexing <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-6 overflow-hidden">
            <div className="bg-white p-6 rounded-[32px] border border-natural-200 shadow-sm shrink-0">
              <h4 className="font-bold text-natural-900 text-sm flex items-center gap-1">
                <Database className="w-4 h-4 text-natural-500" />
                Retrieval-Augmented Generation (RAG) Sandbox
              </h4>
              <p className="text-[10px] text-natural-600 mb-3">
                Simulate semantic vector retrieval. Input phrases to fetch and rank context chunks matching user concepts.
              </p>

              <form onSubmit={handleSearchSandbox} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-natural-400 absolute left-3 top-2.5" />
                  <input 
                    type="text" 
                    placeholder="e.g. RoboVac 2.4GHz Wi-Fi or SmartWatch factory reset" 
                    className="w-full pl-9 pr-4 py-2 border border-natural-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-natural-400 bg-natural-50 text-natural-800"
                    value={sandboxQuery}
                    onChange={e => setSandboxQuery(e.target.value)}
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isSearching || !sandboxQuery.trim()}
                  className="px-4 py-2 bg-natural-500 hover:bg-natural-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 disabled:opacity-50 shadow-xs"
                >
                  {isSearching ? 'Searching...' : 'Vector Search'}
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="mt-4 border-t border-natural-200 pt-4 space-y-2">
                  <div className="flex justify-between items-center text-[9px] font-bold text-natural-500">
                    <span>MATCHED CONTEXT CHUNKS ({searchResults.length})</span>
                    <span className="text-natural-700 font-mono bg-natural-100 px-1.5 py-0.5 rounded flex items-center gap-1 border border-natural-200/50">
                      <Sparkles className="w-2.5 h-2.5 text-natural-500" /> Engine: {searchMethod}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-44 overflow-y-auto pr-1">
                    {searchResults.map((chunk, idx) => (
                      <div key={idx} className="bg-natural-50 p-3 rounded-2xl border border-natural-200 text-[10px] space-y-1.5 flex flex-col justify-between">
                        <p className="text-natural-700 italic line-clamp-3">"{chunk.content}"</p>
                        <div className="flex justify-between items-center text-[8px] font-mono font-bold text-natural-500 mt-1 border-t border-natural-200/50 pt-1">
                          <span className="text-natural-600">{chunk.fileName}</span>
                          <span className="text-natural-800 font-extrabold">Relevance: {chunk.score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedFile && (
              <div className="bg-white p-6 rounded-[32px] border border-natural-200 shadow-sm flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-3 border-b border-natural-200 pb-2.5 shrink-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-natural-500" />
                    <div>
                      <h4 className="font-bold text-natural-900 text-sm">{selectedFile.name}</h4>
                      <p className="text-[10px] text-natural-600">Slices for vector indexing and semantic retrieval</p>
                    </div>
                  </div>
                  <span className="bg-natural-100 border border-natural-200/60 text-natural-700 px-2.5 py-0.5 rounded-xl text-[10px] font-bold font-mono uppercase tracking-wider">
                    {selectedFile.category}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {selectedFile.content.split("\n- ").filter(p => p.trim().length > 0).map((para, idx) => (
                    <div key={idx} className="p-3.5 bg-natural-50 rounded-2xl border border-natural-200 flex gap-3 text-xs leading-relaxed text-natural-800">
                      <div className="font-mono text-[9px] font-extrabold text-natural-600 bg-natural-100 h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-natural-200">
                        {idx + 1}
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="text-[8px] font-mono font-bold text-natural-500 uppercase tracking-widest">Index Chunk ID: {selectedFile.id}-c-{idx + 1}</div>
                        <p className="italic">"{para.startsWith("- ") ? para.substring(2) : para}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
