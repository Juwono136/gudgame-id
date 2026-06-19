"use client";

import { useCallback, useEffect, useRef } from "react";
import { Bold, Italic, List, ListOrdered, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldCharCounter } from "@/components/tournaments/form/field-char-counter";
import { cn } from "@/lib/utils";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  maxLength?: number;
  className?: string;
};

function truncateHtml(html: string, maxLength: number): string {
  if (html.length <= maxLength) return html;
  return html.slice(0, maxLength);
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write description…",
  minHeight = 160,
  maxLength,
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

  const emitChange = useCallback(
    (html: string) => {
      const next = maxLength ? truncateHtml(html, maxLength) : html;
      if (maxLength && html.length > maxLength && ref.current) {
        ref.current.innerHTML = next;
      }
      onChange(next);
    },
    [maxLength, onChange],
  );

  const exec = useCallback(
    (command: string, val?: string) => {
      document.execCommand(command, false, val);
      ref.current?.focus();
      if (ref.current) emitChange(ref.current.innerHTML);
    },
    [emitChange],
  );

  const handleInput = () => {
    if (ref.current) emitChange(ref.current.innerHTML);
  };

  const addLink = () => {
    const url = window.prompt("Link URL (https://…)");
    if (url?.trim()) exec("createLink", url.trim());
  };

  const atLimit = maxLength != null && value.length >= maxLength;

  return (
    <div className={cn("overflow-hidden rounded-xl border border-cp-border bg-cp-elevated", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cp-border bg-cp-card/80 p-2">
        <div className="flex flex-wrap gap-1">
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
        {maxLength ? (
          <FieldCharCounter current={value.length} max={maxLength} className="px-1" />
        ) : null}
      </div>
      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline
        aria-invalid={atLimit || undefined}
        data-placeholder={placeholder}
        onInput={handleInput}
        className={cn(
          "prose dark:prose-invert max-w-none px-4 py-3 text-sm text-foreground outline-none",
          "empty:before:pointer-events-none empty:before:text-cp-muted empty:before:content-[attr(data-placeholder)]",
          "[&_a]:text-cp-logo-accent [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5",
          atLimit && "ring-1 ring-inset ring-amber-500/40",
        )}
        style={{ minHeight }}
        suppressContentEditableWarning
      />
      {atLimit ? (
        <p className="border-t border-cp-border px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
          Character limit reached.
        </p>
      ) : null}
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
