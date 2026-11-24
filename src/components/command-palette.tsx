"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType, type KeyboardEvent } from "react";
import { CornerDownLeft, Search } from "lucide-react";

export type PaletteCommand = {
  id: string;
  label: string;
  group: string;
  icon?: ComponentType<{ size?: number }>;
  glyph?: string;
  keywords?: string;
  hint?: string;
  disabled?: boolean;
  run: () => void;
};

export function CommandPalette({ open, commands, onClose }: {
  open: boolean;
  commands: PaletteCommand[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter(command =>
      (command.label + " " + (command.keywords ?? "") + " " + command.group).toLowerCase().includes(needle));
  }, [commands, query]);

  const groups = useMemo(() => {
    const ordered = new Map<string, PaletteCommand[]>();
    for (const command of results) {
      const items = ordered.get(command.group) ?? [];
      items.push(command);
      ordered.set(command.group, items);
    }
    return [...ordered].map(([name, items]) => ({ name, items }));
  }, [results]);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    setQuery("");
    setSelected(0);
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      cancelAnimationFrame(frame);
      previousFocus.current?.focus();
    };
  }, [open]);

  useEffect(() => { setSelected(0); }, [query]);
  useEffect(() => { setSelected(index => index < results.length ? index : 0); }, [results.length]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [selected, results.length]);

  if (!open) return null;

  function run(command: PaletteCommand) {
    if (command.disabled) return;
    onClose();
    command.run();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelected(index => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelected(index => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const command = results[selected];
      if (command) run(command);
    }
  }

  return <div
    className="editor-dialog-backdrop command-palette-backdrop"
    onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}
  >
    <div className="command-palette" role="dialog" aria-modal="true" aria-label="Quick commands" onKeyDown={handleKeyDown}>
      <div className="command-palette-search">
        <Search size={16} aria-hidden="true" />
        <input
          ref={inputRef}
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search commands…"
          aria-label="Search commands"
          autoComplete="off"
          spellCheck={false}
        />
        <kbd>ESC</kbd>
      </div>
      <div className="command-palette-list" ref={listRef}>
        {results.length === 0 && <p className="command-palette-empty">No commands match “{query}”.</p>}
        {groups.map(group => <div className="command-palette-group" key={group.name}>
          <div className="command-palette-group-label">{group.name}</div>
          {group.items.map(command => {
            const index = results.indexOf(command);
            const Icon = command.icon;
            const isSelected = index === selected;
            return <button
              key={command.id}
              type="button"
              className={"command-palette-item" + (isSelected ? " is-selected" : "")}
              data-selected={isSelected}
              disabled={command.disabled}
              title={command.hint ?? (command.disabled ? "Visual mode only" : undefined)}
              onMouseEnter={() => setSelected(index)}
              onClick={() => run(command)}
            >
              <span className="command-palette-icon" aria-hidden="true">
                {Icon ? <Icon size={15} /> : command.glyph}
              </span>
              <span className="command-palette-label">{command.label}</span>
              {command.hint && <span className="command-palette-hint">{command.hint}</span>}
              {isSelected && <CornerDownLeft size={13} className="command-palette-enter" aria-hidden="true" />}
            </button>;
          })}
        </div>)}
      </div>
      <div className="command-palette-foot">
        <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
        <span><kbd>↵</kbd> run</span>
        <span><kbd>esc</kbd> close</span>
      </div>
    </div>
  </div>;
}
