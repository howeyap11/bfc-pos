"use client";

import { Component, type ReactNode } from "react";
import { COLORS } from "@/lib/theme";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export default class PosErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[POS] Error boundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: COLORS.bgDarkest,
            color: COLORS.textPrimary,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
            zIndex: 9999,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600 }}>Something went wrong</div>
          <div style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: "center" }}>
            Reload the page to continue.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 24px",
              fontSize: 16,
              fontWeight: "600",
              background: COLORS.primary,
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
