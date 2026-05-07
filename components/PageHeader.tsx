import { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            style={{
              fontFamily: "var(--font-syne)",
              fontWeight: 700,
              fontSize: "1.75rem",
              letterSpacing: "-0.025em",
              color: "var(--text)",
              lineHeight: 1.15,
            }}
          >
            {title}
          </h1>
          {description ? (
            <p
              style={{
                marginTop: "0.375rem",
                fontSize: "0.875rem",
                color: "var(--text-muted)",
                fontFamily: "var(--font-outfit)",
              }}
            >
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex gap-2">{actions}</div> : null}
      </div>
      <div
        style={{
          marginTop: "1rem",
          height: 1,
          background: "linear-gradient(to right, var(--accent), transparent)",
          opacity: 0.4,
        }}
      />
    </div>
  );
}
