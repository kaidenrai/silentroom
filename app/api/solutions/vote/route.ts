import { auth0 } from "@/lib/auth0";
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

async function getVoteCount(solutionId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from("solution_votes")
    .select("*", { count: "exact", head: true })
    .eq("solution_id", solutionId);
  return count || 0;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { solutionId, roomId } = await req.json();

    if (!solutionId || !roomId) {
      return NextResponse.json({ error: "Missing solutionId or roomId" }, { status: 400 });
    }

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: room } = await supabaseAdmin
      .from("rooms")
      .select("id, status")
      .eq("id", roomId)
      .single();

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.status !== "VOTING") {
      return NextResponse.json({ error: "Room is not in voting phase" }, { status: 400 });
    }

    const { data: membership } = await supabaseAdmin
      .from("room_members")
      .select("*")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "User is not a member of this room" }, { status: 403 });
    }

    // Check if already voted for this specific solution
    const { data: existingVote } = await supabaseAdmin
      .from("solution_votes")
      .select("id")
      .eq("solution_id", solutionId)
      .eq("user_id", user.id)
      .single();

    if (existingVote) {
      return NextResponse.json({ error: "You have already voted for this solution" }, { status: 400 });
    }

    // Check if already voted for any solution in this room
    const { data: userVoteInRoom } = await supabaseAdmin
      .from("solution_votes")
      .select("id")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    if (userVoteInRoom) {
      return NextResponse.json({ error: "You have already voted for another solution in this room" }, { status: 400 });
    }

    // Record vote
    const { data: vote, error: voteError } = await supabaseAdmin
      .from("solution_votes")
      .insert({ solution_id: solutionId, user_id: user.id, room_id: roomId })
      .select()
      .single();

    if (voteError) {
      console.error("Error recording vote:", voteError);
      return NextResponse.json({ error: voteError.message }, { status: 500 });
    }

    // Update vote count
    const newCount = await getVoteCount(solutionId);
    await supabaseAdmin
      .from("room_solutions")
      .update({ vote_count: newCount })
      .eq("id", solutionId);

    // Check if all members have voted — auto-close if so
    const { data: members } = await supabaseAdmin
      .from("room_members")
      .select("user_id")
      .eq("room_id", roomId);

    const { data: allVotes } = await supabaseAdmin
      .from("solution_votes")
      .select("user_id")
      .eq("room_id", roomId);

    const uniqueVoters = new Set((allVotes ?? []).map((v) => v.user_id));
    const allVoted = (members ?? []).every((m) => uniqueVoters.has(m.user_id));

    if (allVoted) {
      // Find top solution - if tie, prioritize solution voted by room owner
      const { data: room } = await supabaseAdmin
        .from("rooms")
        .select("owner_id")
        .eq("id", roomId)
        .single();

      const { data: solutions } = await supabaseAdmin
        .from("room_solutions")
        .select("id, vote_count")
        .eq("room_id", roomId)
        .order("vote_count", { ascending: false });

      if (solutions && solutions.length > 0) {
        // Get max vote count
        const maxVotes = solutions[0].vote_count;

        // Find all solutions with max votes
        const tiedSolutions = solutions.filter(s => s.vote_count === maxVotes);

        let winningSolution;
        if (tiedSolutions.length === 1) {
          // No tie, use the top solution
          winningSolution = tiedSolutions[0];
        } else {
          // Tie - check if owner voted for any of the tied solutions
          const { data: ownerVote } = await supabaseAdmin
            .from("solution_votes")
            .select("solution_id")
            .eq("room_id", roomId)
            .eq("user_id", room?.owner_id)
            .single();

          if (ownerVote && tiedSolutions.some(s => s.id === ownerVote.solution_id)) {
            // Owner voted for one of the tied solutions, prioritize that one
            winningSolution = tiedSolutions.find(s => s.id === ownerVote.solution_id);
          } else {
            // Owner didn't vote or didn't vote for tied solutions, use first one
            winningSolution = tiedSolutions[0];
          }
        }

        if (winningSolution) {
          await supabaseAdmin
            .from("room_analysis")
            .update({ top_solution_id: winningSolution.id })
            .eq("room_id", roomId);
        }
      }

      await supabaseAdmin
        .from("rooms")
        .update({ status: "RESOLUTION_REACHED", completed_at: new Date().toISOString() })
        .eq("id", roomId);
    }

    return NextResponse.json(vote, { status: 201 });
  } catch (error) {
    console.error("POST /api/solutions/vote error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { solutionId, roomId } = await req.json();

    if (!solutionId || !roomId) {
      return NextResponse.json({ error: "Missing solutionId or roomId" }, { status: 400 });
    }

    const { data: room } = await supabaseAdmin
      .from("rooms")
      .select("status")
      .eq("id", roomId)
      .single();

    if (room?.status !== "VOTING") {
      return NextResponse.json({ error: "Cannot withdraw vote outside voting phase" }, { status: 400 });
    }

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from("solution_votes")
      .delete()
      .eq("solution_id", solutionId)
      .eq("user_id", user.id)
      .eq("room_id", roomId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    const newCount = await getVoteCount(solutionId);
    await supabaseAdmin
      .from("room_solutions")
      .update({ vote_count: Math.max(0, newCount) })
      .eq("id", solutionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/solutions/vote error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}