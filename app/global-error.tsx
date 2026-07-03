"use client";

type GlobalErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalErrorPage({ error, reset }: GlobalErrorPageProps) {
  console.error("[app/global-error]", error);

  return (
    <html lang="en">
      <body className="bg-[#FAF9F7] font-sans text-[#0B0B0B] antialiased">
        <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10 text-center">
          <h1 className="text-[20px] font-semibold">AhiaUlo hit a critical error</h1>
          <p className="mt-2 text-[13px] leading-5 text-[#666]">
            The app could not recover automatically. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-5 rounded-full bg-[#7ED9AE] px-5 py-2.5 text-[13px] font-semibold text-[#0B0B0B]"
          >
            Reload app
          </button>
        </main>
      </body>
    </html>
  );
}
