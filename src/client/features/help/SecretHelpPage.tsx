// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import type { ReactNode } from "react";
import { CopyButton } from "@/client/components/CopyButton";
import { PageHeader } from "@/client/components/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { Separator } from "@/client/components/ui/separator";

export const helpLinkClassName =
  "font-medium text-primary underline underline-offset-4";

/** A terminal command with a copy button. */
export function CommandBlock({ command }: { command: string }) {
  const { t } = useLocale();

  return (
    <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-muted p-3">
      <pre className="min-w-0 flex-1 overflow-x-auto text-xs">
        <code>{command}</code>
      </pre>
      <CopyButton
        value={command}
        successMessage={t("Command copied")}
        label={t("Copy command")}
        variant="ghost"
        size="icon-xs"
      />
    </div>
  );
}

/** Self-hosting instructions for setting one secret. */
export function SecretHelpPage({
  title,
  intro,
  secretName,
  steps,
  dashboardPasteStep,
  terminalPromptHint,
}: {
  title: string;
  intro: ReactNode;
  secretName: string;
  /** The `<li>` items of the "Steps" card. */
  steps: ReactNode;
  dashboardPasteStep: ReactNode;
  terminalPromptHint: ReactNode;
}) {
  const { t } = useLocale();

  return (
    <div className="h-full overflow-auto px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <PageHeader title={title} description={intro} />

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>{t("Steps")}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-3 pl-5">{steps}</ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>{t("Cloudflare Workers (Dashboard UI)")}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                {t("In Cloudflare, go to")} <code>{t("Compute")}</code> -&gt;{" "}
                <code>Workers &amp; Pages</code>{" "}
                {t("and open your Orca Worker.")}
              </li>
              <li>
                {t("Open")} <code>{t("Settings")}</code>
                {t(".")}
              </li>
              <li>
                {t("Go to")} <code>{t("Variables & Secrets")}</code>{" "}
                {t("and add a new secret named")} <code>{secretName}</code>
                {t(".")}
              </li>
              <li>{dashboardPasteStep}</li>
            </ol>

            <Separator />

            <div>
              <p>{t("Or set the same secret from your terminal with:")}</p>
              <CommandBlock command={`npx wrangler secret put ${secretName}`} />
            </div>
            <p className="text-muted-foreground">{terminalPromptHint}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
