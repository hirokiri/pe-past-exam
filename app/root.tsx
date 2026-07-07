import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <header className="site-header">
          <Link to="/" className="site-title">
            技術士過去問題 模範解答解説集
          </Link>
          <nav>
            <Link to="/questions">問題を探す</Link>
            {/* リソースルートへの直接ダウンロードのため Link ではなく a を使う */}
            <span className="download-links">
              <span className="download-links-label">ダウンロード:</span>
              <a href="/downloads/01-kikai/pdf" download>
                PDF
              </a>
              <a href="/downloads/01-kikai/epub" download>
                EPUB
              </a>
              <a href="/downloads/01-kikai/html" download>
                HTML
              </a>
            </span>
          </nav>
        </header>
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          <p>
            過去問題の著作権は公益社団法人日本技術士会に帰属します。本サイトは非公開・私的利用に限定しています。
          </p>
        </footer>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "エラー";
  let details = "予期しないエラーが発生しました。";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "エラー";
    details =
      error.status === 404
        ? "お探しのページは見つかりませんでした。"
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <div className="error-page">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre>
          <code>{stack}</code>
        </pre>
      )}
    </div>
  );
}
