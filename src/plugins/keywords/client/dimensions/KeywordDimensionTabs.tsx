import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { useLocale } from "@/plugins/client/context";
import { Button } from "@/client/components/ui/button";
import { Badge } from "@/client/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/client/components/ui/tabs";
import { KeywordFieldDialog } from "./KeywordFieldDialog";

export type KeywordDimension = {
  id: string;
  name: string;
  children: { id: string; name: string }[];
};
type Editor = {
  dimensionId?: string;
  childId?: string;
  kind: "dimension" | "child";
};

export function KeywordDimensionTabs({
  dimensions,
  disabled,
  onChange,
}: {
  dimensions: KeywordDimension[];
  disabled: boolean;
  onChange: (dimensions: KeywordDimension[]) => void;
}) {
  const { t } = useLocale();
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
  function save(name: string) {
    if (!editor) return;
    if (editor.kind === "dimension") {
      if (editedDimension)
        onChange(
          dimensions.map((dimension) =>
            dimension.id === editedDimension.id
              ? { ...dimension, name }
              : dimension,
          ),
        );
      else {
        const id = crypto.randomUUID();
        onChange([...dimensions, { id, name, children: [] }]);
        setSelected(id);
      }
    } else if (editedDimension) {
      onChange(
        dimensions.map((dimension) =>
          dimension.id === editedDimension.id
            ? {
                ...dimension,
                children: editedChild
                  ? dimension.children.map((child) =>
                      child.id === editedChild.id ? { ...child, name } : child,
                    )
                  : [...dimension.children, { id: crypto.randomUUID(), name }],
              }
            : dimension,
        ),
      );
    }
    setEditor(null);
  }
  function remove() {
    if (editor?.kind === "dimension")
      onChange(
        dimensions.filter((dimension) => dimension.id !== editor.dimensionId),
      );
    else if (editedDimension && editedChild)
      onChange(
        dimensions.map((dimension) =>
          dimension.id === editedDimension.id
            ? {
                ...dimension,
                children: dimension.children.filter(
                  (child) => child.id !== editedChild.id,
                ),
              }
            : dimension,
        ),
      );
    setEditor(null);
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
                  <TabsTrigger
                    key={dimension.id}
                    value={dimension.id}
                    disabled={disabled}
                    className="px-3"
                  >
                    {dimension.name}
                  </TabsTrigger>
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
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() =>
                  setEditor({ kind: "dimension", dimensionId: dimension.id })
                }
              >
                <Pencil data-icon="inline-start" />
                {t("Edit dimension")}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {dimension.children.map((child) => (
                <Badge
                  key={child.id}
                  variant="secondary"
                  className="h-auto min-h-8 max-w-full gap-2 whitespace-normal px-3 py-1 text-sm"
                  render={
                    <button
                      type="button"
                      disabled={disabled}
                      aria-label={t("Edit {name}", { name: child.name })}
                      onClick={() =>
                        setEditor({
                          kind: "child",
                          dimensionId: dimension.id,
                          childId: child.id,
                        })
                      }
                    />
                  }
                >
                  {child.name}
                  <Pencil
                    className="shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
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
          title={
            editor.kind === "dimension"
              ? t(editedDimension ? "Edit dimension" : "Add dimension")
              : t(editedChild ? "Edit subdimension" : "Add subdimension")
          }
          initialName={
            editor.kind === "dimension"
              ? (editedDimension?.name ?? "")
              : (editedChild?.name ?? "")
          }
          names={
            editor.kind === "dimension"
              ? dimensions
                  .filter((dimension) => dimension.id !== editor.dimensionId)
                  .map((dimension) => dimension.name)
              : (editedDimension?.children
                  .filter((child) => child.id !== editor.childId)
                  .map((child) => child.name) ?? [])
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
