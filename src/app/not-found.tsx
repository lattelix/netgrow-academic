import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold">Страница не найдена</h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        Проверьте адрес или вернитесь на главную страницу системы.
      </p>
      <Link
        href="/"
        className="mt-4 inline-flex items-center justify-center rounded-[8px] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)]"
      >
        На главную
      </Link>
    </div>
  );
}
