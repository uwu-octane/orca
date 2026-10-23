import { useSyncExternalStore } from "react";
import { useClientService } from "@/plugins/client/context";

const noSubscription = () => () => {};
const notOptedIn = () => false;
export function useSamBetaOptIn() {
  const { service } = useClientService("samUi");
  const beta = service?.beta;
  const optedIn = useSyncExternalStore(
    beta?.subscribe ?? noSubscription,
    beta?.read ?? notOptedIn,
    notOptedIn,
  );
  return { optedIn, optIn: () => beta?.optIn() };
}
