import { NextResponse } from "next/server";
import { getObject } from "@/lib/storage/client";
import { isAllowedMediaKey } from "@/lib/storage/media-url";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { path } = await context.params;
  const key = path.map((segment) => decodeURIComponent(segment)).join("/");

  if (!isAllowedMediaKey(key)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const object = await getObject({ key });

    if (!object) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return new NextResponse(Buffer.from(object.body), {
      status: 200,
      headers: {
        "Content-Type": object.contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load image" },
      { status: 502 },
    );
  }
}
