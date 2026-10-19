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
          ? "Your organization has used its credits."
          : "Your organization is running low on credits."}{" "}
        Ask your organization owner to add more.
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
            You&rsquo;ve used your free credits. {creditsActionLink} to get $
            {BASE_PLAN_OFFER.monthlyCreditsUsd} of credits every month.
          </>
        ) : (
          <>
            You&rsquo;ve used this month&rsquo;s credits. {creditsActionLink} to
            keep going
            {refillDate ? `, or wait for them to refill on ${refillDate}` : ""}
            {t(".")}
          </>
        )}
      </AppBanner>
    );
  }

  if (isLowCredits) {
    return (
      <AppBanner variant="warning">
        You&rsquo;re running low on credits. {creditsActionLink}{" "}
        {t("to keep using Orca.")}
      </AppBanner>
    );
  }

  if (isFreePlan) {
    return (
      <AppBanner variant="info">
        We hope you&rsquo;re enjoying Orca!{" "}
        <Link
          to={SUBSCRIBE_ROUTE}
          search={{ upgrade: true }}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("Upgrade anytime")}
        </Link>{" "}
        {"or"}{" "}
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
