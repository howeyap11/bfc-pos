/**
 * Classifies a manual inventory submission as Beginning vs End.
 *
 * Priority:
 * 1) Same business-day shift assignment from cloud (StaffShiftLocal), using shiftType keywords.
 * 2) Time fallback: local hour 04:00–14:59 (audit TZ) → Beginning; otherwise → End.
 *
 * See staffBusinessDate.ts for business-day definition (4am cutover).
 */
import { staffAuditLocalHour, staffBusinessDateKey } from "./staffBusinessDate.js";

export type ManualInventoryShiftType = "Beginning" | "End";

export type StaffShiftAssignmentLike = {
  shiftDate: Date;
  shiftType: string;
};

/**
 * OPENING-style assignments: morning count expected → Beginning if submitted in 04:00–14:59 local.
 * Late same-day submission on an opening shift → End (closing count).
 * CLOSING-style assignments → always End.
 */
export function resolveManualInventoryShiftType(params: {
  submittedAt: Date;
  assignments: StaffShiftAssignmentLike[];
}): ManualInventoryShiftType {
  const biz = staffBusinessDateKey(params.submittedAt);
  const sameDay = params.assignments.filter((a) => staffBusinessDateKey(a.shiftDate) === biz);
  const assignment = sameDay[0];
  const hour = staffAuditLocalHour(params.submittedAt);
  const st = (assignment?.shiftType ?? "").toUpperCase();

  if (assignment) {
    const closing =
      st.includes("CLOSING") || st.includes("CLOSER") || st.includes("NIGHT") || (st.includes("CLOSE") && !st.includes("OPEN"));
    const opening = st.includes("OPENING") || st === "OPEN" || st.includes("MORNING") || st === "DAY" || st.includes("DAY ");
    if (closing) {
      return "End";
    }
    if (opening) {
      if (hour >= 4 && hour < 15) return "Beginning";
      return "End";
    }
  }

  if (hour >= 4 && hour < 15) return "Beginning";
  return "End";
}
