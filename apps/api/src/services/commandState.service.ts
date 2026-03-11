/**
 * In-memory command execution state for frontend maintenance UI.
 * idle | updating | restarting | syncing | failed
 */
export type CommandState = "idle" | "updating" | "restarting" | "syncing" | "failed";

let currentState: CommandState = "idle";
let errorMessage: string | null = null;

export function getCommandState(): { state: CommandState; errorMessage: string | null } {
  return { state: currentState, errorMessage };
}

export function setCommandState(state: CommandState, err?: string): void {
  currentState = state;
  errorMessage = err ?? null;
}
