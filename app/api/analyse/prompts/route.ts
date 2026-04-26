import { auth0 } from "@/lib/auth0";
import { supabaseAdmin } from "@/lib/supabase";
import { generateDynamicPrompts } from "@/lib/gemini";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST: Generate dynamic prompts based on room description and optionally current responses
 * This endpoint is called during the OPEN phase to generate follow-up questions
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { roomId } = await req.json();

    if (!roomId) {
      return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
    }

    // Get room and verify user is member or owner
    const { data: room, error: roomError } = await supabaseAdmin
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    const isOwner = room.owner_id === user?.id;
    const { data: membership } = await supabaseAdmin
      .from("room_members")
      .select("*")
      .eq("room_id", roomId)
      .eq("user_id", user?.id || "")
      .single();

    if (!isOwner && !membership) {
      return NextResponse.json(
        { error: "Not authorized to access this room" },
        { status: 403 }
      );
    }

    // Get current responses if available
    const { data: responses } = await supabaseAdmin
      .from("responses")
      .select("user_id, transcript")
      .eq("room_id", roomId);

    // Get member names for context
    const { data: members } = await supabaseAdmin
      .from("room_members")
      .select("user_id, name")
      .eq("room_id", roomId);

    const nameByUserId = new Map(members?.map((m) => [m.user_id, m.name]) || []);

    const responsesData = responses?.map((r) => ({
      name: nameByUserId.get(r.user_id) || "Team member",
      transcript: r.transcript || "",
    })) || [];

    // Generate prompts using Gemini
    const prompts = await generateDynamicPrompts(
      room.prompt,
      responsesData.length > 0 ? responsesData : undefined
    );

    // Store prompts in database
    const { error: insertError } = await supabaseAdmin
      .from("room_prompts")
      .insert(
        prompts.map((p) => ({
          room_id: roomId,
          question: p.question,
          category: p.category,
          reasoning: p.reasoning,
        }))
      );

    if (insertError) {
      console.error("Error saving prompts:", insertError);
    }

    return NextResponse.json(prompts, { status: 201 });
  } catch (error) {
    console.error("POST /api/analyse/prompts error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET: Retrieve existing prompts for a room
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");

    if (!roomId) {
      return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
    }

    const { data: prompts, error } = await supabaseAdmin
      .from("room_prompts")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(prompts);
  } catch (error) {
    console.error("GET /api/analyse/prompts error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
