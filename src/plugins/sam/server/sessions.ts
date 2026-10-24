import { waitUntil } from "cloudflare:workers";
import { AppError } from "@/server/lib/errors";
import { captureServerEvent } from "@/server/lib/posthog";
import { ProjectRepository } from "@/server/features/projects/repositories/ProjectRepository";
import { resolveUserContextFromHeaders } from "@/middleware/ensure-user/resolve";
import { isHostedServerAuthMode } from "@/server/lib/runtime-env";
import { getOrCreateOrganizationCustomer } from "@/server/billing/subscription";
import { SamSessionRepository } from "./SamSessionRepository";
import type {
  SamProjectScope,
  SamUserScope,
  SamSessionSummary,
} from "../contracts";

export function createSessions(signal: AbortSignal) {
  async function requireProject(scope: SamProjectScope) {
    signal.throwIfAborted();
    const project = await ProjectRepository.getProjectForOrganization(
      scope.projectId,
      scope.organizationId,
    );
    if (!project) throw new AppError("NOT_FOUND");
    return project;
  }

  async function authorizedSession(id: string, scope: SamUserScope) {
    signal.throwIfAborted();
    const session = await SamSessionRepository.getActiveSession(
      id,
      scope.userId,
    );
    const project = session
      ? await ProjectRepository.getProjectForOrganization(
          session.projectId,
          scope.organizationId,
        )
      : null;
    return session && project ? { session, project } : null;
  }

  async function list(scope: SamProjectScope): Promise<SamSessionSummary[]> {
    await requireProject(scope);
    return SamSessionRepository.listSessionsForProject(
      scope.projectId,
      scope.userId,
    );
  }

  async function create(scope: SamProjectScope) {
    await requireProject(scope);
    signal.throwIfAborted();
    const session = await SamSessionRepository.createSession(scope);
    if (!session)
      throw new AppError("INTERNAL_ERROR", "Failed to create chat session");
    waitUntil(
      captureServerEvent({
        distinctId: scope.userId,
        event: "sam:session_create",
        organizationId: scope.organizationId,
        properties: { project_id: scope.projectId, session_id: session.id },
      }),
    );
    return { id: session.id };
  }

  async function archive(id: string, scope: SamUserScope) {
    const identity = await authorizedSession(id, scope);
    if (!identity) throw new AppError("NOT_FOUND", "Chat session not found");
    signal.throwIfAborted();
    await SamSessionRepository.archiveSession(id);
    waitUntil(
      captureServerEvent({
        distinctId: scope.userId,
        event: "sam:session_archive",
        organizationId: scope.organizationId,
        properties: { project_id: identity.project.id, session_id: id },
      }),
    );
    return { ok: true };
  }

  /** Both HTTP history and WebSocket upgrades authorize before reaching the DO. */
  async function authorizeConnection(
    request: Request,
    sessionId: string,
  ): Promise<Response | undefined> {
    signal.throwIfAborted();
    let context;
    try {
      context = await resolveUserContextFromHeaders(request.headers);
    } catch {
      return new Response("Unauthorized", { status: 401 });
    }
    if (!(await authorizedSession(sessionId, context)))
      return new Response("Forbidden", { status: 403 });
    // Establish the hosted organization's free-plan allowance before the turn gate.
    if (await isHostedServerAuthMode())
      await getOrCreateOrganizationCustomer(context);
    return undefined;
  }

  return { list, create, archive, authorizeConnection };
}
