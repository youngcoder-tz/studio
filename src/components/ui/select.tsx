"use client";

import * as React from "react";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default";
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "border-input data-placeholder:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

/**
 * 🛠️ UTILITY: Recursively extract text contents from standard React nodes.
 */ function getTextContent(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(getTextContent).join(" ");
  }
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return getTextContent(props.children);
  }
  return "";
}

/**
 * 🛠️ UTILITY: Strip diacritics / accents for seamless input mapping.
 */
function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Strips standard accents (e.g. é -> e)
    .toLowerCase();
}

/**
 * A child element's `type`. Radix ships `SelectItem` as a function component
 * (plain function or forwardRef wrapper), but consumers may also nest
 * arbitrary string tags / symbols as children — capture all shapes here.
 */
type SelectChildType =
  | (React.FunctionComponent<React.ComponentProps<typeof SelectItem>> & {
      name: string;
    })
  | string
  | symbol;

/**
 * 🧠 SMART FILTERING ENGINE
 * Maps matching nodes and prunes non-matching items & empty groups completely
 * to preserve Radix-native keyboard focus and accessibility trees.
 */
function getMatchedChildren(
  children: React.ReactNode,
  normalizedQuery: string,
): { filtered: React.ReactNode; matchCount: number } {
  let totalMatchCount = 0;

  const filtered = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;

    const childProps = child.props as {
      children?: React.ReactNode;
      value?: string;
      "data-slot"?: string;
    };
    const childType = child.type as SelectChildType;

    // 🚀 HARDEST CONSTRAINTS MATCHING:
    // Safely detects SelectItem across every packaging scenario (by data-slot, raw value prop, or constructor class)
    const isSelectItem =
      childProps["data-slot"] === "select-item" ||
      childProps.value !== undefined ||
      (typeof childType === "function" &&
        (childType.name === "SelectItem" ||
          childType.displayName === "SelectItem"));

    // 1. Evaluate SelectItem
    if (isSelectItem) {
      const text = normalizeText(getTextContent(childProps.children));

      // Token-based matching: guarantees terms can be typed out of order
      const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
      const isMatch = tokens.every((token) => text.includes(token));

      if (isMatch) {
        totalMatchCount++;
        return child;
      }
      return null; // Completely remove non-matching items to fix key-up/down traps
    }

    // 2. Recurse into SelectGroup or wrapping components
    if (childProps.children) {
      const { filtered: nextChildren, matchCount } = getMatchedChildren(
        childProps.children,
        normalizedQuery,
      );

      // If the group has active children, preserve it. Else, prune the group completely.
      if (matchCount > 0) {
        totalMatchCount += matchCount;
        return React.cloneElement(child, {
          children: nextChildren,
        } as React.PropsWithChildren<unknown>);
      }
      return null;
    }

    return child;
  });

  return { filtered, matchCount: totalMatchCount };
}

function SelectContent({
  className,
  children,
  position = "popper",
  align = "start",
  sideOffset = -2,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  const [filter, setFilter] = React.useState("");
  const { onCloseAutoFocus, ...contentProps } = props;

  // Reset the filter every time the content closes
  const handleCloseAutoFocus = React.useCallback(
    (event: Event) => {
      setFilter("");
      onCloseAutoFocus?.(event);
    },
    [onCloseAutoFocus],
  );

  const { filteredChildren, matchCount } = React.useMemo(() => {
    const query = filter.trim();
    if (!query) {
      return { filteredChildren: children, matchCount: 1 }; // Bypass recursive overhead if query is blank
    }
    const { filtered, matchCount: count } = getMatchedChildren(
      children,
      normalizeText(query),
    );
    return { filteredChildren: filtered, matchCount: count };
  }, [children, filter]);

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--radix-select-content-available-height) min-w-32 origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border shadow-md",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className,
        )}
        position={position}
        align={align}
        sideOffset={sideOffset}
        side="bottom"
        avoidCollisions={false}
        onCloseAutoFocus={handleCloseAutoFocus}
        {...contentProps}
      >
        <div className="p-1.5 pb-0" data-slot="select-filter-wrapper">
          <input
            autoFocus
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => {
              const passthroughKeys = [
                "ArrowDown",
                "ArrowUp",
                "Escape",
                "Enter",
                "Tab",
              ];
              if (!passthroughKeys.includes(e.key)) {
                e.stopPropagation();
              }
            }}
            placeholder="Search..."
            className="border-input/30 rounded-full placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 mb-1.5 flex h-8 w-full shadow-inner border shadow-black/30 bg-input/20 text-sm px-4 outline-none focus-visible:ring"
            data-slot="select-filter-input"
          />
        </div>
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "h-(--radix-select-trigger-height) w-full min-w-(--radix-select-trigger-width) scroll-my-1",
          )}
        >
          {filteredChildren}

          {/* Fallback informational state */}
          {matchCount === 0 && (
            <div className="text-muted-foreground/60 py-6 text-center text-xs font-semibold select-none">
              No matches found
            </div>
          )}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className,
      )}
      {...props}
    >
      <span
        data-slot="select-item-indicator"
        className="absolute right-2 flex size-3.5 items-center justify-center"
      >
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className,
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className,
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
