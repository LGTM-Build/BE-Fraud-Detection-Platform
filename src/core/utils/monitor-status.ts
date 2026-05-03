export type MonitorStatus =
  | "pending"
  | "alert"
  | "high_alert"
  | "auto_approved"
  | "approved"
  | "rejected";

export function statusLabel(status: MonitorStatus) {
  const map: Record<MonitorStatus, string> = {
    pending: "Pending",
    alert: "Alert",
    high_alert: "High Alert",
    auto_approved: "Auto Approved",
    approved: "Approved",
    rejected: "Reject",
  };

  return map[status];
}

export function groupToStatuses(group?: string): MonitorStatus[] | undefined {
  if (!group) return undefined;
  if (group === "ml_pending") return ["pending"];
  if (group === "needs_review") return ["alert", "high_alert"];
  if (group === "reviewed") return ["auto_approved", "approved", "rejected"];
  return undefined;
}
