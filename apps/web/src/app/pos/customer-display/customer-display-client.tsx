"use client";

import { useEffect, useState } from "react";
import {
  getCustomerDisplaySnapshot,
  subscribeCustomerDisplaySnapshot,
  type CustomerDisplaySnapshot,
  type ItemPreview,
} from "@/lib/customerDisplaySnapshot";
import { COLORS } from "@/lib/theme";

const ADDED_HIGHLIGHT_MS = 3000;

function formatPesos(cents: number) {
  return `₱${(cents / 100).toFixed(2)}`;
}

function FeaturedItem({
  preview,
  showAddedBadge,
}: {
  preview: ItemPreview;
  showAddedBadge: boolean;
}) {
  const tempColor =
    preview.baseType === "HOT"
      ? COLORS.tempHot
      : preview.baseType === "ICED"
        ? COLORS.tempIced
        : "#888";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        position: "relative",
        border: showAddedBadge ? `3px solid ${COLORS.primary}` : "none",
        borderRadius: 16,
        backgroundColor: showAddedBadge ? "rgba(201, 162, 39, 0.08)" : "transparent",
        transition: "border-color 0.3s ease, background-color 0.3s ease",
      }}
    >
      {showAddedBadge && (
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 24,
            padding: "6px 14px",
            borderRadius: 999,
            background: COLORS.primary,
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          Added to order
        </div>
      )}
      {preview.imageUrl ? (
        <img
          src={preview.imageUrl}
          alt=""
          style={{
            width: "min(280px, 80%)",
            height: "auto",
            maxHeight: 240,
            objectFit: "contain",
            borderRadius: 12,
            marginBottom: 20,
          }}
        />
      ) : (
        <div
          style={{
            width: "min(200px, 60%)",
            height: 160,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 12,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 48,
            color: "rgba(255,255,255,0.2)",
          }}
        >
          ☕
        </div>
      )}
      <h1
        style={{
          margin: "0 0 12px 0",
          fontSize: "clamp(24px, 4vw, 36px)",
          fontWeight: 700,
          color: "#fff",
          textAlign: "center",
        }}
      >
        {preview.itemName}
      </h1>
      {(preview.baseType || preview.sizeLabel) && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            justifyContent: "center",
            marginBottom: 8,
          }}
        >
          {preview.baseType && (
            <span
              style={{
                padding: "4px 12px",
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                background: tempColor,
                color: "#fff",
              }}
            >
              {preview.baseType}
            </span>
          )}
          {preview.sizeLabel && (
            <span
              style={{
                padding: "4px 12px",
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                background: "rgba(255,255,255,0.15)",
                color: "#fff",
              }}
            >
              {preview.sizeLabel}
            </span>
          )}
        </div>
      )}
      {preview.transactionTypeLabel && (
        <div
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.7)",
            marginBottom: 8,
          }}
        >
          {preview.transactionTypeLabel}
        </div>
      )}
      {preview.milkLabel && (
        <div style={{ fontSize: 15, color: "#ddd", marginBottom: 4 }}>
          {preview.milkLabel}
        </div>
      )}
      {preview.shotsQty !== undefined && preview.shotsQty > 0 && (
        <div style={{ fontSize: 15, color: "#ddd", marginBottom: 4 }}>
          {preview.shotsQty} shot{preview.shotsQty !== 1 ? "s" : ""}
        </div>
      )}
      {preview.optionNames.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            justifyContent: "center",
            marginTop: 8,
          }}
        >
          {preview.optionNames.map((name) => (
            <span
              key={name}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                fontSize: 13,
                background: "rgba(255,255,255,0.1)",
                color: "#ccc",
              }}
            >
              {name}
            </span>
          ))}
        </div>
      )}
      {preview.note && (
        <div
          style={{
            marginTop: 12,
            fontSize: 14,
            color: COLORS.warning,
            fontStyle: "italic",
          }}
        >
          Note: {preview.note}
        </div>
      )}
      {preview.qty > 1 && (
        <div
          style={{
            marginTop: 12,
            fontSize: 18,
            fontWeight: 700,
            color: "#fff",
          }}
        >
          Qty {preview.qty}
        </div>
      )}
    </div>
  );
}

function IdleState() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 48,
        color: "rgba(255,255,255,0.5)",
      }}
    >
      <div
        style={{
          fontSize: "clamp(20px, 3vw, 28px)",
          fontWeight: 600,
          marginBottom: 12,
          textAlign: "center",
        }}
      >
        Start your order
      </div>
      <div style={{ fontSize: 16, textAlign: "center" }}>
        Your order will appear here when the cashier adds items.
      </div>
    </div>
  );
}

function PreparingState() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 48,
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          border: `4px solid ${COLORS.primary}`,
          borderTopColor: "transparent",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          marginBottom: 24,
        }}
      />
      <div
        style={{
          fontSize: "clamp(22px, 3.5vw, 30px)",
          fontWeight: 700,
          color: "#fff",
          marginBottom: 8,
        }}
      >
        Preparing your order
      </div>
      <div style={{ fontSize: 16, color: "rgba(255,255,255,0.7)" }}>
        Thank you.
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function CustomerDisplayClient() {
  const [snapshot, setSnapshot] = useState<CustomerDisplaySnapshot>(getCustomerDisplaySnapshot());

  useEffect(() => {
    return subscribeCustomerDisplaySnapshot(setSnapshot);
  }, []);

  const featured =
    snapshot.activeItemPreview ?? snapshot.latestAddedItemPreview;
  const showAddedBadge =
    !!snapshot.lastAddedAt &&
    Date.now() - snapshot.lastAddedAt <= ADDED_HIGHLIGHT_MS &&
    !!featured &&
    !snapshot.activeItemPreview;

  const isPreparing = snapshot.mode === "preparing";

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        background: "#0a0a0a",
        color: "#fff",
        display: "flex",
        flexDirection: "row",
        overflow: "hidden",
      }}
    >
      {/* Left: featured item or idle / preparing */}
      <div
        style={{
          flex: "1 1 58%",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid #222",
        }}
      >
        {isPreparing ? (
          <PreparingState />
        ) : featured ? (
          <FeaturedItem preview={featured} showAddedBadge={showAddedBadge} />
        ) : (
          <IdleState />
        )}
      </div>

      {/* Right: cart summary */}
      <div
        style={{
          flex: "0 0 42%",
          maxWidth: 480,
          display: "flex",
          flexDirection: "column",
          background: "#111",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "2px solid #222",
            fontSize: 18,
            fontWeight: 700,
            color: "#fff",
          }}
        >
          Your order
        </div>
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 16,
          }}
        >
          {snapshot.cartItems.length === 0 ? (
            <div
              style={{
                fontSize: 15,
                color: "rgba(255,255,255,0.4)",
                textAlign: "center",
                padding: 24,
              }}
            >
              No items yet
            </div>
          ) : (
            snapshot.cartItems.map((line, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  padding: "12px 0",
                  borderBottom: "1px solid #222",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#fff",
                    }}
                  >
                    {line.itemName}
                  </div>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>
                    × {line.qty}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: COLORS.primary,
                    flexShrink: 0,
                  }}
                >
                  {formatPesos(line.lineTotalCents)}
                </div>
              </div>
            ))
          )}
        </div>
        <div
          style={{
            padding: "20px 24px",
            borderTop: "2px solid #222",
            background: "#0a0a0a",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 22,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            <span>Total</span>
            <span style={{ color: COLORS.primary }}>
              {formatPesos(snapshot.totalCents)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
