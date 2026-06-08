"use client";

import { useCallback, useEffect, useRef } from "react";
import { Bold, Italic, List, ListOrdered, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
};

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write description…",
  minHeight = 160,
  className,
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value || "";
    }
  }, [value]);

  const exec = useCallback((command: string, val?: string) => {
    document.execCommand(command, false, val);
    ref.current?.focus();
    if (ref.current) onChange(ref.current.innerHTML);
  }, [onChange]);

  const handleInput = () => {
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const addLink = () => {
    const url = window.prompt("Link URL (https://…)");
    if (url?.trim()) exec("createLink", url.trim());
  };

  return (
    <div className={cn("overflow-hidden rounded-xl border border-cp-border bg-cp-elevated", className)}>
      <div className="flex flex-wrap gap-1 border-b border-cp-border bg-cp-card/80 p-2">
        <ToolbarButton onClick={() => exec("bold")} title="Bold">
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("italic")} title="Italic">
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("insertUnorderedList")} title="Bullet list">
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("insertOrderedList")} title="Numbered list">
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={addLink} title="Link">
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
      </div>
      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline
        data-placeholder={placeholder}
        onInput={handleInput}
        className={cn(
          "prose dark:prose-invert max-w-none px-4 py-3 text-sm text-foreground outline-none",
          "empty:before:pointer-events-none empty:before:text-cp-muted empty:before:content-[attr(data-placeholder)]",
          "[&_a]:text-cp-logo-accent [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5",
        )}
        style={{ minHeight }}
        suppressContentEditableWarning
      />
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-cp-muted hover:bg-cp-primary/15 hover:text-foreground"
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );
}
