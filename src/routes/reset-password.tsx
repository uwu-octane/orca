import { useForm } from "@tanstack/react-form";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  AuthPageCard,
  AuthPageShell,
  authRedirectSearchSchema,
} from "@/client/features/auth/AuthPage";
import { getFieldError, getFormError } from "@/client/lib/forms";
import { authClient } from "@/lib/auth-client";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { getSignInSearch, normalizeAuthRedirect } from "@/lib/auth-redirect";
import {
  HOSTED_PASSWORD_MAX_LENGTH,
  HOSTED_PASSWORD_MIN_LENGTH,
} from "@/lib/auth-options";
// FORK: locale plugin — reset password copy translates via the plugin tree.
import { useLocale } from "@/plugins/client/context";
import type { T } from "@/plugins/locale";
import { z } from "zod";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(
        HOSTED_PASSWORD_MIN_LENGTH,
        `Password must be at least ${HOSTED_PASSWORD_MIN_LENGTH} characters.`,
      )
      .max(
        HOSTED_PASSWORD_MAX_LENGTH,
        `Password must be at most ${HOSTED_PASSWORD_MAX_LENGTH} characters.`,
      ),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

const resetPasswordSearchSchema = authRedirectSearchSchema.extend({
  error: z.string().optional(),
  token: z.string().optional(),
});

export const Route = createFileRoute("/reset-password")({
  validateSearch: resetPasswordSearchSchema,
  component: ResetPasswordPage,
});

function getResetPasswordErrorMessage(error: string | undefined, t: T) {
  switch ((error ?? "").toLowerCase()) {
    case "invalid_token":
      return t(
        "This reset link is no longer valid. Request a new one to keep going.",
      );
    case "token_expired":
      return t("This reset link has expired. Request a new one to keep going.");
    default:
      return error
        ? t(
            "This reset link can't be used anymore. Request a new one and try again.",
          )
        : null;
  }
}

function getResetPasswordPageCopy(
  {
    isHostedMode,
    isComplete,
    routeError,
    hasToken,
  }: {
    isHostedMode: boolean;
    isComplete: boolean;
    routeError: string | null;
    hasToken: boolean;
  },
  t: T,
) {
  if (!isHostedMode) {
    return {
      title: t("Reset password"),
      helperText: t("Password reset isn't available right now."),
    };
  }

  if (isComplete) {
    return {
      title: t("Password updated"),
      helperText: t(
        "Your password has been updated. Sign in with your new password.",
      ),
    };
  }

  if (routeError || !hasToken) {
    return {
      title: t("Reset link expired"),
      helperText:
        routeError ||
        t(
          "This reset link is no longer valid. Request a new one to keep going.",
        ),
    };
  }

  return {
    title: t("Reset password"),
    helperText: t("Choose a new password for your account."),
  };
}

function ResetPasswordPage() {
  const { t } = useLocale();
  const search = Route.useSearch();
  const redirectTo = normalizeAuthRedirect(search.redirect);
  const isHostedMode = isHostedClientAuthMode();
  const routeError = getResetPasswordErrorMessage(search.error, t);
  const token = typeof search.token === "string" ? search.token : null;
  const form = useForm({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    validators: {
      onSubmit: resetPasswordSchema,
    },
    onSubmit: async ({ formApi, value }) => {
      if (!token) {
        formApi.setErrorMap({
          onSubmit: {
            form: t(
              "This reset link is no longer valid. Request a new one and try again.",
            ),
            fields: {},
          },
        });
        return;
      }

      try {
        const result = await authClient.resetPassword({
          newPassword: value.password,
          token,
        });

        if (result.error) {
          formApi.setErrorMap({
            onSubmit: {
              form: t(
                "This reset link is no longer valid. Request a new one and try again.",
              ),
              fields: {},
            },
          });
          return;
        }
      } catch {
        formApi.setErrorMap({
          onSubmit: {
            form: t(
              "We couldn't update your password right now. Please try again.",
            ),
            fields: {},
          },
        });
      }
    },
  });

  return (
    <AuthPageShell>
      <form.Subscribe
        selector={(state) => ({
          isComplete: state.isSubmitSuccessful && !state.errorMap.onSubmit,
          submitError: state.errorMap.onSubmit,
          isSubmitting: state.isSubmitting,
        })}
      >
        {({ isComplete, submitError, isSubmitting }) => {
          const errorMessage = getFormError(submitError);
          const pageCopy = getResetPasswordPageCopy(
            {
              isHostedMode,
              isComplete,
              routeError,
              hasToken: !!token,
            },
            t,
          );

          return (
            <AuthPageCard
              title={pageCopy.title}
              helperText={pageCopy.helperText}
              footer={
                <p className="text-sm">
                  <Link
                    to="/sign-in"
                    search={getSignInSearch(redirectTo)}
                    className="text-base-content/50 hover:text-base-content transition-colors"
                  >
                    {t("Sign in")}
                  </Link>
                </p>
              }
            >
              {!isHostedMode ? null : isComplete ? (
                <a
                  href={
                    redirectTo === "/"
                      ? "/sign-in"
                      : `/sign-in?redirect=${encodeURIComponent(redirectTo)}`
                  }
                  className="btn btn-soft w-full"
                >
                  {t("Continue to sign in")}
                </a>
              ) : routeError || !token ? (
                <Link
                  to="/forgot-password"
                  search={getSignInSearch(redirectTo)}
                  className="btn btn-soft w-full"
                >
                  {t("Request a new reset link")}
                </Link>
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void form.handleSubmit();
                  }}
                >
                  <form.Field name="password">
                    {(field) => {
                      const error = getFieldError(field.state.meta.errors);

                      return (
                        <div>
                          <input
                            type="password"
                            className="input input-bordered w-full"
                            placeholder={t("New password...")}
                            value={field.state.value}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            autoComplete="new-password"
                            minLength={HOSTED_PASSWORD_MIN_LENGTH}
                            maxLength={HOSTED_PASSWORD_MAX_LENGTH}
                            required
                          />
                          {error ? (
                            <p className="mt-1 text-sm text-error">{error}</p>
                          ) : null}
                        </div>
                      );
                    }}
                  </form.Field>

                  <form.Field name="confirmPassword">
                    {(field) => {
                      const error = getFieldError(field.state.meta.errors);

                      return (
                        <div>
                          <input
                            type="password"
                            className="input input-bordered w-full"
                            placeholder={t("Confirm new password...")}
                            value={field.state.value}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            autoComplete="new-password"
                            minLength={HOSTED_PASSWORD_MIN_LENGTH}
                            maxLength={HOSTED_PASSWORD_MAX_LENGTH}
                            required
                          />
                          {error ? (
                            <p className="mt-1 text-sm text-error">{error}</p>
                          ) : null}
                        </div>
                      );
                    }}
                  </form.Field>

                  {errorMessage ? (
                    <p className="text-sm text-error">{errorMessage}</p>
                  ) : null}
                  <button
                    className="btn btn-soft w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? t("Updating password...")
                      : t("Update password")}
                  </button>
                </form>
              )}
            </AuthPageCard>
          );
        }}
      </form.Subscribe>
    </AuthPageShell>
  );
}
