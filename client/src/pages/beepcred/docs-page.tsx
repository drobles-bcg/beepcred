import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const BASE = '/api';

function Code({ children }: { children: string }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">{children}</code>
  );
}

export function DocsPage() {
  return (
    <>
      <Helmet>
        <title>API documentation — BeepCred</title>
        <meta
          name="description"
          content="BeepCred REST API reference: plates, search, users, votes, comments, and uploads. Session cookie authentication."
        />
      </Helmet>
      <div className="container mx-auto max-w-4xl px-4 pb-16 pt-4">
        <h1 className="mb-2 text-3xl font-bold">API documentation</h1>
        <p className="mb-8 text-muted-foreground">
          REST JSON API for the BeepCred community. In development, the API defaults to{' '}
          <Code>http://localhost:3010</Code>. The web app proxies <Code>/api</Code> on port 5180.
        </p>

        <section className="mb-10 space-y-3">
          <h2 className="text-xl font-semibold">Authentication</h2>
          <p className="text-sm text-muted-foreground">
            Browser clients use cookie-based sessions after <Code>POST /api/auth/login</Code> or{' '}
            <Code>POST /api/auth/register</Code> with <Code>credentials: include</Code>. Many read routes are
            public; writes require an authenticated session unless noted.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">Health</h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="p-3 font-medium">Method</th>
                  <th className="p-3 font-medium">Path</th>
                  <th className="p-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-3 font-mono">GET</td>
                  <td className="p-3 font-mono">
                    {BASE}/health
                  </td>
                  <td className="p-3 text-muted-foreground">Returns {`{ "ok": true }`}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">Auth</h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="p-3 font-medium">Method</th>
                  <th className="p-3 font-medium">Path</th>
                  <th className="p-3 font-medium">Body / notes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-3 font-mono">POST</td>
                  <td className="p-3 font-mono">{BASE}/auth/register</td>
                  <td className="p-3 text-muted-foreground">username, email, password</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono">POST</td>
                  <td className="p-3 font-mono">{BASE}/auth/login</td>
                  <td className="p-3 text-muted-foreground">username, password</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono">POST</td>
                  <td className="p-3 font-mono">{BASE}/auth/logout</td>
                  <td className="p-3 text-muted-foreground">Clears session</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono">GET</td>
                  <td className="p-3 font-mono">{BASE}/auth/me</td>
                  <td className="p-3 text-muted-foreground">Current user or 401</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">Plates</h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="p-3 font-medium">Method</th>
                  <th className="p-3 font-medium">Path</th>
                  <th className="p-3 font-medium">Auth</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-3 font-mono">GET</td>
                  <td className="p-3 font-mono">{BASE}/plates</td>
                  <td className="p-3">Public — query: sort, page, limit</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono">POST</td>
                  <td className="p-3 font-mono">{BASE}/plates</td>
                  <td className="p-3">Create/find plate — state, plate_number, optional display_plate_text</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono">GET</td>
                  <td className="p-3 font-mono">{BASE}/plates/:state/:plate</td>
                  <td className="p-3">Public — plate by state + number / slug segment</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono">GET</td>
                  <td className="p-3 font-mono">{BASE}/plates/:id/images</td>
                  <td className="p-3">Public</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono">POST</td>
                  <td className="p-3 font-mono">{BASE}/plates/:id/images</td>
                  <td className="p-3">multipart image — session required</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono">GET</td>
                  <td className="p-3 font-mono">{BASE}/plates/:id/votes</td>
                  <td className="p-3">Public</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono">POST</td>
                  <td className="p-3 font-mono">{BASE}/plates/:id/votes</td>
                  <td className="p-3">Session — vote 1 | -1 | 0</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono">GET</td>
                  <td className="p-3 font-mono">{BASE}/plates/:id/comments</td>
                  <td className="p-3">Public</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono">POST</td>
                  <td className="p-3 font-mono">{BASE}/plates/:id/comments</td>
                  <td className="p-3">Session</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono">GET</td>
                  <td className="p-3 font-mono">{BASE}/plates/:id/sentiment</td>
                  <td className="p-3">Public</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono">PUT</td>
                  <td className="p-3 font-mono">{BASE}/plates/:id</td>
                  <td className="p-3">Session — vehicle metadata, display_plate_text</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">Search</h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="p-3 font-medium">Method</th>
                  <th className="p-3 font-medium">Path</th>
                  <th className="p-3 font-medium">Query</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-3 font-mono">GET</td>
                  <td className="p-3 font-mono">{BASE}/search/plates</td>
                  <td className="p-3">q</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono">GET</td>
                  <td className="p-3 font-mono">{BASE}/search/users</td>
                  <td className="p-3">q</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">Users</h2>
          <p className="mb-2 text-sm text-muted-foreground">
            Public profile by username; submissions include nested plate for each image.
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="p-3 font-medium">Method</th>
                  <th className="p-3 font-medium">Path</th>
                  <th className="p-3 font-medium">Auth</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-3 font-mono">GET</td>
                  <td className="p-3 font-mono">{BASE}/users/me</td>
                  <td className="p-3">Session</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono">GET</td>
                  <td className="p-3 font-mono">{BASE}/users/:username</td>
                  <td className="p-3">Public</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono">GET</td>
                  <td className="p-3 font-mono">{BASE}/users/:username/submissions</td>
                  <td className="p-3">Public</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-10 rounded-lg border bg-muted/30 p-4">
          <h2 className="mb-2 text-lg font-semibold">API access &amp; keys</h2>
          <p className="text-sm text-muted-foreground">
            Programmatic tiers, rate limits, and API keys are described on the{' '}
            <Link to="/purchase" className="font-medium text-primary underline underline-offset-4">
              Purchase
            </Link>{' '}
            page. Production key issuance and metering will ship alongside those plans.
          </p>
        </section>
      </div>
    </>
  );
}
