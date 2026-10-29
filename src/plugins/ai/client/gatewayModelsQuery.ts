import { queryOptions } from "@tanstack/react-query";
import { getGatewayModels } from "@/serverFunctions/gatewayModels";

export function gatewayModelsQuery(projectId: string) {
  return queryOptions({
    queryKey: ["gateway-models", projectId],
    queryFn: () => getGatewayModels({ data: { projectId } }),
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
