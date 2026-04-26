import { auth0 } from "@/lib/auth0";
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST: Update room status (complete, block, or mark resolution reached)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    const session = await auth0.getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { status, winningSolutionId, notes } = await req.json();

    if (!status || !["COMPLETED", "BLOCKED", "RESOLUTION_REACHED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be COMPLETED, BLOCKED, or RESOLUTION_REACHED" },
        { status: 400 }
      );
    }

    // Get user
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get room and verify ownership
    const { data: room, error: roomError } = await supabaseAdmin
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.owner_id !== user.id) {
      return NextResponse.json(
        { error: "Only room owner can update status" },
        { status: 403 }
      );
    }

    // Update room status
    const updateData: Record<string, unknown> = {
      status,
      completed_at: status === "COMPLETED" ? new Date().toISOString() : null,
    };

    if (winningSolutionId && status === "RESOLUTION_REACHED") {
      updateData.winning_solution_id = winningSolutionId;
    }

    if (notes) {
      updateData.completion_notes = notes;
    }

    const { data: updatedRoom, error: updateError } = await supabaseAdmin
      .from("rooms")
      .update(updateData)
      .eq("id", roomId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating room status:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(updatedRoom);
  } catch (error) {
    console.error("POST /api/rooms/[id]/status error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET: Get current room status and voting summary
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    const session = await auth0.getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get room
    const { data: room } = await supabaseAdmin
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Get voting summary if in VOTING or RESOLUTION_REACHED status
    let votingSummary = null;
    if (["VOTING", "RESOLUTION_REACHED", "COMPLETED"].includes(room.status)) {
      const { data: solutions } = await supabaseAdmin
        .from("room_solutions")
        .select("id, title, vote_count")
        .eq("room_id", roomId)
        .order("vote_count", { ascending: false });

      const totalVotes = solutions?.reduce((sum, s) => sum + (s.vote_count || 0), 0) || 0;
      const topSolution = solutions?.[0]; // Get the leading solution

      votingSummary = {
        totalVotes,
        solutions: solutions?.map((s) => ({
          id: s.id,
          title: s.title,
          votes: s.vote_count || 0,
          percentage: totalVotes > 0 ? Math.round(((s.vote_count || 0) / totalVotes) * 100) : 0,
        })) || [],
        leadingSolution: topSolution,
      };
    }

    return NextResponse.json({
      room,
      votingSummary,
    });
  } catch (error) {
    console.error("GET /api/rooms/[id]/status error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
