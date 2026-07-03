"use client";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  console.error("[app/error]", error);

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 py-10 text-center">
      <h1 className="text-[20px] font-semibold text-foreground">Something went wrong</h1>
      <p className="mt-2 text-[13px] leading-5 text-muted">
        We hit an unexpected error while loading this page.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded-full bg-primary px-5 py-2.5 text-[13px] font-semibold text-primary-foreground"
      >
        Try again
      </button>
    </main>
  );
}
