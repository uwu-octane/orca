import { translate } from "@/plugins/locale";
import { toast } from "sonner";
import { getStandardErrorMessage } from "@/client/lib/error-messages";

/** Tells the user whether saving a website started its first site scan. */
export function toastInitialAudit(
  initialAudit:
    | { status: "started" | "pending" }
    | { status: "unavailable"; code: string }
    | null,
) {
  if (initialAudit?.status === "unavailable")
    toast.warning(translate("Website saved. The first scan could not start."), {
      description: getStandardErrorMessage(
        new Error(initialAudit.code),
        undefined,
        translate,
      ),
    });
  else if (initialAudit?.status === "started")
    toast.success(translate("Your 50-page site scan is running"));
}
