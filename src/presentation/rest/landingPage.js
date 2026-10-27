/**
 * Static landing page. No scripts and no third-party assets, so it works
 * under the default Content-Security-Policy and offline.
 * @param {{ graphql: boolean, apiDocs: boolean }} links
 */
export function renderLandingPage({ graphql, apiDocs }) {
  const cards = [
    graphql && {
      href: '/graphql',
      title: 'GraphQL Sandbox',
      text: 'Explore and run queries against the GraphQL schema.',
    },
    apiDocs && { href: '/api-docs', title: 'REST API docs', text: 'OpenAPI reference for the REST endpoints.' },
    { href: '/health', title: 'Health check', text: 'Liveness status of this instance.' },
  ].filter(Boolean);

  const items = cards
    .map(
      (card) => `
        <li>
          <a class="card" href="${card.href}">
            <span class="card-title">${card.title}</span>
            <span class="card-text">${card.text}</span>
          </a>
        </li>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>Cloud-Native GraphQL Gateway</title>
  <style>
    :root {
      --bg: #f6f7fb; --surface: #ffffff; --text: #111827; --muted: #4b5563;
      --border: #d1d5db; --accent: #1d4ed8; --focus: #b45309;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0f172a; --surface: #1e293b; --text: #f1f5f9; --muted: #cbd5e1;
        --border: #334155; --accent: #93c5fd; --focus: #fbbf24;
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 16px;
      background: var(--bg); color: var(--text);
      font: 16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    }
    main { width: 100%; max-width: 44rem; }
    h1 { font-size: clamp(1.6rem, 5vw, 2.25rem); margin: 0 0 .25rem; }
    p.lead { color: var(--muted); margin: 0 0 1.5rem; }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px;
         grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); }
    .card {
      display: flex; flex-direction: column; gap: .25rem; height: 100%; padding: 1rem 1.25rem;
      background: var(--surface); color: var(--text); text-decoration: none;
      border: 1px solid var(--border); border-radius: 12px;
    }
    .card:hover { border-color: var(--accent); }
    .card:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
    .card-title { font-weight: 700; color: var(--accent); }
    .card-text { color: var(--muted); font-size: .95rem; }
  </style>
</head>
<body>
  <main>
    <h1>Cloud-Native GraphQL Gateway</h1>
    <p class="lead">REST and GraphQL API for users, products and orders.</p>
    <nav aria-label="Service endpoints">
      <ul>${items}
      </ul>
    </nav>
  </main>
</body>
</html>`;
}
