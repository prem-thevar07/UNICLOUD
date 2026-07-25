import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTransfer } from "../context/TransferContext";

const GlobalTransferWidget = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isTransferring, activeJob, formatBytes, pauseTransfer, cancelTransfer, isPaused } = useTransfer();

  // Only show floating widget if transferring AND user is NOT on /transfer page
  if (!isTransferring || !activeJob || location.pathname === "/transfer") {
    return null;
  }

  const {
    currentFile,
    percentage,
    transferredBytesCount,
    totalBytesCount,
    speedMBps,
    sourceAccount,
    targetAccount,
  } = activeJob;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.95)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(129, 140, 248, 0.3)",
        borderRadius: "16px",
        padding: "16px 20px",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(99, 102, 241, 0.2)",
        width: "360px",
        color: "#f8fafc",
        fontFamily: "Inter, sans-serif",
        animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "1.2rem", animation: "spin 2s linear infinite" }}>🚚</span>
          <div>
            <div style={{ fontWeight: "700", fontSize: "0.9rem", color: "#f8fafc" }}>
              {isPaused ? "Transfer Paused" : "Transferring in Background..."}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              {sourceAccount?.provider} ➔ {targetAccount?.provider}
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate("/transfer")}
          style={{
            background: "linear-gradient(135deg, #6366f1, #a855f7)",
            border: "none",
            color: "#fff",
            padding: "5px 12px",
            borderRadius: "8px",
            fontSize: "0.78rem",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 2px 10px rgba(99, 102, 241, 0.3)",
          }}
        >
          Open Manager ➔
        </button>
      </div>

      {/* File & Speed Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem", marginBottom: "6px" }}>
        <span style={{ color: "#c7d2fe", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "200px" }}>
          📄 {currentFile?.name || "Processing..."}
        </span>
        <span style={{ color: "#a855f7", fontWeight: "700" }}>{percentage}% ({speedMBps} MB/s)</span>
      </div>

      {/* Progress Bar Track */}
      <div
        style={{
          width: "100%",
          height: "6px",
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "999px",
          overflow: "hidden",
          marginBottom: "10px",
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            background: "linear-gradient(90deg, #6366f1, #a855f7)",
            borderRadius: "999px",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* Bottom Row Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "#94a3b8" }}>
        <span>{formatBytes(transferredBytesCount)} / {formatBytes(totalBytesCount)}</span>
        {percentage >= 100 || activeJob?.status === "completed" ? (
          <span style={{ color: "#4ade80", fontWeight: "700", fontSize: "0.75rem" }}>
            ✓ Completed!
          </span>
        ) : (
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={pauseTransfer}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#cbd5e1",
                padding: "2px 8px",
                borderRadius: "6px",
                fontSize: "0.72rem",
                cursor: "pointer",
              }}
            >
              {isPaused ? "Resume" : "Pause"}
            </button>
            <button
              onClick={cancelTransfer}
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#fca5a5",
                padding: "2px 8px",
                borderRadius: "6px",
                fontSize: "0.72rem",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalTransferWidget;
