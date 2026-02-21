import { useState, useEffect } from "react";

/**
 * Detects Instagram's In-App Browser (IAB) on mobile and shows a banner
 * prompting the user to open the page in their real browser.
 *
 * Instagram embeds a WebView that is not a real browser — it blocks many
 * JavaScript APIs and breaks React SPAs, causing blank/stuck pages.
 */
function isInstagramIAB(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return ua.includes("Instagram");
}

function getOpenInBrowserUrl(): string {
  const url = window.location.href;
  // Android: use intent:// scheme to force open in Chrome
  // iOS: no direct scheme; we show instructions instead
  const isAndroid = /android/i.test(navigator.userAgent);
  if (isAndroid) {
    return url
      .replace("https://", "intent://")
      .replace("http://", "intent://")
      + "#Intent;scheme=https;package=com.android.chrome;end";
  }
  return url; // iOS — user must manually tap "Open in Safari"
}

export function InstagramBrowserBanner() {
  const [show, setShow] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    if (isInstagramIAB()) {
      setShow(true);
      setIsAndroid(/android/i.test(navigator.userAgent));
    }
  }, []);

  if (!show) return null;

  return (
    <div
      style={{ zIndex: 99999 }}
      className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
    >
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center flex flex-col items-center gap-4">
        {/* Browser icon */}
        <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-8 h-8 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20" />
          </svg>
        </div>

        <h2 className="text-gray-900 font-semibold text-lg leading-snug">
          Open in your browser for the best experience
        </h2>

        <p className="text-gray-500 text-sm">
          Instagram's built-in browser doesn't fully support this page. Please
          open it in{" "}
          {isAndroid ? "Chrome or your default browser" : "Safari"} instead.
        </p>

        {isAndroid ? (
          <a
            href={getOpenInBrowserUrl()}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
          >
            Open in Chrome
          </a>
        ) : (
          <div className="w-full rounded-xl bg-gray-50 border border-gray-200 py-3 px-4 text-sm text-gray-600 text-left leading-relaxed">
            Tap the <strong>···</strong> menu at the bottom-right, then choose{" "}
            <strong>"Open in Safari"</strong>.
          </div>
        )}

        <button
          onClick={() => setShow(false)}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Continue anyway
        </button>
      </div>
    </div>
  );
}
