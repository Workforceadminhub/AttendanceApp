import { describe, it, expect, beforeEach } from "vitest";
import {
  APP_NAME,
  applyPageMeta,
  renderMetaIntoHtml,
  resolvePageMeta,
} from "./pageMeta";

describe("pageMeta", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.title = "";
  });

  it("resolves root path to Workers Hub - Harvesters Gbagada", () => {
    const meta = resolvePageMeta("/");
    expect(meta.title).toBe(APP_NAME);
    expect(meta.ogImage).toBe("/logo.jpg");
  });

  it("resolves Workers Ball 2026 registration and scanner routes with WB26 OG data", () => {
    const wbMeta = resolvePageMeta("/wb26");
    expect(wbMeta.title).toBe("Workers Ball 2026 · Harvesters Gbagada");
    expect(wbMeta.ogImage).toBe("/wb26-og.jpg");
    expect(wbMeta.themeColor).toBe("#0A0E1A");

    const scanMeta = resolvePageMeta("/scan/wb26");
    expect(scanMeta.title).toBe("Accreditation Scanner · Workers Ball 2026");
    expect(scanMeta.ogImage).toBe("/wb26-og.jpg");
  });

  it("resolves awakening subdomain and /awakening route", () => {
    const subMeta = resolvePageMeta("/", "awakening.hiccgbagada.com");
    expect(subMeta.title).toBe("Awakening Conference Registration · Harvesters Gbagada");
    expect(resolvePageMeta("/awakening").title).toBe(
      "Awakening Conference Registration · Harvesters Gbagada"
    );
  });

  it("resolves dynamic department and hub routes", () => {
    expect(resolvePageMeta("/department/choir/workers").title).toBe(
      `Choir Workers · ${APP_NAME}`
    );
    expect(resolvePageMeta("/attendance/admin/ministry").title).toBe(
      `Ministry Attendance · ${APP_NAME}`
    );
    expect(resolvePageMeta("/hub/trainings/123").title).toBe(
      `Training Details · ${APP_NAME}`
    );
    expect(resolvePageMeta("/verify/CERT-001").title).toBe(
      `Verify Certificate (CERT-001) · ${APP_NAME}`
    );
  });

  it("applies title, description, OG, and Twitter meta tags to document.head", () => {
    const meta = resolvePageMeta("/wb26");
    applyPageMeta(meta, "/wb26");

    expect(document.title).toBe("Workers Ball 2026 · Harvesters Gbagada");
    expect(
      document.head.querySelector('meta[name="description"]')?.getAttribute("content")
    ).toContain("Workers Ball 2026");
    expect(
      document.head.querySelector('meta[property="og:title"]')?.getAttribute("content")
    ).toBe("Workers Ball 2026 · Harvesters Gbagada");
    expect(
      document.head.querySelector('meta[property="og:image"]')?.getAttribute("content")
    ).toBe("/wb26-og.jpg");
    expect(
      document.head.querySelector('meta[name="twitter:image"]')?.getAttribute("content")
    ).toBe("/wb26-og.jpg");
  });

  it("renders route metadata into an HTML template string for static builds", () => {
    const template = `<!doctype html><html><head>
      <meta name="theme-color" content="#000000" />
      <title>Workers Hub - Harvesters Gbagada</title>
      <meta name="description" content="Default" />
      <meta property="og:title" content="Workers Hub - Harvesters Gbagada" />
      <meta property="og:description" content="Default OG" />
      <meta property="og:image" content="/logo.jpg" />
      <meta property="og:image:alt" content="Workers Hub - Harvesters Gbagada" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Workers Hub - Harvesters Gbagada" />
      <meta name="twitter:description" content="Default Twitter" />
      <meta name="twitter:image" content="/logo.jpg" />
    </head><body></body></html>`;

    const wbHtml = renderMetaIntoHtml(template, "/wb26");
    expect(wbHtml).toContain("<title>Workers Ball 2026 · Harvesters Gbagada</title>");
    expect(wbHtml).toContain('<meta property="og:image" content="/wb26-og.jpg" />');
    expect(wbHtml).toContain('<meta name="theme-color" content="#0A0E1A" />');
  });
});
