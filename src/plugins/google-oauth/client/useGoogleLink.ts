import { useSyncExternalStore } from "react";
import { useClientService } from "@/plugins/client/context";
import type { GoogleLinkProvider } from "@/shared/google-link";

/** React binding to the installed connection plugin's shared redirect state. */
export function useGoogleLink() {
  const { service } = useClientService("googleConnections");
  const pending = useSyncExternalStore(
    (listener) => (service ? service.link.subscribe(listener) : () => {}),
    () => service?.link.pending ?? true,
    () => true,
  );
  return {
    pending,
    available: Boolean(service),
    startGoogleLink: (provider: GoogleLinkProvider, callbackURL: string) => {
      if (!service) throw new Error("Google connection plugin is not active");
      return service.link.start(provider, callbackURL);
    },
  };
}
