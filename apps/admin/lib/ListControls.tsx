"use client";

import { useId, useState } from "react";

import { useLocale } from "@repo/i18n";
import { AnimatedButton as Button } from "@repo/ui/kit/button";
import { Field, FieldLabel } from "@repo/ui/kit/field";
import { Input } from "@repo/ui/kit/input";
import {
  AnimatedSelect as Select,
  AnimatedSelectGroup as SelectGroup,
  AnimatedSelectItem as SelectItem,
  AnimatedSelectItemText as SelectItemText,
  AnimatedSelectList as SelectList,
  AnimatedSelectPopup as SelectPopup,
  AnimatedSelectPortal as SelectPortal,
  AnimatedSelectPositioner as SelectPositioner,
  AnimatedSelectTrigger as SelectTrigger,
  AnimatedSelectValue as SelectValue,
} from "@repo/ui/kit/select";

import { normalizeDigits } from "./phone";

export function useAdminList<T>(
  entries: readonly T[],
  searchText: (entry: T) => string,
  filterValue: (entry: T) => string,
  pageSize = 10,
) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [requestedPage, setPage] = useState(0);
  const normalize = (value: string) =>
    normalizeDigits(value.trim()).toLocaleLowerCase().replaceAll("ي", "ی").replaceAll("ك", "ک");
  const query = normalize(search);
  const matched = entries.filter(
    (entry) =>
      (!filter || filterValue(entry) === filter) &&
      (!query || normalize(searchText(entry)).includes(query)),
  );
  const pageCount = Math.max(1, Math.ceil(matched.length / pageSize));
  const page = Math.min(requestedPage, pageCount - 1);
  return {
    rows: matched.slice(page * pageSize, (page + 1) * pageSize),
    count: matched.length,
    page,
    pageCount,
    setPage,
    search,
    filter,
    updateSearch(value: string) {
      setSearch(value);
      setPage(0);
    },
    updateFilter(value: string) {
      setFilter(value);
      setPage(0);
    },
  };
}

type ListState = Omit<ReturnType<typeof useAdminList<unknown>>, "rows">;

export const ListFilters = (props: {
  list: ListState;
  options: readonly (readonly [string, string])[];
  label?: string;
}) => {
  const { list, options, label } = props;
  const filterId = useId();
  const fa = useLocale() === "fa";
  const searchLabel = fa ? "جست‌وجو" : "Search";
  const filterLabel = label ?? (fa ? "وضعیت" : "Status");
  const items = [
    { value: "", label: fa ? "همه" : "All" },
    ...options.map(([value, name]) => ({ value, label: name })),
  ];
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="grid min-w-44 flex-1 gap-1 text-sm">
        {searchLabel}
        <Input
          type="search"
          value={list.search}
          onChange={(event) => list.updateSearch(event.target.value)}
        />
      </label>
      <Field className="w-auto">
        <FieldLabel id={filterId}>{filterLabel}</FieldLabel>
        <Select
          value={list.filter}
          items={items}
          onValueChange={(value) => list.updateFilter(value ?? "")}
        >
          <SelectTrigger aria-labelledby={filterId}>
            <SelectValue />
          </SelectTrigger>
          <SelectPortal>
            <SelectPositioner sideOffset={6} alignItemWithTrigger={false}>
              <SelectPopup>
                <SelectList>
                  <SelectGroup>
                    {items.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        <SelectItemText>{label}</SelectItemText>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectList>
              </SelectPopup>
            </SelectPositioner>
          </SelectPortal>
        </Select>
      </Field>
    </div>
  );
};

export const ListPagination = (props: { list: ListState }) => {
  const { list } = props;
  const locale = useLocale();
  const fa = locale === "fa";
  const number = new Intl.NumberFormat(locale);
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 text-sm"
      aria-label={fa ? "صفحه‌بندی" : "Pagination"}
    >
      <span role="status">
        {fa ?
          `${number.format(list.count)} نتیجه · صفحهٔ ${number.format(list.page + 1)} از ${number.format(list.pageCount)}`
        : `${number.format(list.count)} results · Page ${number.format(list.page + 1)} of ${number.format(list.pageCount)}`
        }
      </span>
      <div className="flex gap-2">
        <Button
          variant="outlined"
          color="neutral"
          size="sm"
          disabled={list.page === 0}
          onClick={() => list.setPage(list.page - 1)}
        >
          {fa ? "قبلی" : "Previous"}
        </Button>
        <Button
          variant="outlined"
          color="neutral"
          size="sm"
          disabled={list.page + 1 === list.pageCount}
          onClick={() => list.setPage(list.page + 1)}
        >
          {fa ? "بعدی" : "Next"}
        </Button>
      </div>
    </div>
  );
};
