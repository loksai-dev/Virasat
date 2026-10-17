import React, { useState } from 'react';
import { 
  Building2, 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowUpRight, 
  Filter, 
  Search,
  Check,
  TrendingUp,
  FileCheck2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from 'recharts';
import { KpiCard } from '@/components/shared/KpiCard';
import { SectionCard } from '@/components/shared/SectionCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { InfoTooltip } from '@/components/shared/InfoTooltip';
import { formatINR } from '@/lib/utils';
import { useVirasatStore } from '@/store/useVirasatStore';
import { baseInstitutionDashboard } from '@/mocks/institutionDashboardData';

export const InstitutionDashboardPage: React.FC = () => {
  const { addToast } = useVirasatStore();
  const { kpis, monthlyTrends, categoryVolumes, queue } = baseInstitutionDashboard;

  const [queueItems, setQueueItems] = useState(queue);
  const [filterRisk, setFilterRisk] = useState<string>('All');
  const [search, setSearch] = useState('');

  const handleApprove = (id: string, name: string) => {
    setQueueItems(prev => prev.filter(item => item.id !== id));
    addToast({
      type: 'success',
      title: 'Claim Approved for Automated Disbursement',
      message: `${name} has been signed off. NEFT instruction queued for transmission.`,
    });
  };

  const filteredQueue = queueItems.filter((item) => {
    const matchesRisk = filterRisk === 'All' ? true : item.riskScore === filterRisk;
    const matchesSearch =
      item.deceasedName.toLowerCase().includes(search.toLowerCase()) ||
      item.institutionName.toLowerCase().includes(search.toLowerCase()) ||
      item.assetType.toLowerCase().includes(search.toLowerCase());
    return matchesRisk && matchesSearch;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold bg-navy text-teal-300 px-2.5 py-0.5 rounded font-mono">
              INSTITUTIONAL OPS
            </span>
            <span className="text-xs text-slate-500">Real-time Claims STP Console</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-navy tracking-tight mt-1">
            Institutional Deceased Claims Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Automating verification, DigiLocker KYC, and legal heir succession for Banks, AMC folios & Insurers
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-500">STP Automation Rate</div>
            <div className="text-lg font-bold text-teal-700 font-sans tabular-nums">82.5% AI Handled</div>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard
          title="SLA Compliance Rate"
          value={`${kpis.slaComplianceRate}%`}
          subtitle="Target > 92% • 1 breach this month"
          icon={CheckCircle2}
          variant="teal"
          trend={{ label: '+2.4% vs last qtr', direction: 'up', positive: true }}
        />
        <KpiCard
          title="Average Turnaround Time"
          value={`${kpis.avgTurnaroundDays} Days`}
          subtitle="Industry benchmark: 42.0 days"
          icon={Clock}
          variant="gold"
          trend={{ label: '87% faster than manual', direction: 'up', positive: true }}
        />
        <KpiCard
          title="Pending Claims Queue"
          value={kpis.pendingClaimsQueue}
          subtitle="Across SBI, HDFC, ICICI, LIC & EPFO"
          icon={Building2}
          variant="default"
        />
        <KpiCard
          title="Disbursed Volume (MTD)"
          value={formatINR(kpis.totalDisbursedMonth, true)}
          subtitle="Zero manual paper reconciliation"
          icon={TrendingUp}
          variant="navy"
        />
      </div>

      {/* Recharts Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Settlement Trends Area Chart */}
        <SectionCard
          title="Claims Intake vs Straight-Through Settlement"
          subtitle="Monthly volume trend over the last 6 months"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrends}>
                <defs>
                  <linearGradient id="colorSettled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#14B8A6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorSubmitted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0B1F3A" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0B1F3A" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" stroke="#64748B" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} />
                <RechartsTooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="submitted"
                  name="Submitted Claims"
                  stroke="#0B1F3A"
                  fillOpacity={1}
                  fill="url(#colorSubmitted)"
                />
                <Area
                  type="monotone"
                  dataKey="settled"
                  name="Settled via STP"
                  stroke="#14B8A6"
                  fillOpacity={1}
                  fill="url(#colorSettled)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 text-xs text-slate-500 pt-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-navy" />
              <span>Incoming Claims</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-teal-accent" />
              <span>STP Automated Settlements</span>
            </div>
          </div>
        </SectionCard>

        {/* Category Volume Distribution Bar Chart */}
        <SectionCard
          title="Claims Portfolio by Asset Class"
          subtitle="Volume & Value distribution handled across sectors"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryVolumes}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} />
                <RechartsTooltip
                  formatter={(val: any, name: string) =>
                    name === 'claimsCount' ? [`${val} Claims`, 'Volume'] : [`₹${val} Lakhs`, 'Value']
                  }
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                  }}
                />
                <Bar dataKey="claimsCount" name="Claims Count" fill="#0B1F3A" radius={[6, 6, 0, 0]} />
                <Bar dataKey="totalValueLakhs" name="Value (₹ Lakhs)" fill="#C9A227" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 text-xs text-slate-500 pt-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-navy" />
              <span>Claims Count</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-gold" />
              <span>Total Value (₹ Lakhs)</span>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Live Operations Queue Table */}
      <SectionCard
        title="Live Claims Verification & Signoff Queue"
        subtitle="Priority review queue for operations officers with risk score and action triggers"
        action={
          <div className="flex items-center gap-2">
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-navy focus:outline-none"
            >
              <option value="All">All Risk Levels</option>
              <option value="Low">Low Risk (STP Ready)</option>
              <option value="Medium">Medium Risk</option>
              <option value="High">High Risk (Fraud Check)</option>
            </select>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-medium">
                <th className="pb-3 font-semibold">Queue ID / Case</th>
                <th className="pb-3 font-semibold">Institution & Asset</th>
                <th className="pb-3 font-semibold">Claimant</th>
                <th className="pb-3 font-semibold text-right">Amount</th>
                <th className="pb-3 font-semibold">SLA Left</th>
                <th className="pb-3 font-semibold">Risk Score</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold text-right">Officer Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQueue.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 pr-2">
                    <span className="font-mono font-semibold text-navy">{item.id}</span>
                    <div className="text-[11px] text-slate-400">{item.caseId}</div>
                  </td>
                  <td className="py-3.5 pr-2">
                    <div className="font-medium text-navy">{item.institutionName}</div>
                    <div className="text-slate-500 text-[11px]">{item.assetType}</div>
                  </td>
                  <td className="py-3.5 pr-2 text-slate-700">{item.claimantName}</td>
                  <td className="py-3.5 pr-2 text-right font-mono font-semibold text-navy">
                    {formatINR(item.amount)}
                  </td>
                  <td className="py-3.5 pr-2">
                    <span
                      className={`font-semibold ${
                        item.slaDaysRemaining <= 3 ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {item.slaDaysRemaining} Days
                    </span>
                  </td>
                  <td className="py-3.5 pr-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        item.riskScore === 'Low'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : item.riskScore === 'Medium'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {item.riskScore} Risk
                    </span>
                  </td>
                  <td className="py-3.5 pr-2">
                    <StatusBadge label={item.status} size="sm" />
                  </td>
                  <td className="py-3.5 text-right">
                    <button
                      onClick={() => handleApprove(item.id, `${item.assetType} (${item.claimantName})`)}
                      className="px-3 py-1.5 rounded-lg bg-teal-accent hover:bg-teal-hover text-navy font-semibold text-xs transition-colors inline-flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Approve</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
};
