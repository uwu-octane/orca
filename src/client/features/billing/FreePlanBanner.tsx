// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { Link } from "@tanstack/react-router";
import { AppBanner } from "@/client/layout/AppBanner";
import { BASE_PLAN_OFFER } from "@/client/features/billing/plan-offers";
import { useCreditBalance } from "@/client/features/billing/useCreditBalance";
import { useCanManageBilling } from "@/client/features/team/organizationQueries";
import { BILLING_ROUTE, SUBSCRIBE_ROUTE } from "@/shared/billing";

export function FreePlanBanner() {
  const { t } = useLocale();

  const { accountQuery, isFreePlan, isOutOfCredits, isLowCredits, refillDate } =
    useCreditBalance();
  const canManageBilling = useCanManageBilling();

  if (!accountQuery.data) {
    return null;
  }

  // Only the owner can change the plan or buy credits, so a link would lead
  // everyone else to a page where they can't act.
  if (!canManageBilling && (isOutOfCredits || isLowCredits)) {
    return (
      <AppBanner variant={isOutOfCredits ? "destructive" : "warning"}>
        {isOutOfCredits
          ? t("Your organization has used its credits.")
          : t("Your organization is running low on credits.")}{" "}
        {t("Ask your organization owner to add more.")}
      </AppBanner>
    );
  }

  const creditsActionLink = isFreePlan ? (
    <Link
      to={SUBSCRIBE_ROUTE}
      search={{ upgrade: true }}
      className="font-medium text-primary underline-offset-4 hover:underline"
    >
      {t("Upgrade your plan")}
    </Link>
  ) : (
    <Link
      to={BILLING_ROUTE}
      className="font-medium text-primary underline-offset-4 hover:underline"
    >
      {t("Buy more credits")}
    </Link>
  );

  if (isOutOfCredits) {
    return (
      <AppBanner variant="destructive">
        {isFreePlan ? (
          <>
            {t("You've used your free credits.")} {creditsActionLink}{" "}
            {t("to get ${amount} of credits every month.", {
              amount: BASE_PLAN_OFFER.monthlyCreditsUsd,
            })}
          </>
        ) : (
          <>
            {t("You've used this month's credits.")} {creditsActionLink}{" "}
            {t("to keep going")}
            {refillDate
              ? t(", or wait for them to refill on {date}", {
                  date: refillDate,
                })
              : ""}
            {t(".")}
          </>
        )}
      </AppBanner>
    );
  }

  if (isLowCredits) {
    return (
      <AppBanner variant="warning">
        {t("You're running low on credits.")} {creditsActionLink}{" "}
        {t("to keep using Orca.")}
      </AppBanner>
    );
  }

  if (isFreePlan) {
    return (
      <AppBanner variant="info">
        {t("We hope you're enjoying Orca!")}{" "}
        <Link
          to={SUBSCRIBE_ROUTE}
          search={{ upgrade: true }}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("Upgrade anytime")}
        </Link>{" "}
        {t("or")}{" "}
        <Link
          to="/support"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("reach out with questions")}
        </Link>
        {t(".")}
      </AppBanner>
    );
  }

  return null;
}
