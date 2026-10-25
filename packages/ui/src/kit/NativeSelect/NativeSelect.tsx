"use client";
import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "@repo/i18n";
import {
  Check,
  ChevronDownIcon,
  Search,
  X,
  MapPin,
  Dumbbell,
  CalendarDays,
  Clock,
  CreditCard,
  ArrowDownWideNarrow,
  Users,
  Globe,
  Sun,
  Moon,
  Monitor,
  LoaderCircle,
} from "lucide-react";
import "./NativeSelect.css";
import {
  useSelectOptions,
  mergeSelectOptions,
  filterSelectOptions,
} from "@repo/api/select-options";
import { cn } from "../../lib/utils";
import { BottomSheet } from "../BottomSheet";
import { nativeSelectStyles } from "./NativeSelect.styles";
import type {
  NativeSelectOptGroupProps,
  NativeSelectOptionProps,
  NativeSelectProps,
  SelectOption,
} from "./NativeSelect.types";

type Choice = SelectOption;
function textOf(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      isValidElement<{ children?: ReactNode }>(child)
        ? textOf(child.props.children)
        : String(child ?? ""),
    )
    .join("");
}
function choicesOf(
  children: ReactNode,
  group?: string,
  disabled = false,
): Choice[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<NativeSelectOptionProps & { label?: string }>(child))
      return [];
    const p = child.props;
    if (child.type === Fragment) return choicesOf(p.children, group, disabled);
    if (child.type === NativeSelectOptGroup || child.type === "optgroup")
      return choicesOf(p.children, p.label, disabled || p.disabled);
    return [
      {
        value: String(p.value ?? textOf(p.children)),
        label: p.label ?? textOf(p.children),
        disabled: disabled || p.disabled,
        icon: p.icon,
        image: p.image,
        subtitle: p.subtitle,
        keywords: p.keywords,
        group,
      },
    ];
  });
}
function ChoiceIcon({ choice, context }: { choice: Choice; context: string }) {
  if (choice.image)
    return (
      <img
        src={choice.image}
        alt=""
        className="size-11 rounded-xl object-cover"
      />
    );
  const key = choice.value.toLowerCase();
  const Icon = /countr|province|cit(y|ies)|district|location|branch/.test(
    context,
  )
    ? MapPin
    : /sort/.test(context)
      ? ArrowDownWideNarrow
      : /language|locale/.test(context) || ["en", "fa"].includes(key)
        ? Globe
        : key === "light"
          ? Sun
          : key === "dark"
            ? Moon
            : key === "system"
              ? Monitor
              : /^(class|coaching|court|access|visit|exercise|load|reps)$/.test(
                    key,
                  )
                ? Dumbbell
                : /^(day|week|month|course|session|newest|oldest)$/.test(key)
                  ? CalendarDays
                  : /^(hour|seconds|minute)$/.test(key)
                    ? Clock
                    : /^(membership|package|cash|online|card|wallet)$/.test(key)
                      ? CreditCard
                      : /coach|user|member|role|recipient/.test(context)
                        ? Users
                        : null;
  return (
    <span
      aria-hidden="true"
      className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"
    >
      {choice.icon ??
        (Icon ? (
          <Icon size={21} />
        ) : (
          <span className="text-base font-semibold">
            {Array.from(choice.label.trim())[0]}
          </span>
        ))}
    </span>
  );
}
export function NativeSelect({
  className,
  size = "default",
  children,
  sheetTitle,
  optionsSource,
  pageSize = 25,
  optionsClassName,
  optionsFooter,
  renderOption,
  ref,
  ...props
}: NativeSelectProps) {
  const t = useTranslations("SheetPicker"),
    uid = useId();
  const native = useRef<HTMLSelectElement | null>(null),
    trigger = useRef<HTMLButtonElement>(null),
    input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState(""),
    [active, setActive] = useState(0);
  const [uncontrolled, setUncontrolled] = useState(props.defaultValue);
  const [fieldLabel, setFieldLabel] = useState("");
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    const select = native.current;
    const reset = () => {
      setUncontrolled(props.defaultValue);
      setInvalid(false);
      trigger.current?.removeAttribute("aria-invalid");
    };
    select?.form?.addEventListener("reset", reset);
    return () => select?.form?.removeEventListener("reset", reset);
  }, [props.defaultValue]);
  const localChoices = choicesOf(children);
  const value =
    props.value ??
    uncontrolled ??
    localChoices.find((choice) => !choice.disabled)?.value ??
    "";
  const [remoteSearch, setRemoteSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(
      () => setRemoteSearch(search),
      optionsSource ? 200 : 0,
    );
    return () => clearTimeout(timer);
  }, [search, optionsSource]);
  const optionQuery = useSelectOptions({
    options: localChoices,
    source: optionsSource,
    search: optionsSource ? remoteSearch : search,
    enabled: open,
    id: uid,
    pageSize,
    selectedValues: (Array.isArray(value)
      ? value.map(String)
      : [String(value)]
    ).filter(Boolean),
  });
  const pendingSearch = Boolean(optionsSource && search !== remoteSearch);
  const [picked, setPicked] = useState<Choice[]>([]);
  const choices = mergeSelectOptions([
    { items: localChoices },
    { items: picked },
    { items: optionQuery.items },
    { items: optionQuery.selectedItems },
  ]);
  const filtered = pendingSearch
    ? []
    : optionsSource
      ? mergeSelectOptions([
          {
            items: filterSelectOptions(
              localChoices.filter((choice) => !choice.value),
              search,
            ),
          },
          { items: optionQuery.items },
        ])
      : optionQuery.items;
  const sentinel = useRef<HTMLDivElement>(null);
  const loadingNext = useRef(false);
  const loadMore = async () => {
    if (
      loadingNext.current ||
      !optionQuery.hasNextPage ||
      optionQuery.isFetching ||
      optionQuery.isError ||
      pendingSearch
    )
      return;
    loadingNext.current = true;
    try {
      await optionQuery.fetchNextPage();
    } finally {
      loadingNext.current = false;
    }
  };
  useEffect(() => {
    const target = sentinel.current;
    const root = target?.closest("[data-sheet-scroll]");
    if (!open || !target || !root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { root, rootMargin: "0px 0px 160px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  });
  const selected = choices.filter((c) =>
    Array.isArray(value)
      ? value.map(String).includes(c.value)
      : c.value === String(value),
  );
  const title =
    sheetTitle ?? props["aria-label"] ?? (fieldLabel || t("choose"));
  const enabled = filtered.filter((c) => !c.disabled);
  const current = enabled[Math.min(active, enabled.length - 1)];
  const listId = `${uid}-options`;
  function choose(choice: Choice) {
    const select = native.current;
    if (!select || choice.disabled) return;
    // A searched or later-page value must exist in the form control before its change event.
    if (![...select.options].some((option) => option.value === choice.value)) {
      select.add(new Option(choice.label, choice.value));
    }
    setPicked((current) =>
      mergeSelectOptions([{ items: current }, { items: [choice] }]),
    );
    if (props.multiple) {
      for (const option of select.options)
        if (option.value === choice.value) option.selected = !option.selected;
    } else select.value = choice.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    if (!props.multiple) setOpen(false);
  }
  function show() {
    const label =
      trigger.current?.labels?.[0] ?? trigger.current?.closest("label");
    const labelCopy = label?.cloneNode(true) as HTMLElement | undefined;
    // An implicit label contains the native options as well as the field label.
    labelCopy
      ?.querySelectorAll('[data-slot="native-select-wrapper"]')
      .forEach((node) => node.remove());
    setFieldLabel(
      labelCopy?.textContent?.trim() ||
        (props["aria-labelledby"]
          ? document
              .getElementById(props["aria-labelledby"])
              ?.textContent?.trim()
          : "") ||
        "",
    );
    setSearch("");
    setRemoteSearch("");
    setActive(
      Math.max(
        0,
        choices
          .filter((c) => !c.disabled)
          .findIndex((c) => c.value === String(value)),
      ),
    );
    setOpen(true);
  }
  return (
    <div
      className={cn("relative w-full min-w-0", className)}
      data-slot="native-select-wrapper"
      data-size={size}
    >
      <select
        {...props}
        id={props.id ? `${props.id}-native` : undefined}
        aria-hidden="true"
        tabIndex={-1}
        className="sr-only"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          overflow: "hidden",
          clipPath: "inset(50%)",
        }}
        ref={(el) => {
          native.current = el;
          if (typeof ref === "function") return ref(el);
          else if (ref) ref.current = el;
        }}
        onFocus={() => trigger.current?.focus()}
        onInvalid={(event) => {
          event.preventDefault();
          props.onInvalid?.(event);
          setInvalid(true);
          trigger.current?.focus();
          trigger.current?.setAttribute("aria-invalid", "true");
        }}
        onChange={(event) => {
          setInvalid(false);
          setUncontrolled(
            props.multiple
              ? Array.from(event.target.selectedOptions, (o) => o.value)
              : event.target.value,
          );
          trigger.current?.removeAttribute("aria-invalid");
          props.onChange?.(event);
        }}
      >
        {children}
        {mergeSelectOptions([
          { items: picked },
          { items: optionQuery.items },
          { items: optionQuery.selectedItems },
        ])
          .filter(
            (choice) =>
              !localChoices.some((local) => local.value === choice.value),
          )
          .map((choice) => (
            <option
              key={choice.value}
              value={choice.value}
              disabled={choice.disabled}
            >
              {choice.label}
            </option>
          ))}
      </select>
      <button
        type="button"
        id={props.id}
        ref={trigger}
        disabled={props.disabled}
        form={props.form}
        data-slot="native-select"
        data-size={size}
        aria-label={props["aria-label"]}
        aria-labelledby={props["aria-labelledby"]}
        aria-describedby={
          [props["aria-describedby"], invalid ? `${uid}-error` : undefined]
            .filter(Boolean)
            .join(" ") || undefined
        }
        aria-errormessage={props["aria-errormessage"]}
        aria-invalid={props["aria-invalid"] || invalid}
        aria-required={props.required}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={props.title}
        className={cn(
          nativeSelectStyles.nativeSelect2(),
          "flex min-h-11 items-center justify-between gap-3 text-start disabled:opacity-50",
          props.disabled && "cursor-not-allowed",
        )}
        onClick={show}
        onKeyDown={(event) => {
          if (["ArrowDown", "ArrowUp"].includes(event.key)) {
            event.preventDefault();
            show();
          }
        }}
      >
        <span className="truncate">
          {selected.map((c) => c.label).join(", ") || t("choose")}
        </span>
        <ChevronDownIcon
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </button>
      {invalid && (
        <p
          id={`${uid}-error`}
          role="alert"
          className="mt-2 text-sm text-destructive"
        >
          {t("required")}
        </p>
      )}
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title={title}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          input.current?.focus();
        }}
        fixedHeader={
          <div className="min-w-0 p-1">
            <div
              data-sheet-search=""
              data-gym-focus-proxy=""
              className="flex w-full min-w-0 min-h-12 items-center gap-3 rounded-2xl bg-muted px-4"
            >
              <Search
                size={19}
                aria-hidden="true"
                className="shrink-0 text-muted-foreground"
              />
              <input
                ref={input}
                role="combobox"
                type="text"
                autoComplete="off"
                maxLength={100}
                aria-autocomplete="list"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={
                  current
                    ? `${uid}-option-${encodeURIComponent(current.value)}`
                    : undefined
                }
                aria-label={t("search")}
                placeholder={t("search")}
                value={search}
                className="h-12 w-0 min-w-0 max-w-full flex-1 bg-transparent text-base outline-none"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setActive(0);
                }}
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing) return;
                  if (
                    ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
                  ) {
                    event.preventDefault();
                    if (
                      event.key === "ArrowDown" &&
                      active >= enabled.length - 1 &&
                      optionQuery.hasNextPage
                    ) {
                      void loadMore();
                      return;
                    }
                    const next =
                      event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? enabled.length - 1
                          : (active +
                              (event.key === "ArrowDown" ? 1 : -1) +
                              enabled.length) %
                            Math.max(enabled.length, 1);
                    setActive(next);
                    document
                      .getElementById(
                        `${uid}-option-${encodeURIComponent(enabled[next]?.value ?? "")}`,
                      )
                      ?.scrollIntoView({ block: "nearest" });
                  } else if (event.key === "Enter") {
                    event.preventDefault();
                    if (current) choose(current);
                  }
                }}
              />
              {search && (
                <button
                  type="button"
                  className="flex size-11 shrink-0 items-center justify-center"
                  aria-label={t("clearSearch")}
                  onClick={() => {
                    setSearch("");
                    setActive(0);
                    input.current?.focus();
                  }}
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        }
      >
        <div
          id={listId}
          role="listbox"
          aria-label={title}
          aria-multiselectable={props.multiple || undefined}
          aria-busy={optionQuery.isFetching || pendingSearch}
          className={cn("flex flex-col gap-1", optionsClassName)}
        >
          {filtered.map((choice) => {
            const checked = selected.some((c) => c.value === choice.value);
            if (renderOption)
              return (
                <Fragment key={`${choice.group ?? ""}-${choice.value}`}>
                  {renderOption(choice, {
                    selected: checked,
                    active: current === choice,
                    select: () => choose(choice),
                    buttonProps: {
                      id: `${uid}-option-${encodeURIComponent(choice.value)}`,
                      "aria-posinset": filtered.indexOf(choice) + 1,
                      role: "option",
                      tabIndex: -1,
                      "aria-selected": checked,
                      "aria-disabled": choice.disabled,
                      disabled: choice.disabled,
                    },
                  })}
                </Fragment>
              );
            return (
              <button
                key={`${choice.group ?? ""}-${choice.value}`}
                id={`${uid}-option-${encodeURIComponent(choice.value)}`}
                aria-posinset={filtered.indexOf(choice) + 1}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={checked}
                aria-disabled={choice.disabled}
                disabled={choice.disabled}
                className={cn(
                  "flex min-h-16 w-full items-center gap-3 rounded-2xl px-3 py-3 text-start transition-colors disabled:opacity-40",
                  checked ? "bg-primary/10" : "hover:bg-muted",
                  current === choice && "ring-1 ring-inset ring-border",
                )}
                onClick={() => choose(choice)}
              >
                <ChoiceIcon
                  choice={choice}
                  context={`${props.id ?? ""} ${props.name ?? ""}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block break-words font-medium">
                    {choice.label}
                  </span>
                  {(choice.subtitle || choice.group) && (
                    <span className="mt-0.5 block break-words text-sm text-muted-foreground">
                      {choice.subtitle ?? choice.group}
                    </span>
                  )}
                </span>
                {checked && (
                  <Check
                    size={20}
                    aria-hidden="true"
                    className="shrink-0 text-primary"
                  />
                )}
              </button>
            );
          })}
        </div>
        <div ref={sentinel} aria-hidden="true" className="h-px" />
        {(optionQuery.isPending ||
          pendingSearch ||
          optionQuery.isFetchingNextPage) && (
          <p
            role="status"
            className="flex items-center justify-center gap-2 py-5 text-muted-foreground"
          >
            <LoaderCircle
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            {t("loading")}
          </p>
        )}
        {optionQuery.isError && (
          <div role="alert" className="grid justify-items-center gap-3 py-5">
            <p>{t("loadError")}</p>
            <button
              type="button"
              className="min-h-11 rounded-xl border px-4"
              onClick={() =>
                void (optionQuery.isFetchNextPageError
                  ? optionQuery.fetchNextPage()
                  : optionQuery.refetch())
              }
            >
              {t("retry")}
            </button>
          </div>
        )}
        {optionQuery.hasNextPage && !optionQuery.isError && !pendingSearch && (
          <button
            type="button"
            disabled={optionQuery.isFetching}
            className="mt-3 min-h-11 w-full rounded-xl border disabled:opacity-50"
            onClick={() => void loadMore()}
          >
            {t("loadMore")}
          </button>
        )}
        {!filtered.length &&
          !optionQuery.isPending &&
          !optionQuery.isError &&
          !pendingSearch && (
            <p
              className="py-10 text-center text-muted-foreground"
              role="status"
            >
              {t("noResults")}
            </p>
          )}
        {optionsFooter}
      </BottomSheet>
    </div>
  );
}
export function NativeSelectOption(props: NativeSelectOptionProps) {
  const optionProps = { ...props };
  delete optionProps.icon;
  delete optionProps.image;
  delete optionProps.subtitle;
  delete optionProps.keywords;
  return <option {...optionProps} />;
}
export function NativeSelectOptGroup(props: NativeSelectOptGroupProps) {
  return <optgroup {...props} />;
}
