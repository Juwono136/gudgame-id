"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bold, ImagePlus, Italic, Link2, List, ListOrdered, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldCharCounter } from "@/components/tournaments/form/field-char-counter";
import { normalizeLinkHref } from "@/lib/wiki/normalize-link";
import { richHtmlClassName } from "@/lib/wiki/rich-html-class";
import { sanitizeRichText } from "@/lib/wiki/sanitize-rich-text";
import { cn } from "@/lib/utils";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  maxLength?: number;
  className?: string;
  /**
   * When set, shows an Insert image control. Return a public URL
   * (e.g. `/api/media/…`) for the uploaded file.
   */
  onUploadImage?: (file: File) => Promise<string>;
};

function truncateHtml(html: string, maxLength: number): string {
  if (html.length <= maxLength) return html;
  return html.slice(0, maxLength);
}

function getAnchorFromSelection(): HTMLAnchorElement | null {
  const selection = window.getSelection();
  if (!selection?.anchorNode) return null;
  const node =
    selection.anchorNode.nodeType === Node.ELEMENT_NODE
      ? (selection.anchorNode as Element)
      : selection.anchorNode.parentElement;
  return node?.closest("a") ?? null;
}

function saveSelectionRange(container: HTMLElement | null): Range | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !container) return null;
  const range = selection.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return null;
  return range.cloneRange();
}

function restoreSelectionRange(
  container: HTMLElement | null,
  range: Range | null,
  options?: { forceFocus?: boolean },
) {
  if (!container || !range) return;

  const active = document.activeElement;
  const focusStillInEditor =
    !active ||
    active === document.body ||
    active === container ||
    container.contains(active);

  // Never steal focus from another field (e.g. tournament name after leaving the editor).
  if (!options?.forceFocus && !focusStillInEditor) {
    return;
  }

  const selection = window.getSelection();
  selection?.removeAllRanges();
  try {
    selection?.addRange(range);
  } catch {
    /* Range can be invalid after innerHTML rewrite */
  }
  if (options?.forceFocus || focusStillInEditor) {
    container.focus();
  }
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write description…",
  minHeight = 160,
  maxLength,
  className,
  onUploadImage,
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  /** Tracks the last HTML emitted to the parent — avoids resetting the caret on self-updates. */
  const lastEmittedRef = useRef(value);
  const isFocusedRef = useRef(false);
  const savedSelectionRef = useRef<Range | null>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [linkEditorOpen, setLinkEditorOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || isFocusedRef.current) return;

    const target = value || "";
    if (el.innerHTML !== target) {
      el.innerHTML = target;
    }
    lastEmittedRef.current = value;
  }, [value]);

  const emitRawChange = useCallback(
    (html: string) => {
      const next = maxLength ? truncateHtml(html, maxLength) : html;
      if (maxLength && html.length > maxLength && ref.current) {
        ref.current.innerHTML = next;
      }
      lastEmittedRef.current = next;
      onChange(next);
    },
    [maxLength, onChange],
  );

  const emitSanitizedChange = useCallback(
    (html: string, options?: { restoreCaret?: boolean }) => {
      const sanitized = sanitizeRichText(html);
      const next = maxLength ? truncateHtml(sanitized, maxLength) : sanitized;
      if (ref.current && ref.current.innerHTML !== next) {
        if (options?.restoreCaret && isFocusedRef.current) {
          const selection = saveSelectionRange(ref.current);
          ref.current.innerHTML = next;
          restoreSelectionRange(ref.current, selection, { forceFocus: true });
        } else {
          // Blur / external updates: rewrite DOM without yanking focus back into the editor.
          ref.current.innerHTML = next;
        }
      }
      lastEmittedRef.current = next;
      onChange(next);
    },
    [maxLength, onChange],
  );

  const saveSelection = useCallback(() => {
    savedSelectionRef.current = saveSelectionRange(ref.current);
  }, []);

  const restoreSelection = useCallback(() => {
    restoreSelectionRange(ref.current, savedSelectionRef.current, { forceFocus: true });
  }, []);

  const exec = useCallback(
    (command: string, val?: string) => {
      saveSelection();
      restoreSelection();
      document.execCommand(command, false, val);
      ref.current?.focus();
      if (ref.current) emitRawChange(ref.current.innerHTML);
    },
    [emitRawChange, restoreSelection, saveSelection],
  );

  const handleInput = () => {
    if (ref.current) emitRawChange(ref.current.innerHTML);
  };

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const related = event.relatedTarget as Node | null;
    const editorRoot = event.currentTarget.parentElement;
    // Keep focus flag when moving to toolbar / link UI inside this editor only.
    if (related && editorRoot?.contains(related)) {
      return;
    }
    isFocusedRef.current = false;
    if (ref.current) {
      emitSanitizedChange(ref.current.innerHTML, { restoreCaret: false });
    }
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
  };

  const openLinkEditor = () => {
    saveSelection();
    const anchor = getAnchorFromSelection();
    setLinkUrl(anchor?.getAttribute("href") ?? "");
    setLinkError(null);
    setLinkEditorOpen(true);
    requestAnimationFrame(() => linkInputRef.current?.focus());
  };

  const closeLinkEditor = () => {
    setLinkEditorOpen(false);
    setLinkUrl("");
    setLinkError(null);
    ref.current?.focus();
  };

  const applyLink = () => {
    const normalized = normalizeLinkHref(linkUrl);
    if (!normalized) {
      setLinkError("Enter a valid URL (e.g. https://example.com)");
      return;
    }

    restoreSelection();
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setLinkError("Select the text you want to turn into a link first.");
      return;
    }

    document.execCommand("createLink", false, normalized);
    if (ref.current) emitRawChange(ref.current.innerHTML);
    closeLinkEditor();
  };

  const removeLink = () => {
    restoreSelection();
    document.execCommand("unlink");
    if (ref.current) emitRawChange(ref.current.innerHTML);
    closeLinkEditor();
  };

  const insertImageFromFile = async (file: File | null) => {
    if (!file || !onUploadImage) return;
    setUploadingImage(true);
    try {
      const url = await onUploadImage(file);
      const safeUrl = url.trim();
      if (!safeUrl) throw new Error("Upload returned an empty URL");
      restoreSelection();
      const alt = file.name.replace(/\.[^.]+$/, "").slice(0, 120) || "Image";
      const html = `<figure><img src="${safeUrl}" alt="${alt.replace(/"/g, "")}" loading="lazy" /><figcaption></figcaption></figure><p><br></p>`;
      document.execCommand("insertHTML", false, html);
      if (ref.current) emitSanitizedChange(ref.current.innerHTML, { restoreCaret: true });
      toast.success("Image inserted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleEditorClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("a")) {
      event.preventDefault();
      const anchor = target.closest("a");
      if (anchor) {
        saveSelection();
        const range = document.createRange();
        range.selectNodeContents(anchor);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        setLinkUrl(anchor.getAttribute("href") ?? "");
        setLinkError(null);
        setLinkEditorOpen(true);
        requestAnimationFrame(() => linkInputRef.current?.focus());
      }
    }
  };

  const atLimit = maxLength != null && value.length >= maxLength;

  return (
    <div className={cn("overflow-hidden rounded-xl border border-cp-border bg-cp-elevated", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cp-border bg-cp-card/80 p-2">
        <div className="flex flex-wrap gap-1">
          <ToolbarButton onMouseDown={preventToolbarBlur} onClick={() => exec("bold")} title="Bold">
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onMouseDown={preventToolbarBlur} onClick={() => exec("italic")} title="Italic">
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onMouseDown={preventToolbarBlur}
            onClick={() => exec("insertUnorderedList")}
            title="Bullet list"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onMouseDown={preventToolbarBlur}
            onClick={() => exec("insertOrderedList")}
            title="Numbered list"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onMouseDown={preventToolbarBlur} onClick={openLinkEditor} title="Insert link">
            <Link2 className="h-4 w-4" />
          </ToolbarButton>
          {onUploadImage ? (
            <ToolbarButton
              onMouseDown={preventToolbarBlur}
              onClick={() => imageInputRef.current?.click()}
              title={uploadingImage ? "Uploading…" : "Insert image"}
            >
              <ImagePlus className={cn("h-4 w-4", uploadingImage && "animate-pulse")} />
            </ToolbarButton>
          ) : null}
        </div>
        {maxLength ? (
          <FieldCharCounter current={value.length} max={maxLength} className="px-1" />
        ) : null}
      </div>
      {onUploadImage ? (
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={uploadingImage}
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            e.target.value = "";
            void insertImageFromFile(file);
          }}
        />
      ) : null}

      {linkEditorOpen ? (
        <div className="space-y-2 border-b border-cp-border bg-cp-card/60 px-3 py-2">
          <p className="text-xs text-cp-muted">
            Select text in the editor, paste a URL, then apply. Click an existing link to edit it.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              ref={linkInputRef}
              value={linkUrl}
              onChange={(e) => {
                setLinkUrl(e.target.value);
                setLinkError(null);
              }}
              placeholder="https://example.com"
              className="h-9 flex-1 rounded-xl"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyLink();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  closeLinkEditor();
                }
              }}
            />
            <div className="flex shrink-0 gap-1">
              <Button type="button" size="sm" className="h-9" onClick={applyLink}>
                Apply
              </Button>
              <Button type="button" size="sm" variant="outline" className="h-9" onClick={removeLink} title="Remove link">
                <Unlink className="h-4 w-4" />
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-9" onClick={closeLinkEditor}>
                Cancel
              </Button>
            </div>
          </div>
          {linkError ? <p className="text-xs text-red-400">{linkError}</p> : null}
        </div>
      ) : null}

      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline
        aria-invalid={atLimit || undefined}
        data-placeholder={placeholder}
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClick={handleEditorClick}
        className={cn(
          richHtmlClassName("article"),
          "px-4 py-3 text-foreground outline-none",
          "empty:before:pointer-events-none empty:before:text-cp-muted empty:before:content-[attr(data-placeholder)]",
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

function preventToolbarBlur(event: React.MouseEvent) {
  event.preventDefault();
}

function ToolbarButton({
  children,
  onClick,
  onMouseDown,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  onMouseDown?: (event: React.MouseEvent) => void;
  title: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-cp-muted hover:bg-cp-primary/15 hover:text-foreground"
      onMouseDown={onMouseDown}
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );
}
