"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

export function StatCard({
  label,
  value,
  trend,
  hint,
}: {
  label: string;
  value: ReactNode;
  trend?: { value: number; label?: string };
  hint?: string;
}) {
  const isPositive = trend && trend.value > 0;
  const isNegative = trend && trend.value < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 22, stiffness: 200 }}
      style={{
        borderRadius: "0.75rem",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 4px 16px rgba(0,0,0,0.5)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Amber top accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: "linear-gradient(to right, var(--accent), transparent)",
          opacity: 0.6,
        }}
      />

      <div style={{ padding: "1.25rem" }}>
        <div
          style={{
            fontFamily: "var(--font-dm-mono)",
            fontSize: "0.625rem",
            fontWeight: 500,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          {label}
        </div>

        <div
          style={{
            marginTop: "0.625rem",
            fontFamily: "var(--font-dm-mono)",
            fontSize: "1.625rem",
            fontWeight: 500,
            color: "var(--text)",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          {value}
        </div>

        {trend !== undefined ? (
          <div
            style={{
              marginTop: "0.625rem",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              fontFamily: "var(--font-dm-mono)",
              fontSize: "0.6875rem",
              fontWeight: 500,
              color: isPositive
                ? "var(--success)"
                : isNegative
                ? "var(--danger)"
                : "var(--text-muted)",
            }}
          >
            <span>{isPositive ? "↑" : isNegative ? "↓" : "→"}</span>
            <span>{Math.abs(trend.value * 100).toFixed(1)}%</span>
            {trend.label ? (
              <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                · {trend.label}
              </span>
            ) : null}
          </div>
        ) : null}

        {hint ? (
          <div
            style={{
              marginTop: "0.375rem",
              fontFamily: "var(--font-dm-mono)",
              fontSize: "0.6875rem",
              color: "var(--text-muted)",
            }}
          >
            {hint}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
