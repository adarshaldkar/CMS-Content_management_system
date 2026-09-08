import React, { useState } from 'react';
import { Send, CheckCircle2, Eye, MousePointerClick, AlertOctagon, UserX, Table } from 'lucide-react';
import { AccessibleDataTable } from './AccessibleDataTable';

export interface CampaignFunnelData {
  campaignTitle: string;
  sentTotal: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  suppressed: number;
  unsubscribed: number;
}

export interface CampaignPerformanceBarProps {
  campaign?: CampaignFunnelData;
}

export const CampaignPerformanceBar: React.FC<CampaignPerformanceBarProps> = ({
  campaign = {
    campaignTitle: 'Weekly Tech & Architecture Briefing #42',
    sentTotal: 4850,
    delivered: 4792,
    opened: 3120,
    clicked: 1450,
    bounced: 48,
    suppressed: 10,
    unsubscribed: 12,
  },
}) => {
  const [isTableVisible, setIsTableVisible] = useState(false);

  const sent = campaign.sentTotal || 1;
  const deliveryPct = Math.round((campaign.delivered / sent) * 100);
  const openRatePct = Math.round((campaign.opened / (campaign.delivered || 1)) * 100);
  const clickToOpenPct = Math.round((campaign.clicked / (campaign.opened || 1)) * 100);
  const bouncePct = ((campaign.bounced / sent) * 100).toFixed(1);
  const unsubPct = ((campaign.unsubscribed / (campaign.delivered || 1)) * 100).toFixed(2);

  const stages = [
    {
      label: 'Sent',
      count: campaign.sentTotal,
      pct: '100%',
      icon: Send,
      color: 'bg-zinc-800 text-zinc-100',
      desc: 'Dispatched via Redis Outbox',
    },
    {
      label: 'Delivered',
      count: campaign.delivered,
      pct: `${deliveryPct}%`,
      icon: CheckCircle2,
      color: 'bg-emerald-800 text-emerald-100',
      desc: 'Accepted by recipient MX',
    },
    {
      label: 'Opened',
      count: campaign.opened,
      pct: `${openRatePct}%`,
      icon: Eye,
      color: 'bg-accent-crimson text-rose-100',
      desc: 'Rendered tracking pixel',
    },
    {
      label: 'Clicked',
      count: campaign.clicked,
      pct: `${clickToOpenPct}%`,
      icon: MousePointerClick,
      color: 'bg-amber-800 text-amber-100',
      desc: 'Followed article links',
    },
    {
      label: 'Bounced / Suppressed',
      count: campaign.bounced + campaign.suppressed,
      pct: `${bouncePct}%`,
      icon: AlertOctagon,
      color: 'bg-rose-900 text-rose-200',
      desc: 'Hard/Soft MX bounce or suppression',
    },
    {
      label: 'Unsubscribed',
      count: campaign.unsubscribed,
      pct: `${unsubPct}%`,
      icon: UserX,
      color: 'bg-slate-700 text-slate-200',
      desc: 'Opted-out or feedback loop',
    },
  ];

  return (
    <div className="border border-border-subtle bg-canvas-paper p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-accent-crimson font-bold">
            CAMPAIGN CONVERSION FUNNEL
          </span>
          <h3 className="text-lg font-editorial font-bold text-ink-primary mt-0.5">
            {campaign.campaignTitle}
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setIsTableVisible((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono border border-border-subtle bg-white dark:bg-zinc-900 text-ink-primary hover:bg-slate-50 self-start sm:self-auto"
        >
          <Table size={12} /> {isTableVisible ? 'Hide Funnel Table' : 'View Funnel Table'}
        </button>
      </div>

      {/* Visual Funnel Step Bars */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          return (
            <div
              key={idx}
              className="p-3 border border-border-subtle bg-canvas-subtle flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="flex items-center gap-1 font-bold text-ink-primary">
                  <Icon size={13} /> {stage.label}
                </span>
                <span className="text-ink-secondary">{stage.pct}</span>
              </div>

              <div>
                <span className="font-editorial text-2xl font-bold text-ink-primary block">
                  {stage.count.toLocaleString()}
                </span>
                <span className="text-[10px] font-mono text-ink-muted line-clamp-1 mt-0.5">
                  {stage.desc}
                </span>
              </div>

              {/* Proportional Segment Bar */}
              <div className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${stage.color}`}
                  style={{ width: `${Math.min(100, Math.max(5, (stage.count / sent) * 100))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Accessible Table */}
      {isTableVisible && (
        <AccessibleDataTable
          caption={`Full Delivery Funnel: ${campaign.campaignTitle}`}
          headers={['Funnel Stage', 'Total Dispatched', 'Stage Percentage', 'Operational Description']}
          rows={stages.map((s) => ({
            stage: s.label,
            total: s.count,
            percentage: s.pct,
            description: s.desc,
          }))}
          keyExtractor={(row) => row.stage}
        />
      )}
    </div>
  );
};
