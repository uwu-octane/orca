import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  KeyRound,
  Pencil,
  RefreshCw,
  Trash2,
  Settings2,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/plugins/client/context";
import { CardShell } from "@/client/components/CardShell";
import { QueryState } from "@/client/components/QueryState";
import { PermissionHint } from "@/client/components/PermissionHint";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { FormDialog } from "@/client/components/FormDialog";
import { RowActionsMenu } from "@/client/components/RowActionsMenu";
import { Button } from "@/client/components/ui/button";
import { DropdownMenuItem } from "@/client/components/ui/dropdown-menu";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/client/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import {
  getAiProviderConfig,
  removeAiProviderConfig,
  saveAiProviderConfig,
} from "@/serverFunctions/aiProviders";
import {
  aiProviderSchema,
  AI_PROVIDERS,
  type AiProvider,
  type AiProviderConfigSummary,
} from "@/types/schemas/ai-provider";
import { DecisionTest } from "./DecisionTest";
import { AiProviderConfigDialog } from "./AiProviderConfigDialog";
import { GatewayModelList } from "./GatewayModelList";

export function AiProviderSettings({ projectId }: { projectId: string }) {
  const { t } = useLocale();
  return (
    <CardShell title={t("AI providers")}>
      <Tabs defaultValue="vercel_gateway">
        <TabsList variant="line" className="mb-4">
          {Object.entries(AI_PROVIDERS).map(([provider, info]) => (
            <TabsTrigger key={provider} value={provider}>
              {t(info.label)}
            </TabsTrigger>
          ))}
        </TabsList>
        {aiProviderSchema.options.map((provider) => (
          <TabsContent key={provider} value={provider} className="space-y-8">
            <ProviderConnection
              key={`${projectId}:${provider}`}
              projectId={projectId}
              provider={provider}
            />
            {provider === "vercel_gateway" && (
              <GatewayModelList projectId={projectId} />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </CardShell>
  );
}

function ProviderConnection({
  projectId,
  provider,
}: {
  projectId: string;
  provider: AiProvider;
}) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const queryKey = ["ai-provider-config", projectId, provider];
  const query = useQuery({
    queryKey,
    queryFn: () => getAiProviderConfig({ data: { projectId, provider } }),
  });
  return (
    <QueryState
      query={query}
      errorFallback={t("Couldn't load AI provider settings.")}
    >
      {({ config, canManage }) => (
        <ProviderKeyList
          projectId={projectId}
          provider={provider}
          config={config}
          canManage={canManage}
          onSaved={() => queryClient.invalidateQueries({ queryKey })}
        />
      )}
    </QueryState>
  );
}

function ProviderKeyList({
  projectId,
  provider,
  config,
  canManage,
  onSaved,
}: {
  projectId: string;
  provider: AiProvider;
  config: AiProviderConfigSummary | null;
  canManage: boolean;
  onSaved: () => Promise<void>;
}) {
  const { t, active: locale } = useLocale();
  const [editing, setEditing] = useState<
    "key" | "rename" | "connection" | null
  >(null);
  const [removing, setRemoving] = useState(false);
  const [testing, setTesting] = useState(false);
  const remove = useMutation({
    mutationFn: async () => {
      if (!config) return;
      if (provider === "systemone" && config.hasApiKey) {
        await saveAiProviderConfig({
          data: {
            projectId,
            provider,
            endpoint: config.endpoint,
            timeoutMs: config.timeoutMs,
            revision: config.revision,
            credential: { action: "clear" },
          },
        });
      } else {
        await removeAiProviderConfig({
          data: { projectId, provider, revision: config.revision },
        });
      }
    },
    onSuccess: async () => {
      setRemoving(false);
      await onSaved();
      toast.success(t("Provider removed"));
    },
    retry: false,
  });
  const formatTime = (value: string | null) =>
    value
      ? new Date(value).toLocaleString(locale === "zh" ? "zh-CN" : "en-US")
      : "—";
  const name = config?.keyName ?? t(AI_PROVIDERS[provider].label);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium">{t("API key")}</h3>
        <div className="flex flex-wrap gap-2">
          {config && !config.hasApiKey && (
            <Button variant="outline" onClick={() => setTesting(true)}>
              <Play />
              {t("Test decision")}
            </Button>
          )}
          {canManage && (
            <>
              {config && !config.hasApiKey && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    remove.reset();
                    setRemoving(true);
                  }}
                >
                  <Trash2 />
                  {t("Remove connection")}
                </Button>
              )}
              {(config || provider === "systemone") && (
                <Button
                  variant="outline"
                  onClick={() => setEditing("connection")}
                >
                  <Settings2 />
                  {t("Connection settings")}
                </Button>
              )}
              {!config?.hasApiKey && (
                <Button onClick={() => setEditing("key")}>
                  <KeyRound />
                  {t("Add API key")}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Name")}</TableHead>
              <TableHead>{t("Key")}</TableHead>
              <TableHead>{t("Added")}</TableHead>
              <TableHead>{t("Last used")}</TableHead>
              <TableHead className="w-10">
                <span className="sr-only">{t("Actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {config?.hasApiKey ? (
              <TableRow>
                <TableCell className="font-medium">{name}</TableCell>
                <TableCell
                  className="font-mono text-xs text-muted-foreground"
                  data-ph-mask
                >
                  ••••{config.keyLastFour}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatTime(config.keyAddedAt)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatTime(config.lastUsedAt)}
                </TableCell>
                <TableCell>
                  <RowActionsMenu label={t("Actions for {name}", { name })}>
                    <DropdownMenuItem onClick={() => setTesting(true)}>
                      <Play />
                      {t("Test decision")}
                    </DropdownMenuItem>
                    {canManage && (
                      <>
                        <DropdownMenuItem onClick={() => setEditing("rename")}>
                          <Pencil />
                          {t("Rename key")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditing("key")}>
                          <RefreshCw />
                          {t("Replace key")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => {
                            remove.reset();
                            setRemoving(true);
                          }}
                        >
                          <Trash2 />
                          {t("Remove key")}
                        </DropdownMenuItem>
                      </>
                    )}
                  </RowActionsMenu>
                </TableCell>
              </TableRow>
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  {t("No API key added")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableCard>
      {!canManage && <PermissionHint action={t("configure AI providers")} />}
      {editing && (
        <AiProviderConfigDialog
          projectId={projectId}
          provider={provider}
          config={config}
          mode={editing}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}
      {testing && (
        <FormDialog
          title={t("Test decision")}
          onClose={() => {
            setTesting(false);
            void onSaved();
          }}
          actions={null}
        >
          <DecisionTest projectId={projectId} provider={provider} />
        </FormDialog>
      )}
      {removing && (
        <ConfirmDialog
          title={t("Remove “{name}”?", { name })}
          confirmLabel={t(
            config?.hasApiKey ? "Remove key" : "Remove connection",
          )}
          destructive
          pending={remove.isPending}
          onClose={() => setRemoving(false)}
          onConfirm={() => remove.mutate()}
        >
          {config?.hasApiKey
            ? t(
                "This removes the key from Orca. Revoke it at the provider to make it invalid elsewhere.",
              )
            : t("Requests through this connection will stop.")}
          {remove.error && (
            <span role="alert" className="mt-2 block text-destructive">
              {getStandardErrorMessage(remove.error, undefined, t)}
            </span>
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}
