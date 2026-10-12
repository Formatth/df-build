"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Build = {
  id: number; author: string; weaponId: number; weaponName: string;
  weaponImage: string | null; name: string; code: string; mode: string;
  range: string; copies: number; createdAt: string | null;
};
type ApiResponse = { data: Build[]; page: number; pageSize: number; totalPage: number; error?: string };

export default function Home() {
  const [items, setItems] = useState<Build[]>([]);
  const [page, setPage] = useState(0);
  const [totalPage, setTotalPage] = useState(0);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<number | null>(null);

  const loadPage = useCallback(async (nextPage: number) => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/builds?page=${nextPage}&pageSize=12`);
      const json = await response.json() as ApiResponse;
      if (!response.ok) throw new Error(json.error || "Gagal memuat build.");
      setItems((old) => nextPage === 1 ? json.data : [...old, ...json.data]);
      setPage(nextPage); setTotalPage(json.totalPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadPage(1); }, [loadPage]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesMode = mode === "ALL" || item.mode.toUpperCase() === mode;
      const matchesQuery = !q || [item.weaponName, item.author, item.name, item.code]
        .some((value) => value?.toLowerCase().includes(q));
      return matchesMode && matchesQuery;
    });
  }, [items, mode, query]);

  async function copyCode(item: Build) {
    try {
      await navigator.clipboard.writeText(item.code);
      setCopied(item.id);
      window.setTimeout(() => setCopied((current) => current === item.id ? null : current), 1800);
    } catch { setError("Clipboard gagal. Pastikan situs dibuka lewat HTTPS."); }
  }

  return <main className="shell">
    <header className="topbar">
      <Link className="brand" href="/"><span className="brand-mark">DF</span><span>DF BUILD<span className="brand-dot">.</span></span></Link>
      <span className="status"><i /> COMMUNITY TOOL</span>
    </header>

    <section className="hero">
      <div className="eyebrow"><span /> DELTA FORCE · MOBILE COMPANION</div>
      <h1>Temukan <em>build</em><br />senjata terbaikmu.</h1>
      <p>Jelajahi loadout komunitas, lihat nama pemain dan salin kode build langsung dari HP.</p>
      <div className="hero-meta"><span><b>{items.length}</b> build dimuat</span><span className="meta-separator">/</span><span>Katalog publik</span></div>
    </section>

    <section className="toolbar" aria-label="Pencarian dan filter">
      <label className="search"><span aria-hidden="true">⌕</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari senjata, pemain, atau kode..." aria-label="Cari build" />
        {query && <button className="clear" onClick={() => setQuery("")} aria-label="Hapus pencarian">×</button>}
      </label>
      <div className="filters" role="group" aria-label="Filter mode">
        {([["ALL", "Semua mode"], ["WARFARE", "Warfare"], ["OPERATIONS", "Operations"]] as const).map(([value, label]) =>
          <button key={value} className={`filter ${mode === value ? "active" : ""}`} onClick={() => setMode(value)} aria-pressed={mode === value}>{label}</button>
        )}
      </div>
      <p className="filter-note">Pencarian dan filter berlaku pada build yang sudah dimuat. Muat halaman berikutnya untuk menambah hasil.</p>
    </section>

    {error && <div className="notice error" role="alert">{error}</div>}
    {loading && items.length === 0 && <div className="loading"><span className="spinner" /> Mengambil katalog build...</div>}
    {!loading && !error && filtered.length === 0 && <div className="empty">Belum ada build yang cocok di daftar yang dimuat.</div>}

    <section className="grid" aria-label="Daftar weapon build">
      {filtered.map((item) => <article className="build-card" key={`${item.id}-${item.code}`}>
        <div className="weapon-art">
          {item.weaponImage ? <img src={item.weaponImage} alt={item.weaponName} loading="lazy" /> : <div className="image-fallback">DF</div>}
          <span className="mode-badge">{item.mode === "OPERATIONS" ? "OPERATIONS" : item.mode === "WARFARE" ? "WARFARE" : item.mode}</span>
        </div>
        <div className="card-content">
          <div className="card-kicker">WEAPON BUILD <span>#{item.id}</span></div>
          <h2>{item.weaponName || "Unknown weapon"}</h2>
          <p className="build-name">{item.name || "Community loadout"}</p>
          <div className="author-row"><span className="avatar">{(item.author || "?").slice(0, 1).toUpperCase()}</span><span className="author-name">{item.author || "Unknown player"}</span><span className="copies">↗ {item.copies.toLocaleString("id-ID")}</span></div>
          <div className="code-row"><code>{item.code || "Kode tidak tersedia"}</code><button className="copy-button" onClick={() => void copyCode(item)} disabled={!item.code}>{copied === item.id ? "TERSALIN ✓" : "SALIN KODE ↗"}</button></div>
        </div>
      </article>)}
    </section>

    <div className="load-more-wrap">
      {page < totalPage ? <button className="load-more" onClick={() => void loadPage(page + 1)} disabled={loading}>{loading ? "Memuat..." : "Muat build lainnya"} <span>↓</span></button> : page > 0 ? <p className="end-note">Kamu sudah mencapai akhir katalog yang tersedia.</p> : null}
    </div>
    <footer className="footer">
      <div className="brand footer-brand"><span className="brand-mark">DF</span><span>DF BUILD<span className="brand-dot">.</span></span></div>
      <p>Proyek komunitas tidak resmi. Tidak berafiliasi dengan Garena atau Delta Force.</p>
      <p className="footer-small">Ketersediaan dan ketepatan build mengikuti sumber. Gambar serta data mengikuti ketentuan pemiliknya.</p>
    </footer>
  </main>;
}