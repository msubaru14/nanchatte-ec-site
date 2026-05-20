import styles from "./Home.module.css";

type HealthResponse = {
  data?: {
    status?: string;
  };
  error?: unknown;
};

const apiBaseUrl =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

async function getBackendStatus() {
  try {
    const response = await fetch(`${apiBaseUrl}/api/health`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return "unreachable";
    }

    const json = (await response.json()) as HealthResponse;
    return json.data?.status ?? "unknown";
  } catch {
    return "unreachable";
  }
}

export default async function Home() {
  const backendStatus = await getBackendStatus();

  return (
    <section className={styles.shell} aria-labelledby="app-title">
      <div className={styles.panel}>
        <p className={styles.eyebrow}>Development Environment</p>
        <h1 className={styles.title} id="app-title">
          なんちゃってECサイト
        </h1>
        <dl className={styles.statusGrid}>
          <div className={styles.statusItem}>
            <dt className={styles.statusLabel}>Frontend</dt>
            <dd className={styles.statusValue}>ok</dd>
          </div>
          <div className={styles.statusItem}>
            <dt className={styles.statusLabel}>Backend</dt>
            <dd className={styles.statusValue}>{backendStatus}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
