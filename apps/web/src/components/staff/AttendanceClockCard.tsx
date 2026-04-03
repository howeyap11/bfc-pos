"use client";

export type AttendanceClockCardProps = {
  staffName: string;
  workedLabel: string;
  lastActionLabel?: string;
  /** Resolved image src (data URL, blob URL, or https) for time-in selfie when present */
  selfieInSrc?: string | null;
  selfieOutSrc?: string | null;
  /** @deprecated use selfieInSrc */
  selfieInPreview?: string | null;
  /** @deprecated use selfieOutSrc */
  selfieOutPreview?: string | null;
  selfieInDone: boolean;
  selfieOutDone: boolean;
  /** 12-hour time under Selfie-In when captured, e.g. "8:05 AM" */
  selfieInTime12h?: string | null;
  selfieOutTime12h?: string | null;
  inDisabled: boolean;
  outDisabled: boolean;
  busy: boolean;
  interactive: boolean;
  readOnly?: boolean;
  /** Dark kiosk: no card chrome, no name/time header — circles + selfie row only */
  variant?: "default" | "kioskDark";
  onInClick: () => void;
  onOutClick: () => void;
};

/** Large thumb-friendly circles on kiosk; scales on small screens */
const CIRCLE =
  "flex h-[min(10rem,42vw)] w-[min(10rem,42vw)] min-h-[8.5rem] min-w-[8.5rem] shrink-0 items-center justify-center rounded-full text-xl font-bold uppercase tracking-wider sm:h-[10rem] sm:w-[10rem] sm:text-2xl";

const CIRCLE_IMG_FRAME =
  "relative h-[min(10rem,42vw)] w-[min(10rem,42vw)] min-h-[8.5rem] min-w-[8.5rem] shrink-0 overflow-hidden rounded-full ring-2 ring-white/25 shadow-xl sm:h-[10rem] sm:w-[10rem]";

export function AttendanceClockCard({
  staffName,
  workedLabel,
  lastActionLabel,
  selfieInSrc: selfieInSrcProp,
  selfieOutSrc: selfieOutSrcProp,
  selfieInPreview,
  selfieOutPreview,
  selfieInDone,
  selfieOutDone,
  selfieInTime12h = null,
  selfieOutTime12h = null,
  inDisabled,
  outDisabled,
  busy,
  interactive,
  readOnly = false,
  variant = "default",
  onInClick,
  onOutClick,
}: AttendanceClockCardProps) {
  const dark = variant === "kioskDark";
  const selfieInSrc = selfieInSrcProp ?? selfieInPreview ?? null;
  const selfieOutSrc = selfieOutSrcProp ?? selfieOutPreview ?? null;

  const showInImage = !!selfieInSrc;
  const showOutImage = !!selfieOutSrc;

  const inVisual = readOnly
    ? `cursor-default bg-[#3d9a5c] text-white shadow-lg ${CIRCLE}`
    : inDisabled
      ? dark
        ? `cursor-not-allowed bg-zinc-700/80 text-white/50 opacity-70 ${CIRCLE}`
        : `cursor-not-allowed bg-zinc-300 opacity-60 ${CIRCLE}`
      : `bg-[#3d9a5c] text-white shadow-lg active:scale-[0.98] hover:bg-[#359150] ${CIRCLE}`;

  const outVisual = readOnly
    ? `cursor-default border-[3px] border-[#c26a2e] bg-[#1c1917] text-[#e8954c] shadow-md ${CIRCLE}`
    : outDisabled
      ? dark
        ? `cursor-not-allowed border-[3px] border-zinc-600 bg-[#141210] text-zinc-600 opacity-60 ${CIRCLE}`
        : `cursor-not-allowed border-[3px] border-zinc-200 bg-white text-zinc-300 opacity-50 ${CIRCLE}`
      : `border-[3px] border-[#c26a2e] bg-[#1c1917] text-[#f0a060] shadow-md active:scale-[0.98] hover:border-[#d97d3d] ${CIRCLE}`;

  const shell = dark
    ? "px-0 py-4"
    : "rounded-2xl bg-white px-5 py-6 shadow-sm ring-1 ring-zinc-200/80";

  function inControl() {
    if (showInImage) {
      return (
        <div
          className={`${CIRCLE_IMG_FRAME} ${dark ? "bg-zinc-900" : "bg-zinc-100"}`}
          role="img"
          aria-label="Time in selfie"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={selfieInSrc!} alt="" className="h-full w-full object-cover" />
        </div>
      );
    }
    return (
      <button
        type="button"
        disabled={readOnly || !interactive || inDisabled || busy}
        onClick={onInClick}
        className={`transition ${inVisual}`}
      >
        IN
      </button>
    );
  }

  function outControl() {
    if (showOutImage) {
      return (
        <div
          className={`${CIRCLE_IMG_FRAME} ${dark ? "bg-zinc-900" : "bg-zinc-100"}`}
          role="img"
          aria-label="Time out selfie"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={selfieOutSrc!} alt="" className="h-full w-full object-cover" />
        </div>
      );
    }
    return (
      <button
        type="button"
        disabled={readOnly || !interactive || outDisabled || busy}
        onClick={onOutClick}
        className={`transition ${outVisual}`}
      >
        OUT
      </button>
    );
  }

  function subline(time12h: string | null, hasCapture: boolean) {
    if (time12h) {
      return (
        <p className="mt-3 text-center text-sm font-semibold tabular-nums tracking-tight text-white/90">{time12h}</p>
      );
    }
    if (!hasCapture) {
      return <div className="mt-3 h-1 w-14 rounded-full bg-zinc-600/80" aria-hidden />;
    }
    return <div className="mt-3 h-4" aria-hidden />;
  }

  function sublineLight(time12h: string | null, hasCapture: boolean) {
    if (time12h) {
      return <p className="mt-3 text-center text-sm font-medium tabular-nums text-zinc-600">{time12h}</p>;
    }
    if (!hasCapture) {
      return <div className="mt-3 h-1 w-14 rounded-full bg-zinc-200" aria-hidden />;
    }
    return <div className="mt-3 h-4" aria-hidden />;
  }

  return (
    <div className={shell}>
      {!dark && (
        <>
          <h2 className="text-center text-lg font-bold tracking-tight text-zinc-900">{staffName}</h2>
          <p className="mt-1 text-center text-sm text-zinc-500">{workedLabel}</p>
          {lastActionLabel && (
            <p className="mt-0.5 text-center text-xs text-zinc-400">{lastActionLabel}</p>
          )}
        </>
      )}

      <div className={`flex items-start justify-center ${dark ? "mt-4 gap-8 sm:gap-14" : "mt-8 gap-5 sm:gap-12"}`}>
        <div className="flex max-w-[45%] flex-col items-center">
          {inControl()}
          <div className={`flex w-full flex-col items-center ${dark ? "mt-7" : "mt-5"}`}>
            <p
              className={`flex items-center gap-2 text-xs font-medium tracking-wide ${dark ? "text-white/85" : "text-zinc-600"}`}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" aria-hidden />
              Selfie-In
            </p>
            {dark
              ? subline(selfieInTime12h, showInImage || selfieInDone)
              : sublineLight(selfieInTime12h, showInImage || selfieInDone)}
          </div>
        </div>

        <div className="flex max-w-[45%] flex-col items-center">
          {outControl()}
          <div className={`flex w-full flex-col items-center ${dark ? "mt-7" : "mt-5"}`}>
            <p
              className={`flex items-center gap-2 text-xs font-medium tracking-wide ${dark ? "text-white/85" : "text-zinc-600"}`}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" aria-hidden />
              Selfie-out
            </p>
            {dark
              ? subline(selfieOutTime12h, showOutImage || selfieOutDone)
              : sublineLight(selfieOutTime12h, showOutImage || selfieOutDone)}
          </div>
        </div>
      </div>

      {busy && (
        <p className={`text-center text-xs ${dark ? "mt-8 text-white/50" : "mt-6 text-zinc-500"}`}>Saving…</p>
      )}
    </div>
  );
}
