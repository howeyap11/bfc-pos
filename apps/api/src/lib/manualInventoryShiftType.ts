/**
 * Classifies a manual inventory submission as Beginning vs End.
 *
 * Priority:
 * 1) Same business-day shift assignment from cloud (StaffShiftLocal), using shiftType keywords.
 * 2) Time fallback: local minutes in [Work Hours From, end) in audit TZ — end defaults to From + 11h
 *    (wrapping past midnight). When Work Hours To is set and strictly after From on the same calendar day,
 *    it overrides that end.
 *
 * Business-day keys use staffBusinessDateKeyWithCutover + synced CloudStoreSetting.workDayFromTimeLocal.
 */
import {
  DEFAULT_WORK_DAY_CUTOVER_MINUTES,
  staffAuditLocalMinutesFromMidnight,
  staffBusinessDateKeyWithCutover,
} from "./staffBusinessDate.js";

export type ManualInventoryShiftType = "Beginning" | "End";

export type StaffShiftAssignmentLike = {
  shiftDate: Date;
  shiftType: string;
};

const DEFAULT_BEGINNING_SPAN_MINUTES = 11 * 60;

function resolveBeginningWindowEndExclusive(
  cutoverMinutes: number,
  workEndMinutesFromMidnight?: number
): number {
  if (
    workEndMinutesFromMidnight != null &&
    workEndMinutesFromMidnight > cutoverMinutes &&
    workEndMinutesFromMidnight <= 1440
  ) {
    return workEndMinutesFromMidnight;
  }
  return cutoverMinutes + DEFAULT_BEGINNING_SPAN_MINUTES;
}

/** Half-open [cut, endExclusive) in local minutes; when endExclusive > 1440 the window wraps past midnight. */
function localMinutesInBeginningWindow(
  localMinutesFromMidnight: number,
  cut: number,
  endExclusive: number
): boolean {
  if (endExclusive <= 1440) {
    return localMinutesFromMidnight >= cut && localMinutesFromMidnight < endExclusive;
  }
  const wrappedEnd = endExclusive - 1440;
  return localMinutesFromMidnight >= cut || localMinutesFromMidnight < wrappedEnd;
}

/**
 * OPENING-style assignments: morning count expected → Beginning if submitted in the configured window.
 * Late same-day submission on an opening shift → End (closing count).
 * CLOSING-style assignments → always End.
 */
export function resolveManualInventoryShiftType(params: {
  submittedAt: Date;
  assignments: StaffShiftAssignmentLike[];
  /** Minutes from midnight (audit TZ); synced CloudStoreSetting.workDayFromTimeLocal. */
  cutoverMinutesFromMidnight?: number;
  /** Optional end of "morning" window (Work Hours To) when strictly after From same calendar day. */
  workEndMinutesFromMidnight?: number;
}): ManualInventoryShiftType {
  const cut = params.cutoverMinutesFromMidnight ?? DEFAULT_WORK_DAY_CUTOVER_MINUTES;
  const endExclusive = resolveBeginningWindowEndExclusive(cut, params.workEndMinutesFromMidnight);
  const biz = staffBusinessDateKeyWithCutover(params.submittedAt, cut);
  const sameDay = params.assignments.filter((a) => {
    return staffBusinessDateKeyWithCutover(a.shiftDate, cut) === biz;
  });
  const assignment = sameDay[0];
  const localMin = staffAuditLocalMinutesFromMidnight(params.submittedAt);
  const st = (assignment?.shiftType ?? "").toUpperCase();
  const inBeginningWindow = localMinutesInBeginningWindow(localMin, cut, endExclusive);

  if (assignment) {
    const closing =
      st.includes("CLOSING") ||
      st.includes("CLOSER") ||
      st.includes("NIGHT") ||
      (st.includes("CLOSE") && !st.includes("OPEN"));
    const opening =
      st.includes("OPENING") ||
      st === "OPEN" ||
      st.includes("MORNING") ||
      st === "DAY" ||
      st.includes("DAY ");
    if (closing) {
      return "End";
    }
    if (opening) {
      if (inBeginningWindow) return "Beginning";
      return "End";
    }
  }

  if (inBeginningWindow) return "Beginning";
  return "End";
}
