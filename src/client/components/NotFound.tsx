import { useLocale } from "@/plugins/client/context";

export function NotFound({ children }: { children?: React.ReactNode }) {
  const { t } = useLocale();

  return (
    <div className="space-y-2 p-4">
      <h1 className="text-2xl">404</h1>
      <div className="text-base-content/70">
        {children || <p>{t("The page you are looking for does not exist.")}</p>}
      </div>
    </div>
  );
}
