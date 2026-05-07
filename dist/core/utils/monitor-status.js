"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusLabel = statusLabel;
exports.groupToStatuses = groupToStatuses;
function statusLabel(status) {
    const map = {
        pending: "Pending",
        alert: "Alert",
        high_alert: "High Alert",
        auto_approved: "Auto Approved",
        approved: "Approved",
        rejected: "Reject",
    };
    return map[status];
}
function groupToStatuses(group) {
    if (!group)
        return undefined;
    if (group === "ml_pending")
        return ["pending"];
    if (group === "needs_review")
        return ["alert", "high_alert"];
    if (group === "reviewed")
        return ["auto_approved", "approved", "rejected"];
    return undefined;
}
