"use client";

import { Menu } from "@base-ui/react/menu";
import { Toast } from "@base-ui/react/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import type { ResourceKind } from "./resource-catalogs";
import type { ClubResource } from "@repo/ui/lib/club-location-fields";

import { getLocaleConfig, useLocale, useTranslations } from "@repo/i18n";
import { DotThreeHorizontal } from "@repo/icons/dot-three-horizontal";
import { PencilLine1 } from "@repo/icons/pencil-line-1";
import { Plus } from "@repo/icons/plus";
import { Power } from "@repo/icons/power";
import { Badge } from "@repo/ui/kit/badge";
import { AnimatedButton as Button } from "@repo/ui/kit/button";
import { Drawer, DrawerBody, DrawerContent, DrawerHeader, DrawerTitle } from "@repo/ui/kit/drawer";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@repo/ui/kit/field";
import { Input } from "@repo/ui/kit/input";
import { AnimatedSelectControl } from "@repo/ui/kit/select";

import { readApi, useApiRequest } from "../../lib/admin-api";
import { ListFilters, ListPagination, useAdminList } from "../../lib/ListControls";
import { PanelBreadcrumb } from "../dashboard/PanelBreadcrumb";
import { resourceCatalogs, resourceEndpoint } from "./resource-catalogs";

const resourceKey = (kind: ResourceKind) => ["resources", kind];
const read = (kind: ResourceKind, signal: AbortSignal) =>
  readApi<ClubResource[]>(`${resourceEndpoint(kind)}?includeInactive=true`, signal);

export const ResourceManager = (props: { kind: ResourceKind }) => {
  const { kind } = props;
  const locale = useLocale();
  const t = useTranslations("Resources");
  const parent = resourceCatalogs[kind].parent;
  const client = useQueryClient();
  const request = useApiRequest();
  const toast = Toast.useToastManager();
  const entries = useQuery({
    queryKey: resourceKey(kind),
    queryFn: ({ signal }) => read(kind, signal),
  });
  const parents = useQuery({
    queryKey: parent ? resourceKey(parent) : ["resources", "no-parent"],
    queryFn: ({ signal }) => (parent ? read(parent, signal) : Promise.resolve([])),
    enabled: Boolean(parent),
  });
  const data =
    entries.data && (!parent || parents.data) ?
      { entries: entries.data, parents: parents.data ?? [] }
    : undefined;
  const loadFailed = entries.isError || parents.isError;
  const [editor, setEditor] = useState<"new" | ClubResource>();
  const [pending, setPending] = useState<string>();
  const writeLock = useRef(false);
  const existing = editor === "new" ? undefined : editor;
  const list = useAdminList(
    data?.entries ?? [],
    (entry) => `${entry.title} ${entry.code}`,
    (entry) => String(entry.active),
  );
  const schema = z.object({
    title: z.string().trim().min(1, t("invalid")).max(120, t("invalid")),
    code:
      editor === "new" ?
        z
          .string()
          .max(64, t("invalid"))
          .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, t("invalid"))
      : z.string(),
    parentId: editor === "new" && parent ? z.string().min(1, t("invalid")) : z.string(),
  });
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { title: "", code: "", parentId: "" },
  });

  function openEditor(entry: "new" | ClubResource) {
    form.reset({ title: entry === "new" ? "" : entry.title, code: "", parentId: "" });
    setEditor(entry);
  }

  async function save(action: string, body: object, id?: string) {
    if (writeLock.current) return false;
    writeLock.current = true;
    setPending(action);
    try {
      const response = await request([
        resourceEndpoint(kind) + (id ? `/${encodeURIComponent(id)}` : ""),
        {
          method: id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      ]);
      if (!response.ok) {
        toast.add({
          title: t(
            response.status === 409 ? "duplicate"
            : response.status === 400 ? "invalid"
            : "saveError",
          ),
          type: "error",
        });
        return false;
      }
      const item = (await response.json()) as ClubResource;
      await client.cancelQueries({ queryKey: resourceKey(kind) });
      client.setQueryData<ClubResource[]>(resourceKey(kind), (current = []) =>
        [...current.filter((entry) => entry.id !== item.id), item].sort((a, b) =>
          a.title.localeCompare(b.title, locale),
        ),
      );
      return true;
    } catch {
      toast.add({ title: t("saveError"), type: "error" });
      return false;
    } finally {
      writeLock.current = false;
      setPending(undefined);
    }
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) =>
    form.handleSubmit(async ({ title, code, parentId }) => {
      const body = editor === "new" ? { title, code, parentId: parentId || null } : { title };
      if (editor && (await save("form", body, existing?.id))) setEditor(undefined);
    })(event);
  const errors = form.formState.errors;
  return (
    <>
      <PanelBreadcrumb title={t(kind)} />
      <main {...getLocaleConfig(locale)} className="mx-auto grid max-w-screen-2xl gap-6 p-4 sm:p-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid gap-2">
            <h1 className="text-2xl font-semibold sm:text-3xl">{t(kind)}</h1>
          </div>
          <Button
            type="button"
            disabled={!data || Boolean(editor) || Boolean(pending)}
            onClick={() => openEditor("new")}
          >
            <Plus size={16} data-icon="inline-start" />
            {t("create")}
          </Button>
        </header>
        {loadFailed && (
          <div className="flex items-center gap-3">
            <p role="alert">{t("loadError")}</p>
            <Button
              type="button"
              variant="outlined"
              color="neutral"
              onClick={() => {
                void entries.refetch();
                if (parent) void parents.refetch();
              }}
            >
              {t("retry")}
            </Button>
          </div>
        )}
        {!data && !loadFailed && <p role="status">{t("loading")}</p>}
        <Drawer
          open={Boolean(editor)}
          swipeDirection={locale === "fa" ? "right" : "left"}
          onOpenChange={(open, event) => {
            if (!open && pending) event.cancel();
            else if (!open) setEditor(undefined);
          }}
        >
          {editor && data && (
            <DrawerContent {...getLocaleConfig(locale)}>
              <DrawerHeader>
                <DrawerTitle>{t(existing ? "edit" : "create")}</DrawerTitle>
              </DrawerHeader>
              <DrawerBody>
                <form onSubmit={(event) => void submit(event)} noValidate>
                  <FieldGroup>
                    <Field data-invalid={Boolean(errors.title)}>
                      <FieldLabel htmlFor="resource-title">{t("name")}</FieldLabel>
                      <Input
                        id="resource-title"
                        {...form.register("title")}
                        aria-invalid={Boolean(errors.title)}
                        aria-describedby={errors.title ? "resource-title-error" : undefined}
                        disabled={Boolean(pending)}
                      />
                      {errors.title && (
                        <FieldDescription id="resource-title-error" role="alert">
                          {errors.title.message}
                        </FieldDescription>
                      )}
                    </Field>
                    {!existing && (
                      <Field data-invalid={Boolean(errors.code)}>
                        <FieldLabel htmlFor="resource-code">{t("code")}</FieldLabel>
                        <Input
                          id="resource-code"
                          dir="ltr"
                          {...form.register("code")}
                          aria-invalid={Boolean(errors.code)}
                          aria-describedby={errors.code ? "resource-code-error" : undefined}
                          disabled={Boolean(pending)}
                        />
                        {errors.code && (
                          <FieldDescription id="resource-code-error" role="alert">
                            {errors.code.message}
                          </FieldDescription>
                        )}
                      </Field>
                    )}
                    {!existing && parent && (
                      <Field data-invalid={Boolean(errors.parentId)}>
                        <FieldLabel htmlFor="resource-parent">{t("parent")}</FieldLabel>
                        <Controller
                          name="parentId"
                          control={form.control}
                          render={({ field: parentField }) => (
                            <AnimatedSelectControl
                              value={parentField.value}
                              onChange={parentField.onChange}
                              disabled={Boolean(pending)}
                              placeholder={t("chooseParent")}
                              items={data.parents
                                .filter(({ active }) => active)
                                .map(({ id, title }) => ({ value: id, label: title }))}
                              triggerProps={{
                                id: "resource-parent",
                                ref: parentField.ref,
                                onBlur: parentField.onBlur,
                                "aria-invalid": Boolean(errors.parentId),
                                "aria-describedby":
                                  errors.parentId ? "resource-parent-error" : undefined,
                              }}
                            />
                          )}
                        />
                        {errors.parentId && (
                          <FieldDescription id="resource-parent-error" role="alert">
                            {errors.parentId.message}
                          </FieldDescription>
                        )}
                      </Field>
                    )}
                    <div className="flex gap-2">
                      <Button type="submit" loading={pending === "form"}>
                        {t("save")}
                      </Button>
                      <Button
                        type="button"
                        variant="text"
                        color="neutral"
                        disabled={Boolean(pending)}
                        onClick={() => setEditor(undefined)}
                      >
                        {t("cancel")}
                      </Button>
                    </div>
                  </FieldGroup>
                </form>
              </DrawerBody>
            </DrawerContent>
          )}
        </Drawer>
        {data && (
          <ListFilters
            list={list}
            options={[
              ["true", t("active")],
              ["false", t("inactive")],
            ]}
          />
        )}
        {data && (
          <section className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900">
            {!list.rows.length ?
              <p className="p-5 text-sm text-theme-muted-foreground">
                {t(data.entries.length ? "noResults" : "empty")}
              </p>
            : <table className="w-full min-w-[30rem] text-sm [&_td]:px-4 [&_td]:py-2 [&_th]:p-4 [&_th]:text-start">
                <thead className="bg-neutral-800/50 text-theme-muted-foreground">
                  <tr>
                    <th scope="col">{t("name")}</th>
                    <th scope="col">{t("code")}</th>
                    {parent && <th scope="col">{t("parent")}</th>}
                    <th scope="col">{t("status")}</th>
                    <th scope="col">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.rows.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-t border-neutral-800 transition-colors hover:bg-neutral-800/35"
                    >
                      <th scope="row" className="font-medium">
                        <bdi>{entry.title}</bdi>
                      </th>
                      <td>
                        <bdi dir="ltr" className="font-mono text-xs text-theme-muted-foreground">
                          {entry.code}
                        </bdi>
                      </td>
                      {parent && (
                        <td>
                          <bdi>
                            {data.parents.find(({ id }) => id === entry.parentId)?.title ?? "—"}
                          </bdi>
                        </td>
                      )}
                      <td>
                        <Badge
                          size="xs"
                          radius="full"
                          color={entry.active ? "success" : "neutral"}
                          variant="text"
                        >
                          <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                          {t(entry.active ? "active" : "inactive")}
                        </Badge>
                      </td>
                      <td className="w-20">
                        <Menu.Root modal={false}>
                          <Menu.Trigger
                            aria-label={t("rowActions", { name: entry.title })}
                            disabled={Boolean(pending) || Boolean(editor)}
                            render={
                              <Button
                                iconOnly
                                size="sm"
                                variant="text"
                                color="neutral"
                                disabled={Boolean(pending) || Boolean(editor)}
                                loading={pending === entry.id}
                              />
                            }
                          >
                            <DotThreeHorizontal size={18} />
                          </Menu.Trigger>
                          <Menu.Portal>
                            <Menu.Positioner sideOffset={6} align="end" className="z-40">
                              <Menu.Popup
                                {...getLocaleConfig(locale)}
                                className="min-w-44 rounded-xl border border-neutral-700 bg-neutral-900 p-1 text-sm text-theme-foreground shadow-lg outline-none"
                              >
                                <Menu.Group className="[&_[data-highlighted]]:bg-neutral-800 [&_[role=menuitem]]:flex [&_[role=menuitem]]:cursor-pointer [&_[role=menuitem]]:items-center [&_[role=menuitem]]:gap-2 [&_[role=menuitem]]:rounded-lg [&_[role=menuitem]]:px-3 [&_[role=menuitem]]:py-2 [&_[role=menuitem]]:outline-none">
                                  <Menu.Item onClick={() => openEditor(entry)}>
                                    <PencilLine1 size={16} />
                                    {t("edit")}
                                  </Menu.Item>
                                  <Menu.Item
                                    onClick={() =>
                                      void save(entry.id, { active: !entry.active }, entry.id)
                                    }
                                  >
                                    <Power size={16} />
                                    {t(entry.active ? "deactivate" : "restore")}
                                  </Menu.Item>
                                </Menu.Group>
                              </Menu.Popup>
                            </Menu.Positioner>
                          </Menu.Portal>
                        </Menu.Root>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          </section>
        )}
        {data && <ListPagination list={list} />}
      </main>
    </>
  );
};
