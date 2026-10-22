"use client";
import { useState } from "react";
import { NativeSelect, NativeSelectOption } from "@repo/ui/kit/NativeSelect";
import { FilterSheet } from "@repo/ui/kit/BottomSheet";
import type { SelectOptionPage } from "@repo/api/select-options";
import { useTranslations } from "@repo/i18n";
type Option = { value: string; label: string; subtitle: string };
/** Disposable fixture for genuine HTTP-shaped pagination through the fixture transport. */
export function SelectOptionsReference() {
  const [value, setValue] = useState("");
  const t = useTranslations("SheetPicker");
  const qa=useTranslations("MobileReference");
  return (
    <main className="p-5">
      <h1 className="mb-6">{qa("selectOptionsTitle")}</h1>
      <FilterSheet>
        <label className="grid gap-2">
          {qa("movement")}
          <NativeSelect
            name="movement"
            value={value}
            sheetTitle={qa("movement")}
            pageSize={25}
            optionsSource={{
              key: ["qa", "select-options"],
              async loadPage(api, request) {
                return api.request<SelectOptionPage<Option>>(
                  {
                    method: "GET",
                    path: "qa/select-options",
                    query: {
                      search: request.search,
                      page: request.page,
                      limit: request.pageSize,
                    },
                  },
                  { signal: request.signal },
                );
              },
            }}
            onChange={(event) => setValue(event.target.value)}
          >
            <NativeSelectOption value="">{t("choose")}</NativeSelectOption>
          </NativeSelect>
        </label>
      </FilterSheet>
      <p role="status" className="mt-5">
        {qa("selected",{value:value||t("choose")})}
      </p>
    </main>
  );
}
