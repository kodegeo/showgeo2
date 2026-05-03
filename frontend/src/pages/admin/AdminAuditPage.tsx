import { RefreshCw, Radio, Calendar, MessageSquare, type LucideIcon } from "lucide-react";
import { useAdminSystemAudit } from "@/hooks/useAdmin";
import type {
  SystemAuditIssue,
  SystemAuditResult,
  SystemAuditSection,
} from "@/services/admin.service";

const SECTION_ORDER: Array<{
  key: keyof SystemAuditResult["sections"];
  icon: LucideIcon;
  label: string;
}> = [
  { key: "streaming", icon: Radio, label: "Streaming" },
  { key: "events", icon: Calendar, label: "Events" },
  { key: "messaging", icon: MessageSquare, label: "Messaging" },
];

function IssueCard({ issue }: { issue: SystemAuditIssue }) {
  const isWarn = issue.severity === "warning";
  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${
        isWarn
          ? "border-amber-500/40 bg-amber-500/10 text-amber-50"
          : "border-white/15 bg-white/5 text-white/80"
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-mono text-xs opacity-80">{issue.code}</span>
        {issue.count != null && (
          <span className="text-xs font-semibold tabular-nums">×{issue.count}</span>
        )}
        <span className="text-xs uppercase opacity-70">{issue.severity}</span>
      </div>
      <p className="font-medium mt-1">{issue.title}</p>
      {issue.detail && <p className="text-white/60 mt-1 text-xs">{issue.detail}</p>}
      <p className="text-white/85 mt-2 text-xs leading-relaxed">
        <span className="text-white/50">Recommendation:</span> {issue.recommendation}
      </p>
    </div>
  );
}

function SectionBlock({
  sectionKey,
  icon: Icon,
  label,
  section,
}: {
  sectionKey: keyof SystemAuditResult["sections"];
  icon: LucideIcon;
  label: string;
  section: SystemAuditSection;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#0F0F0F] overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 bg-white/[0.03]">
        <Icon className="w-5 h-5 text-sky-400 shrink-0" />
        <h2 className="text-lg font-semibold text-white">{label}</h2>
        <span className="text-xs text-white/40 ml-auto">
          {section.issues.length === 0 ? "No issues" : `${section.issues.length} finding(s)`}
        </span>
      </div>
      <div className="p-4 space-y-3">
        {section.issues.length === 0 ? (
          <p className="text-sm text-white/45">Nothing flagged in this category.</p>
        ) : (
          section.issues.map(issue => (
            <IssueCard key={`${sectionKey}-${issue.code}`} issue={issue} />
          ))
        )}
      </div>
    </section>
  );
}

export function AdminAuditPage() {
  const { data, isLoading, isFetching, refetch, error } = useAdminSystemAudit();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">System audit</h1>
          <p className="text-white/60 text-sm max-w-2xl">
            Automated checks for streaming reconciliation, event consistency, and messaging foreign
            keys. Warnings drive the admin banner and optional daily email (
            <code className="text-white/70">SYSTEM_AUDIT_ALERT_EMAIL</code>).
          </p>
          {data?.generatedAt && (
            <p className="text-xs text-white/40 mt-2">
              Last run: {new Date(data.generatedAt).toLocaleString()}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white/10 text-white hover:bg-white/15 border border-white/10 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200 text-sm">
          Failed to load system audit.
        </div>
      )}

      {data && (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-white/50">Warnings (total)</span>
            <p className="text-2xl font-semibold text-white tabular-nums">
              {data.summary.totalIssues}
            </p>
          </div>
          <div>
            <span className="text-white/50">Streaming</span>
            <p className="text-xl font-medium text-white tabular-nums">{data.summary.streaming}</p>
          </div>
          <div>
            <span className="text-white/50">Events</span>
            <p className="text-xl font-medium text-white tabular-nums">{data.summary.events}</p>
          </div>
          <div>
            <span className="text-white/50">Messaging</span>
            <p className="text-xl font-medium text-white tabular-nums">{data.summary.messaging}</p>
          </div>
        </div>
      )}

      {isLoading && <p className="text-white/50 text-sm">Running audit…</p>}

      {data && !isLoading && (
        <div className="grid gap-6 lg:grid-cols-1">
          {SECTION_ORDER.map(({ key, icon, label }) => (
            <SectionBlock
              key={key}
              sectionKey={key}
              icon={icon}
              label={label}
              section={data.sections[key]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
