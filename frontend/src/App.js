import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, AlertCircle, Clock, CheckCircle, Filter, Search, BarChart3 } from 'lucide-react';

// const API_URL = 'http://localhost:3001/api';
const API_URL = 'https://from-chaos-to-clarity-backend.onrender.com/api';

export default function OperationsTracker() {
  const [entries, setEntries] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEntries();
    fetchAnalytics();
  }, []);

  const fetchEntries = async () => {
    try {
      const response = await fetch(`${API_URL}/entries`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setEntries(data);
    } catch (err) {
      setError('Unable to load entries. Make sure backend is running.');
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${API_URL}/analytics`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Analytics fetch failed:', err);
    }
  };

  const handleSubmit = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_input: input })
      });

      if (!response.ok) throw new Error('Submission failed');

      const newEntry = await response.json();
      setEntries([newEntry, ...entries]);
      setInput('');
      fetchAnalytics();
    } catch (err) {
      setError('Failed to submit. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'issue': return <AlertCircle className="w-4 h-4" />;
      case 'delay': return <Clock className="w-4 h-4" />;
      case 'quality': return <CheckCircle className="w-4 h-4" />;
      default: return <TrendingUp className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'issue': return 'bg-red-100 text-red-700 border-red-200';
      case 'delay': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'quality': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const filteredEntries = entries.filter(entry => {
    const matchesFilter = filter === 'all' || entry.category === filter;
    const matchesSearch = search === '' || 
      entry.raw_input.toLowerCase().includes(search.toLowerCase()) ||
      entry.entities.some(e => e.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Operations Intelligence</h1>
          <p className="text-slate-600">Self-organizing system for unstructured operational data</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Input Section */}
        <div className="mb-8 bg-white rounded-xl shadow-md p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Report Operational Event
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g., Motor overheating after 3 hours, PCB board version 2 failed QA, Delay in shipment from vendor X..."
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    handleSubmit();
                  }
                }}
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading || !input.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>Processing...</>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Submit Entry
                </>
              )}
            </button>
          </div>
        </div>

        {/* Analytics Dashboard */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-600 text-sm">Total Entries</span>
                <BarChart3 className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-3xl font-bold text-slate-800">{analytics.total}</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-600 text-sm">Issues</span>
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div className="text-3xl font-bold text-slate-800">{analytics.by_category.issue || 0}</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-600 text-sm">Delays</span>
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="text-3xl font-bold text-slate-800">{analytics.by_category.delay || 0}</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-600 text-sm">Quality Issues</span>
                <CheckCircle className="w-5 h-5 text-orange-500" />
              </div>
              <div className="text-3xl font-bold text-slate-800">{analytics.by_category.quality || 0}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 bg-white rounded-xl shadow-md p-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Filter:</span>
            </div>
            {['all', 'issue', 'delay', 'quality', 'event'].map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
            <div className="flex-1 flex items-center gap-2 ml-4">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search entries or entities..."
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Entries List */}
        <div className="space-y-4">
          {filteredEntries.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <p className="text-slate-500">No entries found. Submit your first operational event above.</p>
            </div>
          ) : (
            filteredEntries.map(entry => (
              <div key={entry.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg border ${getCategoryColor(entry.category)}`}>
                      {getCategoryIcon(entry.category)}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {entry.category}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                        <div className={`w-2 h-2 rounded-full ${getSeverityColor(entry.severity)}`} title={`Severity: ${entry.severity}`} />
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-slate-700 mb-4 leading-relaxed">{entry.raw_input}</p>

                {entry.entities.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="text-xs font-medium text-slate-500">Detected:</span>
                    {entry.entities.map((entity, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium"
                      >
                        {entity}
                      </span>
                    ))}
                  </div>
                )}

                {entry.extracted_metrics && Object.keys(entry.extracted_metrics).length > 0 && (
                  <div className="pt-3 border-t border-slate-200">
                    <div className="flex flex-wrap gap-4 text-sm">
                      {Object.entries(entry.extracted_metrics).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-slate-500">{key}:</span>
                          <span className="font-medium text-slate-700">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}