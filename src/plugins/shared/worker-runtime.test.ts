import { convertV4MiniflareOptions, Miniflare } from "miniflare";
import { expect, it } from "vitest";

// Plugin services are initialized lazily in one request and reused in others.
// Node's AbortController cannot detect the older workerd request-affinity bug.
it("supports a plugin lifetime across requests, including cancellation of active I/O", async () => {
  let markStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    markStarted = resolve;
  });
  let finishUpstream: (() => void) | undefined;
  const runtime = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      compatibilityDate: "2025-09-02",
      compatibilityFlags: ["nodejs_compat"],
      script: `
      let lifetime;
      export default {
        async fetch(request, env) {
          const path = new URL(request.url).pathname;
          if (path === "/install") {
            lifetime = new AbortController();
            return new Response("installed");
          }
          if (path === "/dispose") {
            lifetime.abort(new Error("plugin removed"));
            return new Response("disposed");
          }
          lifetime.signal.throwIfAborted();
          if (path === "/work") {
            try {
              await env.UPSTREAM.fetch("https://upstream.test/", {
                signal: lifetime.signal,
              });
              return new Response("completed");
            } catch {
              return new Response(lifetime.signal.aborted ? "canceled" : "failed");
            }
          }
          return new Response("active");
        },
      };
    `,
      serviceBindings: {
        UPSTREAM: () => {
          markStarted();
          return new Promise<Response>((resolve) => {
            finishUpstream = () => resolve(new Response("completed"));
          });
        },
      },
    }),
  );
  try {
    await (await runtime.dispatchFetch("https://test.local/install")).text();
    for (let i = 0; i < 2; i++) {
      expect(
        await (await runtime.dispatchFetch("https://test.local/read")).text(),
      ).toBe("active");
    }
    const pending = runtime.dispatchFetch("https://test.local/work");
    await started;
    expect(
      await (await runtime.dispatchFetch("https://test.local/dispose")).text(),
    ).toBe("disposed");
    expect(await (await pending).text()).toBe("canceled");
  } finally {
    finishUpstream?.();
    await runtime.dispose();
  }
}, 15_000);
