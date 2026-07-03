export const ADMIN_MAIN_CLASSNAME =
  "space-y-3 pt-2 lg:mx-auto lg:max-w-[1400px] lg:space-y-6 lg:pt-0";

export function AdminSectionHeader({
  eyebrow = "Operations",
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="flex items-start justify-between gap-3 lg:items-center">
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-primary">
          {eyebrow}
        </p>
        <h1 className="type-page-title text-[22px] leading-tight lg:text-[28px]">{title}</h1>
        {subtitle ? (
          <p className="mt-0.5 text-[12px] text-muted lg:text-[13px]">{subtitle}</p>
        ) : null}
      </div>
    </section>
  );
}
