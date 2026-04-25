import { auth0 } from "@/lib/auth0";
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

type MemberRoomRow = {
  rooms: Record<string, unknown> | Record<string, unknown>[] | null;
};

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

export async function GET(req: NextRequest) {
  try {
    const session = await auth0.getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await getOrCreateUser(session.user.email, session.user.name);

    const { data: ownedRooms } = await supabaseAdmin
      .from("rooms")
      .select("*")
      .eq("owner_id", user.id);

    const { data: memberRooms } = await supabaseAdmin
      .from("room_members")
      .select("rooms(*)")
      .eq("user_id", user.id);

    const memberRoomList = (memberRooms ?? [])
      .map((m: MemberRoomRow) => m.rooms)
      .filter((r): r is Record<string, unknown> => r !== null && !Array.isArray(r));

    const allRooms = [
      ...(ownedRooms ?? []),
      ...memberRoomList.filter(
        (r) => !ownedRooms?.find((o) => o.id === r["id"])
      ),
    ];

    return NextResponse.json(allRooms);
  } catch (error) {
    console.error("GET /api/rooms error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth0.getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { name, prompt, deadline } = await req.json();

    if (!name || !prompt) {
      return NextResponse.json({ error: "Missing name or prompt" }, { status: 400 });
    }

    const user = await getOrCreateUser(session.user.email, session.user.name);

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data: room, error } = await supabaseAdmin
      .from("rooms")
      .insert({
        owner_id: user.id,
        name,
        prompt,
        deadline,
        status: "OPEN",
        code,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabaseAdmin.from("room_members").insert({
      room_id: room.id,
      user_id: user.id,
      name: session.user.name || session.user.email.split("@")[0] || "Owner",
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error("POST /api/rooms error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}