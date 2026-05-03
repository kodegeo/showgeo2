import { Link } from "react-router-dom";
import { Radio, RefreshCw, ExternalLink, CheckCircle } from "lucide-react";
import { useAdminStreamSessions, useResolveStreamSession } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/creator/useToast";
import type { AdminStreamSessionRow } from "@/services/admin.service";

function formatDuration(totalSeconds: number): string {
  const s = Math.floor(totalSeconds % 60);
  const m = Math.floor((totalSeconds / 60) % 60);
  const h = Math.floor(totalSeconds / 3600);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function statusStyles(status: AdminStreamSessionRow["status"]): string {
  switch (status) {
    case "live":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "stale":
      return "bg-amber-500/15 text-amber-200 border-amber-500/30";
    case "ended":
      return "bg-white/5 text-white/50 border-white/10";
    default:
      return "bg-white/5 text-white/60 border-white/10";
  }
}

export function AdminStreamsPage() {
  const { data, isLoading, isFetching, refetch, error } = useAdminStreamSessions();
  const resolveMutation = useResolveStreamSession();
  const { toast } = useToast();

  const sessions = data?.sessions ?? [];
  const staleCount = data?.staleCount ?? 0;
  const livekitConfigured = data?.livekitConfigured ?? false;

  const handleResolve = (row: AdminStreamSessionRow) => {
    if (!row.sessionId) {
      return;
    }
    if (row.status === "ended" && !row.livekitRoomPresent) {
      return;
    }
    if (
      !window.confirm(
        `Resolve stream session for room "${row.roomName}"? LiveKit room will be deleted.`,
      )
    ) {
      return;
    }
    resolveMutation.mutate(row.sessionId, {
      onSuccess: () => {
        toast({
          type: "success",
          title: "Session resolved",
          description: "LiveKit room removed and session marked ended.",
        });
      },
      onError: (e: unknown) => {
        const msg = e instanceof Error ? e.message : "Resolve failed";
        toast({
          type: "error",
          title: "Resolve failed",
          description: msg,
        });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Live streams</h1>
          <p className="text-white/60 text-sm">
            Reconciled with LiveKit every load and every 30s in the API. Rows refresh every 30s.
          </p>
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

      {staleCount > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-100 text-sm flex items-start gap-3">
          <Radio className="w-5 h-5 shrink-0 mt-0.5 text-amber-300" />
          <div>
            <p className="font-medium text-amber-50">{staleCount} stale stream session(s)</p>
            <p className="text-amber-100/90 mt-1">
              Active in the database but no LiveKit participants. Review and resolve if these rooms
              should be cleared.
            </p>
          </div>
        </div>
      )}

      {!livekitConfigured && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-100 text-sm">
          LiveKit is not configured on the API. This list will stay empty until{" "}
          <code className="text-amber-50">LIVEKIT_URL</code>,{" "}
          <code className="text-amber-50">LIVEKIT_API_KEY</code>, and{" "}
          <code className="text-amber-50">LIVEKIT_API_SECRET</code> are set.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200 text-sm">
          Failed to load stream sessions.
        </div>
      )}

      <div className="rounded-xl border border-white/10 overflow-hidden bg-[#0F0F0F]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/50">
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Creator</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Participants</th>
                <th className="px-4 py-3 font-medium">URL</th>
                <th className="px-4 py-3 font-medium">Resolve</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-white/50">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && sessions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-white/50">
                    <Radio className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No stream rows.
                  </td>
                </tr>
              )}
              {!isLoading &&
                sessions.map(row => (
                  <tr
                    key={row.sessionId ?? row.roomName}
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3 text-white">
                      {row.event?.name ?? "—"}
                      {!row.event && row.roomName && (
                        <span className="block text-xs text-white/40 font-mono mt-0.5">
                          {row.roomName}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/80">{row.creator?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${statusStyles(
                          row.status,
                        )}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/70 tabular-nums">
                      {formatDuration(row.durationSeconds)}
                    </td>
                    <td className="px-4 py-3 text-white/70 tabular-nums">{row.participantCount}</td>
                    <td className="px-4 py-3">
                      {row.studioLivePath ? (
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                          <code className="text-xs text-white/50 max-w-[180px] truncate">
                            {row.studioLivePath}
                          </code>
                          <Link
                            to={row.studioLivePath}
                            className="inline-flex items-center gap-1 text-xs font-medium text-sky-400 hover:text-sky-300"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open
                          </Link>
                        </div>
                      ) : (
                        <span className="text-white/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={
                          resolveMutation.isPending ||
                          !row.sessionId ||
                          (row.status === "ended" && !row.livekitRoomPresent)
                        }
                        onClick={() => handleResolve(row)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/90 hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Resolve
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
