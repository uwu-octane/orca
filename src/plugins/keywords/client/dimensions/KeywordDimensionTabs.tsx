import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { useLocale } from "@/plugins/client/context";
import { Button } from "@/client/components/ui/button";
import { Badge } from "@/client/components/ui/badge";
import { Toggle } from "@/client/components/ui/toggle";
import type {
  KeywordDimensionField,
  KeywordDimension,
} from "@/types/schemas/keyword-dimensions";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/client/components/ui/tabs";
import { KeywordFieldDialog } from "./KeywordFieldDialog";

type Editor = {
  dimensionId?: string;
  childId?: string;
  kind: "dimension" | "child";
};

export function KeywordDimensionTabs({
  dimensions,
  disabled,
  error,
  onChange,
}: {
  dimensions: KeywordDimension[];
  disabled: boolean;
  error?: string;
  onChange: (dimensions: KeywordDimension[]) => Promise<boolean>;
}) {
  const { t, active: language } = useLocale();
  const [selected, setSelected] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const active =
    dimensions.find((dimension) => dimension.id === selected) ?? dimensions[0];
  const editedDimension = dimensions.find(
    (dimension) => dimension.id === editor?.dimensionId,
  );
  const editedChild = editedDimension?.children.find(
    (child) => child.id === editor?.childId,
  );
  function displayName(field: KeywordDimensionField) {
    return language === "zh" ? field.labelZh : field.name;
  }
  async function save(field: KeywordDimensionField) {
    if (!editor) return;
    const newId = crypto.randomUUID();
    const updated =
      editor.kind === "dimension"
        ? editedDimension
          ? dimensions.map((dimension) =>
              dimension.id === editedDimension.id
                ? { ...dimension, ...field }
                : dimension,
            )
          : [...dimensions, { id: newId, ...field, children: [] }]
        : dimensions.map((dimension) =>
            dimension.id === editedDimension?.id
              ? {
                  ...dimension,
                  children: editedChild
                    ? dimension.children.map((child) =>
                        child.id === editedChild.id
                          ? { ...child, ...field }
                          : child,
                      )
                    : [
                        ...dimension.children,
                        { id: newId, ...field, active: true },
                      ],
                }
              : dimension,
          );
    if (await onChange(updated)) {
      if (editor.kind === "dimension" && !editedDimension) setSelected(newId);
      setEditor(null);
    }
  }
  async function remove() {
    if (!editor) return;
    const updated =
      editor.kind === "dimension"
        ? dimensions.filter((dimension) => dimension.id !== editor.dimensionId)
        : dimensions.map((dimension) =>
            dimension.id === editor.dimensionId
              ? {
                  ...dimension,
                  children: dimension.children.filter(
                    (child) => child.id !== editor.childId,
                  ),
                }
              : dimension,
          );
    if (await onChange(updated)) setEditor(null);
  }
  return (
    <>
      <Tabs
        value={active?.id ?? null}
        onValueChange={(value) => setSelected(String(value))}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2 border-b pb-2">
          {dimensions.length ? (
            <div className="min-w-0 max-w-full overflow-x-auto">
              <TabsList variant="line" aria-label={t("Dimensions")}>
                {dimensions.map((dimension) => (
                  <div
                    key={dimension.id}
                    className="relative flex h-full items-center"
                  >
                    <TabsTrigger
                      value={dimension.id}
                      disabled={disabled}
                      className="pl-3 pr-8"
                    >
                      {displayName(dimension)}
                    </TabsTrigger>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="absolute right-1 text-muted-foreground"
                      disabled={disabled}
                      tabIndex={active?.id === dimension.id ? 0 : -1}
                      aria-label={t("Edit {name}", {
                        name: displayName(dimension),
                      })}
                      onClick={() => {
                        setSelected(dimension.id);
                        setEditor({
                          kind: "dimension",
                          dimensionId: dimension.id,
                        });
                      }}
                    >
                      <Pencil />
                    </Button>
                  </div>
                ))}
              </TabsList>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">
              {t("No dimensions yet")}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => setEditor({ kind: "dimension" })}
          >
            <Plus data-icon="inline-start" />
            {t("Add dimension")}
          </Button>
        </div>
        {dimensions.map((dimension) => (
          <TabsContent
            key={dimension.id}
            value={dimension.id}
            className="min-h-24 space-y-3 pt-2"
          >
            <div className="flex flex-wrap items-center gap-2">
              {dimension.children.map((child) => (
                <Badge
                  key={child.id}
                  variant={child.active ? "soft" : "outline"}
                  className="h-auto min-h-8 max-w-full gap-0 whitespace-normal p-0 pr-1 text-sm"
                >
                  <Toggle
                    pressed={child.active}
                    disabled={disabled}
                    className="h-auto min-h-8 min-w-0 rounded-full py-1 pl-3 pr-2 whitespace-normal text-muted-foreground aria-pressed:bg-transparent aria-pressed:text-primary"
                    onPressedChange={(pressed) =>
                      onChange(
                        dimensions.map((item) =>
                          item.id === dimension.id
                            ? {
                                ...item,
                                children: item.children.map((itemChild) =>
                                  itemChild.id === child.id
                                    ? { ...itemChild, active: pressed }
                                    : itemChild,
                                ),
                              }
                            : item,
                        ),
                      )
                    }
                  >
                    {displayName(child)}
                  </Toggle>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="rounded-full text-muted-foreground"
                    disabled={disabled}
                    aria-label={t("Edit {name}", { name: displayName(child) })}
                    onClick={() =>
                      setEditor({
                        kind: "child",
                        dimensionId: dimension.id,
                        childId: child.id,
                      })
                    }
                  >
                    <Pencil />
                  </Button>
                </Badge>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={disabled}
                onClick={() =>
                  setEditor({ kind: "child", dimensionId: dimension.id })
                }
              >
                <Plus data-icon="inline-start" />
                {t("Add subdimension")}
              </Button>
            </div>
          </TabsContent>
        ))}
      </Tabs>
      {editor ? (
        <KeywordFieldDialog
          pending={disabled}
          error={error}
          title={
            editor.kind === "dimension"
              ? t(editedDimension ? "Edit dimension" : "Add dimension")
              : t(editedChild ? "Edit subdimension" : "Add subdimension")
          }
          initialField={{
            name:
              (editor.kind === "dimension" ? editedDimension : editedChild)
                ?.name ?? "",
            labelZh:
              (editor.kind === "dimension" ? editedDimension : editedChild)
                ?.labelZh ?? "",
          }}
          siblings={
            editor.kind === "dimension"
              ? dimensions.filter(
                  (dimension) => dimension.id !== editor.dimensionId,
                )
              : (editedDimension?.children.filter(
                  (child) => child.id !== editor.childId,
                ) ?? [])
          }
          onSave={save}
          onDelete={
            (editor.kind === "dimension" ? editedDimension : editedChild)
              ? remove
              : undefined
          }
          onClose={() => setEditor(null)}
        />
      ) : null}
    </>
  );
}
