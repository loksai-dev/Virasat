import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, XCircle, RefreshCw, Server, ArrowLeft, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { estateService } from '@/api/estateService';
import { API_CONFIG } from '@/api/config';

export const DevApiStatusPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState<any>(null);
  const [readyData, setReadyData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string>('');

  const checkStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const [h, r] = await Promise.allSettled([
        estateService.getHealth(),
        estateService.getReady(),
      ]);

      if (h.status === 'fulfilled') {
        setHealthData(h.value);
      } else {
        setHealthData({ ok: false, error: h.reason?.message });
      }

      if (r.status === 'fulfilled') {
        setReadyData(r.value);
      } else {
        setReadyData({ ok: false, error: r.reason?.message });
      }

      setLastChecked(new Date().toLocaleTimeString());
    } catch (err: any) {
      setError(err.message || 'Failed to check status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-navy p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-navy hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-navy flex items-center gap-2">
                <Server className="w-5 h-5 text-teal-600" />
                Virasat Backend API Status
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Target: {API_CONFIG.BASE_URL}
              </p>
            </div>
          </div>

          <button
            onClick={checkStatus}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-navy text-white text-xs font-semibold hover:bg-navy-light disabled:opacity-50 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {lastChecked && (
          <p className="text-[11px] text-slate-400">
            Last checked: {lastChecked} • Mocks: {API_CONFIG.USE_MOCKS ? 'Enabled' : 'Disabled (Live)'}
          </p>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* /health Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" />
              <h2 className="text-sm font-bold text-navy font-mono">GET /health</h2>
            </div>
            {healthData?.ok ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5" />
                Healthy (200)
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                <XCircle className="w-3.5 h-3.5" />
                Unhealthy
              </span>
            )}
          </div>
          <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto">
            {JSON.stringify(healthData?.data || healthData, null, 2)}
          </pre>
        </div>

        {/* /ready Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-teal-600" />
              <h2 className="text-sm font-bold text-navy font-mono">GET /ready</h2>
            </div>
            {readyData?.ok ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5" />
                Ready (200)
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                <XCircle className="w-3.5 h-3.5" />
                Not Ready
              </span>
            )}
          </div>
          <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto">
            {typeof readyData?.data === 'string'
              ? readyData?.data
              : JSON.stringify(readyData?.data || readyData, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default DevApiStatusPage;
