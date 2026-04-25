import { auth0 } from "@/lib/auth0";
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth0.getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { name } = await req.json();

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: existing } = await supabaseAdmin
      .from("room_members")
      .select("*")
      .eq("room_id", id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json(existing);
    }

    const { data: member, error } = await supabaseAdmin
      .from("room_members")
      .insert({
        room_id: id,
        user_id: user.id,
        name: name || session.user.name || session.user.email.split("@")[0],
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error("POST /api/rooms/[id]/join error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}