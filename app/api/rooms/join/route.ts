import { auth0 } from "@/lib/auth0";
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

async function getOrCreateUser(email: string, name?: string | null) {
  let { data: user, error } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!user) {
    const { data: newUser, error: createError } = await supabaseAdmin
      .from("users")
      .insert({
        email,
        name: name || email.split("@")[0],
      })
      .select("id")
      .single();

    if (createError) throw createError;
    user = newUser;
  }

  return user;
}

export async function POST(req: NextRequest) {
  try {
    const { roomCode, name } = await req.json();

    const session = await auth0.getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!roomCode?.trim()) {
      return NextResponse.json({ error: "Room code is required" }, { status: 400 });
    }

    const userName = name?.trim() || session.user.name || session.user.email.split("@")[0];

    if (!userName) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Find room by code
    const { data: room, error: roomError } = await supabaseAdmin
      .from("rooms")
      .select("id")
      .eq("code", roomCode.trim().toUpperCase())
      .maybeSingle();

    if (roomError) throw roomError;

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const roomId = room.id;

    const user = await getOrCreateUser(session.user.email, session.user.name);

    const { data: existingMember } = await supabaseAdmin
      .from("room_members")
      .select("*")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json(existingMember);
    }

    const { data: member, error } = await supabaseAdmin
      .from("room_members")
      .insert({
        room_id: roomId,
        user_id: user.id,
        name: userName,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error("POST /api/rooms/join error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}