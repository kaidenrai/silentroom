import { auth0 } from "@/lib/auth0";
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

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

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    const { data: solutions, error: solutionError } = await supabaseAdmin
      .from("room_solutions")
      .select(`
        *,
        solution_votes(count)
      `)
      .eq("room_id", roomId)
      .order("vote_count", { ascending: false });

    if (solutionError) {
      return NextResponse.json({ error: solutionError.message }, { status: 500 });
    }

    const { data: userVotes } = await supabaseAdmin
      .from("solution_votes")
      .select("solution_id")
      .eq("user_id", user?.id || "")
      .eq("room_id", roomId);

    const userVoteSet = new Set(userVotes?.map((v) => v.solution_id) || []);

    // Enhance solutions with vote info
    const solutionsWithVotes = (solutions ?? []).map((sol) => ({
      ...sol,
      pros: sol.pros ?? [],
      cons: sol.cons ?? [],
      vote_count: sol.solution_votes?.[0]?.count || 0,
      user_voted: userVoteSet.has(sol.id),
      solution_votes: undefined, // Remove the raw count data
    })) || [];

    return NextResponse.json(solutionsWithVotes);
  } catch (error) {
    console.error("GET /api/solutions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}