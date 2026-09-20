"use client";

import { Download, FileText, Loader2, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useLocale } from "@/components/locale-provider";
import { componentLabels } from "@/lib/i18n/labels";
import { formatDate } from "@/lib/payroll/format";
import { cn } from "@/lib/utils";

export type AttachmentItem = {
  id: string;
  name: string;
  /** Size in bytes. */
  size: number;
  /** ISO timestamp. */
  uploadedAt: string;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Read-only or editable list of attachments (mock — nothing is uploaded or downloaded for real). */
export function AttachmentList({
  items,
  onRemove,
  pendingIds,
}: {
  items: AttachmentItem[];
  /** When given, each row gets a remove button. */
  onRemove?: (id: string) => void;
  pendingIds?: ReadonlySet<string>;
}) {
  const { t } = useLocale();

  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground">{t(componentLabels.noAttachments)}</p>;
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {items.map((item) => {
        const pending = pendingIds?.has(item.id);
        return (
          <li key={item.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <FileText className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-foreground" dir="auto">
                {item.name}
              </span>
              <span className="block text-xs text-muted-foreground">
                {pending ? (
                  t(componentLabels.uploading)
                ) : (
                  <>
                    <bdi dir="ltr">{formatSize(item.size)}</bdi> ·{" "}
                    <bdi dir="ltr">{formatDate(item.uploadedAt)}</bdi>
                  </>
                )}
              </span>
            </span>
            {pending ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <>
                <button
                  type="button"
                  disabled
                  title={t(componentLabels.downloadAttachment)}
                  aria-label={t(componentLabels.downloadAttachment)}
                  className="rounded-md p-1.5 text-muted-foreground opacity-60"
                >
                  <Download className="size-4" />
                </button>
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    title={t(componentLabels.removeAttachment)}
                    aria-label={t(componentLabels.removeAttachment)}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Drag & drop / browse uploader with a simulated upload (~0.8s per file).
 * Files are never sent anywhere — only name and size are kept in the list.
 */
export function AttachmentUploader({
  items,
  onChange,
  disabled,
}: {
  items: AttachmentItem[];
  onChange: (items: AttachmentItem[]) => void;
  disabled?: boolean;
}) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const itemsRef = useRef(items);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const active = timers.current;
    return () => active.forEach((timer) => window.clearTimeout(timer));
  }, []);

  function addFiles(files: FileList | File[]) {
    const added: AttachmentItem[] = Array.from(files).map((file) => ({
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    }));
    if (added.length === 0) return;
    const ids = added.map((item) => item.id);
    onChange([...itemsRef.current, ...added]);
    setPending((prev) => new Set([...prev, ...ids]));
    const timer = window.setTimeout(() => {
      setPending((prev) => new Set([...prev].filter((id) => !ids.includes(id))));
    }, 800);
    timers.current.push(timer);
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-6 text-sm text-muted-foreground outline-none transition-colors",
          "hover:border-primary/50 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
          dragging && "border-primary bg-primary/5"
        )}
      >
        <UploadCloud className="size-6" />
        {t(componentLabels.dropOrBrowse)}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files) addFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <AttachmentList
        items={items}
        pendingIds={pending}
        onRemove={(id) => onChange(items.filter((item) => item.id !== id))}
      />
    </div>
  );
}
