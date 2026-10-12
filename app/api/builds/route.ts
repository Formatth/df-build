import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const API_ORIGIN = "https://meta.deltaforce.garena.com";

type Weapon = { id: number; name: string; image?: string; imageUrl?: string; icon?: string };
type Build = {
  id: number; author?: string; weaponId?: number; name?: string; code?: string;
  stats1?: string; stats2?: string; stats3?: string; stats4?: string;
  stats5?: string; stats6?: string; stats7?: string;
  numberOfCopy?: number; createdAt?: string;
};
type BuildResponse = { data?: Build[]; totalPage?: number };
type ConfigResponse = { weapons?: Weapon[]; weaponTypes?: Weapon[] };

const jsonError = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status });

export async function GET(request: NextRequest) {
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const pageSize = Number(request.nextUrl.searchParams.get("pageSize") ?? "12");

  if (!Number.isInteger(page) || page < 1 || page > 10000)
    return jsonError("Parameter page tidak valid.", 400);
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 24)
    return jsonError("pageSize harus antara 1 dan 24.", 400);

  const buildsUrl = new URL("/api/app/loadouts/weaponType", API_ORIGIN);
  buildsUrl.searchParams.set("langId", "6");
  buildsUrl.searchParams.set("pageSize", String(pageSize));
  buildsUrl.searchParams.set("page", String(page));
  const configUrl = new URL("/api/app/config", API_ORIGIN);

  try {
    const [buildsRes, configRes] = await Promise.all([
      fetch(buildsUrl, { headers: { Accept: "application/json" }, next: { revalidate: 300 }, signal: AbortSignal.timeout(9000) }),
      fetch(configUrl, { headers: { Accept: "application/json" }, next: { revalidate: 3600 }, signal: AbortSignal.timeout(9000) })
    ]);
    if (!buildsRes.ok) return jsonError("Sumber katalog build tidak tersedia.", 502);
    if (!configRes.ok) return jsonError("Konfigurasi senjata tidak tersedia.", 502);

    const buildJson = await buildsRes.json() as BuildResponse;
    const configJson = await configRes.json() as ConfigResponse;

    // Be tolerant of configuration wrappers while keeping the upstream host fixed.
    const weapons = configJson.weapons ?? configJson.weaponTypes ?? [];
    if (!Array.isArray(buildJson.data) || !Array.isArray(weapons))
      return jsonError("Struktur respons sumber berubah; adapter perlu diperbarui.", 502);

    const weaponMap = new Map<number, Weapon>(weapons.map((weapon) => [Number(weapon.id), weapon]));
    const data = buildJson.data.map((build) => {
      const weapon = weaponMap.get(Number(build.weaponId));
      return {
        id: Number(build.id),
        author: String(build.author ?? "Pemain komunitas"),
        weaponId: Number(build.weaponId ?? 0),
        weaponName: String(weapon?.name ?? "Senjata"),
        weaponImage: weapon?.image ?? weapon?.imageUrl ?? weapon?.icon ?? null,
        name: String(build.name ?? ""),
        code: String(build.code ?? ""),
        mode: String(build.stats1 ?? "UNKNOWN").toUpperCase(),
        range: String(build.stats7 ?? ""),
        copies: Number(build.numberOfCopy ?? 0),
        createdAt: build.createdAt ?? null
      };
    });

    return NextResponse.json(
      { data, page, pageSize, totalPage: Number(buildJson.totalPage ?? 0) },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch {
    return jsonError("Gagal menghubungi katalog. Coba lagi nanti.", 502);
  }
}