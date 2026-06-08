import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { GridBackground } from "@/components/ui/backgrounds/grid-background";
import { cn } from "@/lib/utils";

type PageShellProps = {
  children: React.ReactNode;
  showGridBackground?: boolean;
  showFooter?: boolean;
  showNavbar?: boolean;
  /** Extra classes for &lt;main&gt; (e.g. full-height auth pages) */
  mainClassName?: string;
};

export function PageShell({
  children,
  showGridBackground = true,
  showFooter = true,
  showNavbar = true,
  mainClassName,
}: PageShellProps) {
  return (
    <div
      className={cn(
        "relative bg-cp-bg text-foreground selection:bg-cp-primary/25 selection:text-foreground",
        showNavbar ? "min-h-screen" : "flex min-h-[100dvh] flex-col",
      )}
    >
      {showGridBackground ? <GridBackground className="fixed" /> : null}
      {showNavbar ? <Navbar /> : null}
      <main
        className={cn(
          "relative z-10",
          !showNavbar && "min-h-0 flex-1",
          mainClassName,
        )}
      >
        {children}
      </main>
      {showFooter ? <Footer /> : null}
    </div>
  );
}
