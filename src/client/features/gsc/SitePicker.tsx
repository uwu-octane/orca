import { GoogleGlyph } from "@/client/features/gsc/GoogleGlyph";
import { startGoogleLink } from "@/client/features/integrations/startGoogleLink";
import { useLocale } from "@/plugins/client/context";

type SiteOption = {
  siteUrl: string;
  permissionLevel: string;
  selectable: boolean;
  isSelected: boolean;
};

type AccountOption = {
  accountId: string;
  email: string | null;
  requiresReconnect: boolean;
  sites: SiteOption[];
};

export type GscSiteSelection = {
  accountId: string;
  siteUrl: string;
};

type SecondaryAction = {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

/**
 * Verified-property selector for connected Google accounts. Shared by the
 * Integrations card and the onboarding step. `secondaryAction` is optional —
 * omit it where there's nothing to cancel/disconnect (e.g. onboarding).
 */
export function SitePicker({
  loading,
  error,
  accounts,
  selection,
  onSelect,
  onSave,
  saving,
  onRetry,
  onReconnect,
  secondaryAction,
}: {
  loading: boolean;
  error: boolean;
  accounts: AccountOption[];
  selection: GscSiteSelection | null;
  onSelect: (selection: GscSiteSelection) => void;
  onSave: () => void;
  saving: boolean;
  onRetry: () => void;
  onReconnect: () => void;
  secondaryAction?: SecondaryAction;
}) {
  const { t } = useLocale();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-base-content/50">
        <span className="loading loading-spinner loading-sm" />
        {t("Loading properties…")}
      </div>
    );
  }
  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-error">
          {t("Couldn't load your Search Console properties.")}
        </p>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onRetry}
        >
          {t("Try again")}
        </button>
      </div>
    );
  }

  const allAccountsRequireReconnect =
    accounts.length > 0 &&
    accounts.every((account) => account.requiresReconnect);
  if (allAccountsRequireReconnect) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-error">
          {t("Connection expired. Reconnect to continue.")}
        </p>
        <button
          type="button"
          onClick={onReconnect}
          className="inline-flex items-center gap-2.5 rounded-lg border border-base-300 bg-base-100 px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:bg-base-200"
        >
          <GoogleGlyph className="size-[18px]" />
          {t("Reconnect with Google")}
        </button>
      </div>
    );
  }

  const healthyAccounts = accounts.filter(
    (account) => !account.requiresReconnect,
  );
  const options = healthyAccounts.flatMap((account) =>
    account.sites.map((site) => ({
      accountId: account.accountId,
      siteUrl: site.siteUrl,
    })),
  );
  const selectedIndex = selection
    ? options.findIndex(
        (option) =>
          option.accountId === selection.accountId &&
          option.siteUrl === selection.siteUrl,
      )
    : -1;

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-base-content/80">
          {t("Property")}
        </span>
        <select
          className="select select-bordered w-full max-w-md"
          value={selectedIndex >= 0 ? String(selectedIndex) : ""}
          onChange={(event) => {
            const option = options[Number(event.target.value)];
            if (option) onSelect(option);
          }}
        >
          <option value="" disabled>
            {t("Select a property…")}
          </option>
          {healthyAccounts.map((account) => (
            <optgroup
              key={account.accountId}
              label={account.email ?? t("Google account")}
            >
              {account.sites.length === 0 ? (
                <option disabled>{t("No properties")}</option>
              ) : (
                account.sites.map((site) => {
                  const index = options.findIndex(
                    (option) =>
                      option.accountId === account.accountId &&
                      option.siteUrl === site.siteUrl,
                  );
                  return (
                    <option
                      key={site.siteUrl}
                      value={index}
                      disabled={!site.selectable}
                    >
                      {site.siteUrl}
                      {site.selectable ? "" : `  (${t("no access")})`}
                    </option>
                  );
                })
              )}
            </optgroup>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onSave}
          disabled={selectedIndex < 0 || saving}
        >
          {saving ? t("Saving…") : t("Save property")}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => void startGoogleLink("gsc", window.location.href)}
        >
          {t("Connect another Google account")}
        </button>
        {secondaryAction ? (
          <button
            type="button"
            className={[
              "btn btn-ghost btn-sm",
              secondaryAction.destructive ? "text-error hover:bg-error/10" : "",
            ].join(" ")}
            onClick={secondaryAction.onClick}
            disabled={secondaryAction.disabled}
          >
            {t(secondaryAction.label)}
          </button>
        ) : null}
      </div>
    </div>
  );
}
