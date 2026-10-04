import React, { useState } from 'react';
import { BotData, AccountData, MarketSentiment, DomainSummary } from '../../types/trading';
import { Brain, Sparkles, Loader2, ShieldCheck, AlertCircle, TrendingUp, RefreshCw } from 'lucide-react';

interface FleetAdvisorProps {
  bots: BotData[];
  account: AccountData;
  sentiment: MarketSentiment;
  domains: DomainSummary[];
}

export const FleetAdvisor: React.FC<FleetAdvisorProps> = ({ bots, account, sentiment, domains }) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);

  const generateReport = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/gemini/fleet-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bots, account, sentiment, domains }),
      });
      const data = await response.json();
      setReport(data);
    } catch (error) {
      console.error('Fleet report failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/50 p-6 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
            <Brain className="h-7 w-7 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">SRE-STRATEGIST Fleet Advisor</h3>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Algorithmic Intelligence & Risk Mitigation</p>
          </div>
        </div>

        <button
          onClick={generateReport}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Analyzing Fleet...</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              <span>Run Strategic Audit</span>
            </>
          )}
        </button>
      </div>

      {!report && !loading && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Sparkles className="h-10 w-10 text-slate-700 mb-4" />
          <p className="text-slate-500 text-sm max-w-md">
            Solicită o analiză completă a flotei de 20 de boți. SRE-STRATEGIST va evalua corelațiile, riscul sistemic și alocarea capitalului în funcție de volatilitatea curentă.
          </p>
        </div>
      )}

      {report && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-slate-950/80 p-5 border border-slate-800">
              <span className="text-[10px] font-bold text-emerald-500 uppercase block mb-1">Trinity Stability Index</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white font-mono">{report.stability_index}</span>
                <span className="text-slate-500 text-sm">/ 100</span>
              </div>
              <div className="mt-3 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-1000" 
                  style={{ width: `${report.stability_index}%` }} 
                />
              </div>
            </div>

            <div className="md:col-span-2 rounded-2xl bg-emerald-500/5 p-5 border border-emerald-500/20">
              <span className="text-[10px] font-bold text-emerald-500 uppercase block mb-2 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> Fleet Strategic Directive
              </span>
              <p className="text-sm text-slate-200 leading-relaxed font-medium">
                {report.directive_summary}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {report.domain_allocations.map((alloc: any, i: number) => (
              <div key={i} className="rounded-xl bg-slate-950/60 p-4 border border-slate-800/80">
                <span className="text-[10px] font-bold text-cyan-500 uppercase block mb-2">{alloc.domain}</span>
                <p className="text-xs text-slate-300 leading-tight">
                  {alloc.recommendation}
                </p>
              </div>
            ))}
          </div>

          {report.critical_alerts.length > 0 && (
            <div className="rounded-2xl bg-rose-500/10 p-5 border border-rose-500/30">
              <div className="flex items-center gap-2 text-rose-500 font-bold text-sm mb-3">
                <AlertCircle className="h-4 w-4" />
                <span>ALERTE CRITICE & RISC SISTEMIC</span>
              </div>
              <ul className="space-y-2">
                {report.critical_alerts.map((alert: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-rose-200/80 bg-rose-500/5 p-2 rounded-lg border border-rose-500/10">
                    <span className="text-rose-500">•</span>
                    <span>{alert}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
