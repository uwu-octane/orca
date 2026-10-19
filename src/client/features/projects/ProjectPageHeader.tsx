// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { useQuery } from "@tanstack/react-query";
import { BackLink, PageHeader } from "@/client/components/PageHeader";
import { projectsQueryOptions } from "./projectQueries";

export function ProjectPageHeader({
  projectId,
  title,
  showBackLink = false,
}: {
  projectId: string;
  title: string;
  showBackLink?: boolean;
}) {
  const { t } = useLocale();

  const projectsQuery = useQuery(projectsQueryOptions());
  const project = projectsQuery.data?.find((entry) => entry.id === projectId);

  return (
    <PageHeader
      title={title}
      description={project?.name ?? " "}
      backLink={
        showBackLink ? (
          <BackLink to="/projects">{t("Projects")}</BackLink>
        ) : undefined
      }
    />
  );
}
