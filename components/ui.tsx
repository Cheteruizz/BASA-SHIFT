import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="mb-2 text-sm font-bold uppercase text-electric">
          BASA Shift
        </p>
        <h1 className="text-3xl font-black text-ink sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-base text-deep/70">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-white bg-white/90 shadow-soft ${className}`}>
      {children}
    </section>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  const variants = {
    primary: "bg-electric text-white hover:bg-[#0057d1]",
    secondary: "bg-deep text-white hover:bg-ink",
    danger: "bg-red-600 text-white hover:bg-red-700"
  };

  return (
    <button
      className={`rounded-lg px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function StatCard({
  label,
  value,
  detail
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <Card className="p-5">
      <div className="text-sm font-semibold text-deep/60">{label}</div>
      <div className="mt-3 text-3xl font-black text-ink">{value}</div>
      <div className="mt-2 text-sm text-deep/65">{detail}</div>
    </Card>
  );
}
