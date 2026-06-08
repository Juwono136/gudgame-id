import { siteConfig } from "@/lib/config/site";

export function AdminSidebarFooter() {
  const year = new Date().getFullYear();
  return (
    <div className="shrink-0 border-t border-cp-border px-4 py-4">
      <p className="text-center text-[10px] leading-relaxed text-cp-muted">
        © {year} {siteConfig.name}
        <br />
        <span className="text-cp-muted/80">All rights reserved.</span>
      </p>
    </div>
  );
}
