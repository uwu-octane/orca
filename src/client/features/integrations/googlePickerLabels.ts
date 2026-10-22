import type { GoogleLinkProvider } from "@/shared/google-link";

export function googlePickerLabels(provider: GoogleLinkProvider) {
  return provider === "google_ads"
    ? {
        save: "Save advertising account",
        choose: "Choose advertising account",
        select: "Select an advertising account…",
        items: "Advertising accounts",
        search: "Search advertising or Google accounts",
        searchPlaceholder: "Search advertising or Google accounts…",
        loading: "Loading advertising accounts…",
        error: "Couldn't load advertising accounts.",
        noMatches: "No matching advertising accounts",
        add: "Add a Google account to find advertising accounts.",
      }
    : {
        save: "Save property",
        choose: "Choose property",
        select: "Select a property…",
        items: "Google properties",
        search: "Search properties or accounts",
        searchPlaceholder: "Search properties or accounts…",
        loading: "Loading properties…",
        error: "Couldn't load properties.",
        noMatches: "No matching properties or accounts",
        add: "Add a Google account to find properties.",
      };
}
