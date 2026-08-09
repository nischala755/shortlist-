import { NextResponse } from "next/server";
import { getEnvironment } from "@/config/environment";

export function GET() {
  return NextResponse.json({
    status: "ok",
    environment: getEnvironment(),
  });
}
