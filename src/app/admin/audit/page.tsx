"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface AuditLog {
  _id: string;
  action: string;
  severity: "info" | "warning" | "critical";
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  targetType?: string;
  targetId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

interface AuditResponse {
  success: boolean;
  data?: {
    logs: AuditLog[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
    filters: {
      actions: { action: string; count: number }[];
      severities: { severity: string; count: number }[];
    };
  };
}

const SEVERITY_COLORS = {
  info: "bg-[var(--nimmit-info)]/10 text-[var(--nimmit-info)] border-[var(--nimmit-info)]/20",
  warning: "bg-[var(--nimmit-warning)]/10 text-[var(--nimmit-warning)] border-[var(--nimmit-warning)]/20",
  critical: "bg-[var(--nimmit-error)]/10 text-[var(--nimmit-error)] border-[var(--nimmit-error)]/20",
};

const ACTION_ICONS: Record<string, string> = {
  "user.": "👤",
  "job.": "📋",
  "payment.": "💳",
  "file.": "📎",
  "admin.": "🔧",
  "settings.": "⚙️",
};

function getActionIcon(action: string): string {
  for (const [prefix, icon] of Object.entries(ACTION_ICONS)) {
    if (action.startsWith(prefix)) return icon;
  }
  return "ℹ️";
}

function formatAction(action: string): string {
  return action
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).replace(/_/g, " "))
    .join(" - ");
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
  });
  const [filters, setFilters] = useState<{
    actions: { action: string; count: number }[];
    severities: { severity: string; count: number }[];
  }>({ actions: [], severities: [] });

  // Filter state
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedTargetType, setSelectedTargetType] = useState<string>("all");

  const fetchLogs = useCallback(async (offset = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      params.set("offset", offset.toString());

      if (selectedAction !== "all") params.set("action", selectedAction);
      if (selectedSeverity !== "all") params.set("severity", selectedSeverity);
      if (selectedTargetType !== "all") params.set("targetType", selectedTargetType);

      const response = await fetch(`/api/admin/audit?${params.toString()}`);
      const data: AuditResponse = await response.json();

      if (data.success && data.data) {
        setLogs(data.data.logs);
        setPagination(data.data.pagination);
        setFilters(data.data.filters);
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedAction, selectedSeverity, selectedTargetType]);

  useEffect(() => {
    fetchLogs(0);
  }, [fetchLogs]);

  const handleFilterChange = () => {
    fetchLogs(0);
  };

  const handleLoadMore = () => {
    if (pagination.hasMore) {
      fetchLogs(pagination.offset + pagination.limit);
    }
  };

  const handlePrevious = () => {
    if (pagination.offset > 0) {
      fetchLogs(Math.max(0, pagination.offset - pagination.limit));
    }
  };

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-semibold text-[var(--nimmit-text-primary)]">
            Audit Logs
          </h1>
          <p className="text-sm text-[var(--nimmit-text-tertiary)]">
            {pagination.total.toLocaleString()} total events
          </p>
        </div>

        {/* Compact Filters in Header Area */}
        <div className="flex items-center gap-2">
          <FilterSelect
            value={selectedAction}
            onChange={(v) => { setSelectedAction(v); handleFilterChange(); }}
            placeholder="Action"
            options={filters.actions.map(a => ({ value: a.action, label: formatAction(a.action) }))}
          />
          <FilterSelect
            value={selectedSeverity}
            onChange={(v) => { setSelectedSeverity(v); handleFilterChange(); }}
            placeholder="Severity"
            options={filters.severities.map(s => ({ value: s.severity, label: s.severity.charAt(0).toUpperCase() + s.severity.slice(1) }))}
          />
          <FilterSelect
            value={selectedTargetType}
            onChange={(v) => { setSelectedTargetType(v); handleFilterChange(); }}
            placeholder="Target"
            options={[
              { value: "user", label: "User" },
              { value: "job", label: "Job" },
              { value: "payment", label: "Payment" },
              { value: "file", label: "File" },
              { value: "system", label: "System" },
            ]}
          />
          {(selectedAction !== "all" || selectedSeverity !== "all" || selectedTargetType !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedAction("all");
                setSelectedSeverity("all");
                setSelectedTargetType("all");
                fetchLogs(0);
              }}
              className="h-8 px-2 text-xs text-[var(--nimmit-text-tertiary)] hover:text-[var(--nimmit-text-primary)]"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[var(--nimmit-bg-elevated)] rounded-lg border border-[var(--nimmit-border)]">
        <div className="px-4 py-2 border-b border-[var(--nimmit-border)] bg-[var(--nimmit-bg-secondary)]/30 grid grid-cols-12 gap-4 text-[10px] font-semibold text-[var(--nimmit-text-tertiary)] uppercase tracking-wider">
          <div className="col-span-2">Time</div>
          <div className="col-span-3">Action</div>
          <div className="col-span-1">Severity</div>
          <div className="col-span-2">Actor</div>
          <div className="col-span-4">Description</div>
        </div>
        <div className="divide-y divide-[var(--nimmit-border)]">
          {loading ? (
            <SkeletonRows count={10} />
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--nimmit-text-tertiary)]">
              No audit logs found
            </div>
          ) : (
            logs.map((log) => (
              <div key={log._id} className="grid grid-cols-12 gap-4 px-4 py-2.5 items-center hover:bg-[var(--nimmit-bg-secondary)] transition-colors text-xs font-mono">
                {/* Time */}
                <div className="col-span-2 text-[var(--nimmit-text-secondary)]">
                  <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                  <div className="text-[var(--nimmit-text-tertiary)]">{new Date(log.createdAt).toLocaleTimeString()}</div>
                </div>

                {/* Action */}
                <div className="col-span-3">
                  <div className="flex items-center gap-2">
                    <span>{getActionIcon(log.action)}</span>
                    <span className="font-medium text-[var(--nimmit-text-primary)] truncate" title={formatAction(log.action)}>{formatAction(log.action)}</span>
                  </div>
                  {log.targetType && (
                    <div className="text-[10px] text-[var(--nimmit-text-tertiary)] mt-0.5 truncate">
                      {log.targetType} {log.targetId && `(${log.targetId.slice(-6)})`}
                    </div>
                  )}
                </div>

                {/* Severity */}
                <div className="col-span-1">
                  <Badge className={`h-5 px-1.5 text-[10px] font-normal border ${SEVERITY_COLORS[log.severity]}`}>
                    {log.severity}
                  </Badge>
                </div>

                {/* Actor */}
                <div className="col-span-2 truncate">
                  <div className="text-[var(--nimmit-text-primary)] truncate" title={log.actorEmail || "System"}>{log.actorEmail || "System"}</div>
                  {log.actorRole && <div className="text-[10px] text-[var(--nimmit-text-tertiary)]">{log.actorRole}</div>}
                </div>

                {/* Description */}
                <div className="col-span-4 text-[var(--nimmit-text-secondary)] truncate" title={log.description}>
                  {log.description}
                  {log.ipAddress && <span className="text-[var(--nimmit-text-tertiary)] ml-2">IP: {log.ipAddress}</span>}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Compact Pagination */}
        {!loading && logs.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--nimmit-border)] bg-[var(--nimmit-bg-secondary)]/10">
            <div className="text-xs text-[var(--nimmit-text-tertiary)]">
              {pagination.offset + 1}-{Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={pagination.offset === 0}
                className="h-7 px-2 text-xs"
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={!pagination.hasMore}
                className="h-7 px-2 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, placeholder, options }: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[120px] h-8 text-xs bg-[var(--nimmit-bg-elevated)] border-[var(--nimmit-border)]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-[var(--nimmit-bg-elevated)] border-[var(--nimmit-border)]">
        <SelectItem value="all" className="text-xs">All {placeholder}s</SelectItem>
        {options.map(opt => (
          <SelectItem key={opt.value} value={opt.value} className="text-xs">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="px-4 py-2 border-b border-[var(--nimmit-border)]">
          <div className="h-4 bg-[var(--nimmit-bg-secondary)] rounded animate-pulse w-full" />
        </div>
      ))}
    </>
  );
}
