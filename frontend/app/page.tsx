type HealthResponse = {
  data?: {
    status?: string;
  };
  error?: unknown;
};

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

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
    <main className="shell">
      <section className="panel" aria-labelledby="app-title">
        <p className="eyebrow">Development Environment</p>
        <h1 id="app-title">なんちゃってECサイト</h1>
        <dl className="statusGrid">
          <div>
            <dt>Frontend</dt>
            <dd>ok</dd>
          </div>
          <div>
            <dt>Backend</dt>
            <dd>{backendStatus}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
