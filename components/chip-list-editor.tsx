"use client";

import { useRef } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const chipClass =
  "flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs";

/**
 * Free-text chip list editor (tags, component codes, file names…): text input + add button +
 * removable chips. In `onFilesSelected` mode it becomes a native file picker instead
 * (no manual text entry) and `addLabel` is the browse button text.
 */
export function ChipListEditor({
  items,
  onAdd,
  onRemove,
  input,
  onInputChange,
  placeholder,
  addLabel,
  removeLabel,
  emptyLabel,
  onFilesSelected,
}: {
  items: string[];
  onRemove: (value: string) => void;
  addLabel: string;
  removeLabel: string;
  emptyLabel: string;
} & (
  | {
      onFilesSelected: (files: FileList) => void;
      onAdd?: never;
      input?: never;
      onInputChange?: never;
      placeholder?: never;
    }
  | {
      onFilesSelected?: never;
      onAdd: () => void;
      input: string;
      onInputChange: (value: string) => void;
      placeholder: string;
    }
)) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {onFilesSelected ? (
          <>
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              {addLabel}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onFilesSelected(e.target.files);
                }
                e.target.value = "";
              }}
            />
          </>
        ) : (
          <>
            <Input
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={placeholder}
              className="max-w-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAdd();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={onAdd}>
              {addLabel}
            </Button>
          </>
        )}
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <li key={item} className={chipClass}>
              {item}
              <button
                type="button"
                aria-label={removeLabel}
                onClick={() => onRemove(item)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Single-file native picker for one-off attachment fields (bank letter, court order…). */
export function SingleFilePicker({
  value,
  onFileSelected,
  browseLabel,
  emptyLabel,
}: {
  value: string;
  onFileSelected: (file: File) => void;
  browseLabel: string;
  emptyLabel: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
        {browseLabel}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
          e.target.value = "";
        }}
      />
      <span className="text-xs text-muted-foreground">{value || emptyLabel}</span>
    </div>
  );
}

/** Chip editor for picking several related records (option list → chips, values are record ids). */
export function MultiSelectChips({
  options,
  selected,
  onAdd,
  onRemove,
  placeholder,
  removeLabel,
  emptyLabel,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  placeholder: string;
  removeLabel: string;
  emptyLabel: string;
}) {
  const availableOptions = options.filter((o) => !selected.includes(o.value));
  return (
    <div>
      <Select value="" onValueChange={(value) => value && onAdd(value)}>
        <SelectTrigger className="w-full max-w-xs">
          <SelectValue placeholder={placeholder}>{() => placeholder}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {availableOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((value) => {
            const option = options.find((o) => o.value === value);
            return (
              <li key={value} className={chipClass}>
                {option?.label ?? value}
                <button
                  type="button"
                  aria-label={removeLabel}
                  onClick={() => onRemove(value)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
