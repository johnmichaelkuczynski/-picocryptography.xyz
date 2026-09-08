import React, { useRef, useCallback } from "react";
import { KeystrokeTrace } from "@workspace/api-client-react";
import { useAdminMode } from "@/lib/adminMode";
import { MathKeyboard, insertAtTextareaCursor } from "@/components/MathKeyboard";

interface AnswerInputProps {
  value: string;
  onChange: (val: string, trace: KeystrokeTrace) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Use a shorter textarea for brief answers (a sentence or two). */
  compact?: boolean;
  /** Kept for compatibility; pasting is now allowed in every answer field. */
  allowPaste?: boolean;
  initialTrace?: KeystrokeTrace;
  draftKey?: string;
}

export function AnswerInput({
  value,
  onChange,
  placeholder,
  disabled,
  compact,
  initialTrace,
  draftKey,
}: AnswerInputProps) {
  const [adminMode] = useAdminMode();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const traceRef = useRef<KeystrokeTrace>({
    keystrokeCount: initialTrace?.keystrokeCount ?? 0,
    eraseCount: initialTrace?.eraseCount ?? 0,
    bulkInsertCount: initialTrace?.bulkInsertCount ?? 0,
    longestBulkInsertChars: initialTrace?.longestBulkInsertChars ?? 0,
    rewriteSegments: initialTrace?.rewriteSegments ?? 0,
    durationMs: initialTrace?.durationMs ?? 0,
  });

  const sessionStartRef = useRef<number>(Date.now());
  const priorDurationRef = useRef<number>(initialTrace?.durationMs ?? 0);
  const lastKeyWasEraseRef = useRef<boolean>(false);

  const emitChange = useCallback(
    (newVal: string) => {
      const trace = {
        ...traceRef.current,
        durationMs:
          priorDurationRef.current + (Date.now() - sessionStartRef.current),
      };
      onChange(newVal, trace);
    },
    [onChange],
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    const diff = newVal.length - value.length;

    if (diff > 5) {
      traceRef.current.bulkInsertCount = (traceRef.current.bulkInsertCount || 0) + 1;
      if (diff > (traceRef.current.longestBulkInsertChars || 0)) {
        traceRef.current.longestBulkInsertChars = diff;
      }
    }

    emitChange(newVal);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isErase = e.key === "Backspace" || e.key === "Delete";

    if (isErase) {
      traceRef.current.eraseCount += 1;
      if (!lastKeyWasEraseRef.current) {
        traceRef.current.rewriteSegments = (traceRef.current.rewriteSegments || 0) + 1;
      }
      lastKeyWasEraseRef.current = true;
    } else if (e.key.length === 1 || e.key === "Enter") {
      traceRef.current.keystrokeCount += 1;
      lastKeyWasEraseRef.current = false;
    }
  };

  // Inserting a symbol from the math keyboard counts as genuine typing, so it
  // updates the keystroke trace as keystrokes (not a bulk insert) to avoid
  // false-flagging legitimate symbol entry by the authorship detector.
  const handleMathInsert = (text: string, cursorBack = 0) => {
    const el = textareaRef.current;
    if (!el || disabled) return;
    const { value: newVal, cursor } = insertAtTextareaCursor(el, text, cursorBack);
    traceRef.current.keystrokeCount += text.length;
    lastKeyWasEraseRef.current = false;
    emitChange(newVal);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <textarea
        ref={textareaRef}
        data-draft-key={draftKey}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "Type your answer here..."}
        disabled={disabled}
        className={`w-full ${
          compact ? "min-h-[80px] p-3 text-base" : "min-h-[180px] p-5 text-lg"
        } bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed resize-y`}
      />
      {!disabled && <MathKeyboard onInsert={handleMathInsert} />}
      {!disabled && !adminMode && (
        <span className="text-xs text-muted-foreground px-1">
          Pasting is allowed. Large insertions are recorded where authorship analysis applies.
        </span>
      )}
      {!disabled && adminMode && (
        <span className="text-xs text-muted-foreground px-1">
          Administrator mode — pasting enabled.
        </span>
      )}
    </div>
  );
}
