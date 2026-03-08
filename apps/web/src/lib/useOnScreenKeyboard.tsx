"use client";

import { useState, useCallback } from "react";

export type KeyboardMode = "numeric" | "pin" | "text";

interface KeyboardConfig {
  mode: KeyboardMode;
  value: string;
  title?: string;
  onChange?: (value: string) => void;
  onDone: (value: string) => void;
  allowDecimal?: boolean;
}

interface KeyboardState extends KeyboardConfig {
  isOpen: boolean;
}

export function useOnScreenKeyboard() {
  const [state, setState] = useState<KeyboardState>({
    isOpen: false,
    mode: "numeric",
    value: "",
    onDone: () => {},
  });

  const openKeyboard = useCallback((config: KeyboardConfig) => {
    setState({
      ...config,
      isOpen: true,
    });
  }, []);

  const closeKeyboard = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const updateValue = useCallback((newValue: string) => {
    setState((prev) => {
      if (prev.onChange) {
        prev.onChange(newValue);
      }
      return { ...prev, value: newValue };
    });
  }, []);

  const handleDone = useCallback(() => {
    state.onDone(state.value);
    closeKeyboard();
  }, [state, closeKeyboard]);

  return {
    isOpen: state.isOpen,
    mode: state.mode,
    value: state.value,
    title: state.title,
    allowDecimal: state.allowDecimal,
    openKeyboard,
    closeKeyboard,
    updateValue,
    handleDone,
  };
}

interface OnScreenKeyboardProps {
  isOpen: boolean;
  mode: KeyboardMode;
  value: string;
  title?: string;
  allowDecimal?: boolean;
  onClose: () => void;
  onValueChange: (value: string) => void;
  onDone: () => void;
}

export function OnScreenKeyboard({
  isOpen,
  mode,
  value,
  title,
  allowDecimal = true,
  onClose,
  onValueChange,
  onDone,
}: OnScreenKeyboardProps) {
  const [showSymbols, setShowSymbols] = useState(false);
  
  if (!isOpen) return null;

  const handleKeyPress = (key: string) => {
    if (key === "BACKSPACE") {
      onValueChange(value.slice(0, -1));
    } else if (key === "CLEAR") {
      onValueChange("");
    } else if (key === "DONE") {
      onDone();
    } else if (key === "SPACE") {
      onValueChange(value + " ");
    } else if (key === ".") {
      if (allowDecimal && !value.includes(".")) {
        onValueChange(value + ".");
      }
    } else {
      onValueChange(value + key);
    }
  };

  const renderNumericKeyboard = () => {
    const keys = [
      ["1", "2", "3"],
      ["4", "5", "6"],
      ["7", "8", "9"],
      [allowDecimal ? "." : "", "0", "BACKSPACE"],
    ];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {keys.map((row, rowIdx) => (
          <div key={rowIdx} style={{ display: "flex", gap: 8 }}>
            {row.map((key) => {
              if (!key) return <div key="empty" style={{ flex: 1 }} />;
              
              const isBackspace = key === "BACKSPACE";
              
              return (
                <button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  style={{
                    flex: 1,
                    padding: "20px",
                    fontSize: isBackspace ? 16 : 24,
                    fontWeight: "bold",
                    background: isBackspace ? "#ef4444" : "#2a2a2a",
                    color: "#fff",
                    border: "1px solid #3a3a3a",
                    borderRadius: 8,
                    cursor: "pointer",
                    minHeight: 70,
                  }}
                >
                  {isBackspace ? "⌫ Delete" : key}
                </button>
              );
            })}
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button
            onClick={() => handleKeyPress("CLEAR")}
            style={{
              flex: 1,
              padding: "16px",
              fontSize: 16,
              fontWeight: "bold",
              background: "#6b7280",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Clear
          </button>
          <button
            onClick={() => handleKeyPress("DONE")}
            style={{
              flex: 2,
              padding: "16px",
              fontSize: 18,
              fontWeight: "bold",
              background: "#22c55e",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Done
          </button>
        </div>
      </div>
    );
  };

  const renderTextKeyboard = () => {
    const letterRows = [
      ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
      ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
      ["Z", "X", "C", "V", "B", "N", "M"],
    ];

    const numberSymbolRows = [
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
      ["+", "-", "/", ".", ",", "#", "(", ")", ":", ";"],
      ["%", "!", "?", "@", "&", "*", "=", "_", "<", ">"],
    ];

    const currentRows = showSymbols ? numberSymbolRows : letterRows;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {currentRows.map((row, rowIdx) => (
          <div key={rowIdx} style={{ display: "flex", gap: 6, justifyContent: "center" }}>
            {row.map((key) => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                style={{
                  minWidth: 50,
                  padding: "16px 8px",
                  fontSize: 18,
                  fontWeight: "600",
                  background: "#2a2a2a",
                  color: "#fff",
                  border: "1px solid #3a3a3a",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                {key}
              </button>
            ))}
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button
            onClick={() => setShowSymbols(!showSymbols)}
            style={{
              flex: 1,
              padding: "16px",
              fontSize: 16,
              fontWeight: "bold",
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            {showSymbols ? "ABC" : "123"}
          </button>
          <button
            onClick={() => handleKeyPress("SPACE")}
            style={{
              flex: 2,
              padding: "16px",
              fontSize: 16,
              fontWeight: "bold",
              background: "#2a2a2a",
              color: "#fff",
              border: "1px solid #3a3a3a",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Space
          </button>
          <button
            onClick={() => handleKeyPress("BACKSPACE")}
            style={{
              flex: 1,
              padding: "16px",
              fontSize: 16,
              fontWeight: "bold",
              background: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            ⌫
          </button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => handleKeyPress("CLEAR")}
            style={{
              flex: 1,
              padding: "16px",
              fontSize: 16,
              fontWeight: "bold",
              background: "#6b7280",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Clear
          </button>
          <button
            onClick={() => handleKeyPress("DONE")}
            style={{
              flex: 2,
              padding: "18px",
              fontSize: 18,
              fontWeight: "bold",
              background: "#22c55e",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Done
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Modal Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.7)",
          zIndex: 9999,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        {/* Keyboard Panel */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: mode === "text" ? 800 : 500,
            background: "#1a1a1a",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            padding: 24,
            boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.5)",
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#fff", fontWeight: "600" }}>
                {title || "Enter Value"}
              </h3>
              <button
                onClick={onClose}
                style={{
                  padding: "8px 16px",
                  background: "transparent",
                  color: "#aaa",
                  border: "1px solid #3a3a3a",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Cancel
              </button>
            </div>
            {/* Display */}
            <div
              style={{
                padding: "16px 20px",
                background: "#0a0a0a",
                border: "2px solid #3a3a3a",
                borderRadius: 8,
                fontSize: mode === "pin" ? 32 : 24,
                fontWeight: "bold",
                color: "#fff",
                textAlign: "right",
                minHeight: 60,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                fontFamily: "monospace",
                letterSpacing: mode === "pin" ? 8 : 0,
              }}
            >
              {mode === "pin" && value ? "•".repeat(value.length) : value || ""}
            </div>
          </div>

          {/* Keyboard */}
          {mode === "text" ? renderTextKeyboard() : renderNumericKeyboard()}
        </div>
      </div>
    </>
  );
}
