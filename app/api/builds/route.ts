import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const API_ORIGIN = "https://meta.deltaforce.garena.com";

type Weapon = { id: number; name?: string; key?: string; image?: string; [key: string]: unknown };
type Build = {
  id: number; author?: string; weaponId?: number; name?: string; code?: string;
  stats1?: string; stats2?: string; stats3?: string; stats4?: string;
  stats5?: string; stats6?: string; stats7?: string; numberOfCopy?: number; createdAt?: string;
};
type BuildResponse = { data?: Build[]; totalPage?: number };
type ConfigResponse = {
  weapons?: Weapon[];
  weaponTypes?: Weapon[];
  weaponList?: Weapon[];
  [key: string]: unknown;
};

const jsonError = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status });

export async function GET(request: NextRequest) {
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const pageSize = Number(request.nextUrl.searchParams.get("pageSize") ?? "12");
  const keyword = request.nextUrl.searchParams.get("keyword")?.trim();
  const modes = request.nextUrl.searchParams.getAll("mode").filter((v) => ["WARFARE", "OPERATIONS"].includes(v.toUpperCase()));

  if (!Number.isInteger(page) || page < 1 || page > 10000) return jsonError("Parameter page tidak valid.", 400);
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 24) return jsonError("pageSize harus antara 1 dan 24.", 400);

  const buildsUrl = new URL("/api/app/loadouts/weaponType", API_ORIGIN);
  buildsUrl.searchParams.set("langId", "6");
  buildsUrl.searchParams.set("pageSize", String(pageSize));
  buildsUrl.searchParams.set("page", String(page));
  if (keyword) buildsUrl.searchParams.set("keyword", keyword.slice(0, 100));
  if (modes.length) buildsUrl.searchParams.set("modes", modes.join(","));

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
    const weapons = configJson.weapons ?? configJson.weaponTypes ?? configJson.weaponList ?? [];
    if (!Array.isArray(buildJson.data) || !Array.isArray(weapons)) return jsonError("Struktur respons sumber berubah; adapter perlu diperbarui.", 502);

    const weaponMap = new Map<number, Weapon>(weapons.map((weapon) => [Number(weapon.id), weapon]));
    const data = buildJson.data.map((build) => {
      const weapon = weaponMap.get(Number(build.weaponId));
      // The source's config objects use the "image" and "key" fields in its UI bundle.
      return {
        id: Number(build.id),
        author: String(build.author ?? "Pemain komunitas"),
        weaponId: Number(build.weaponId ?? 0),
        weaponName: String(weapon?.name ?? (typeof weapon?.key === "string" ? weapon.key : "") ?? "Senjata"),
        weaponImage: typeof weapon?.image === "string" ? weapon.image : null,
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