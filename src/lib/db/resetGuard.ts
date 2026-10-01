const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

export function assertLocalTestDatabaseUrl(
  databaseUrl: string,
  expectedDatabase: "netgrow_test" | "netgrow_e2e"
): void {
  const url = new URL(databaseUrl);
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !LOCAL_HOSTNAMES.has(hostname) ||
    decodeURIComponent(url.pathname) !== `/${expectedDatabase}`
  ) {
    throw new Error(`Tests require the disposable local database ${expectedDatabase}.`);
  }
}

/**
 * `db:reset` and `db:seed` run destructive DELETE/DROP statements. Require an
 * explicit opt-in so they can never run by accident (and never as part of a
 * build or deploy). Non-localhost targets need a second, separate opt-in.
 */
export function assertDestructiveResetAllowed(databaseUrl: string): void {
  if (process.env.ALLOW_DB_RESET !== "1") {
    throw new Error(
      "Сброс базы данных заблокирован. Установите ALLOW_DB_RESET=1, если вы точно хотите очистить данные в этой базе."
    );
  }

  const hostname = new URL(databaseUrl).hostname.replace(/^\[|\]$/g, "");
  const isLocal = LOCAL_HOSTNAMES.has(hostname);
  if (!isLocal && process.env.ALLOW_REMOTE_DB_RESET !== "1") {
    throw new Error(
      `Отказ: ${hostname} не похож на локальный адрес. Для сброса удалённой базы данных дополнительно установите ALLOW_REMOTE_DB_RESET=1.`
    );
  }
}
