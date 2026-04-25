import { auth0 } from "@/lib/auth0";
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth0.getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: room, error: roomError } = await supabaseAdmin
      .from("rooms")
      .select("*")
      .eq("id", id)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const { data: members } = await supabaseAdmin
      .from("room_members")
      .select("*")
      .eq("room_id", id);

    const { data: responses } = await supabaseAdmin
      .from("responses")
      .select("*")
      .eq("room_id", id);

    const membership = members?.find((m) => m.user_id === user.id) || null;
    const hasSubmitted = responses?.some((r) => r.user_id === user.id) || false;
    const memberCount = members?.length || 0;
    const responseCount = responses?.length || 0;
    const allSubmitted = memberCount > 0 && responseCount >= memberCount;

    return NextResponse.json({
      room,
      membership,
      responses: responses || [],
      hasSubmitted,
      allSubmitted,
      memberCount,
      responseCount,
    });
  } catch (error) {
    console.error("GET /api/rooms/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}