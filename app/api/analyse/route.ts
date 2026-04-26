import { auth0 } from "@/lib/auth0";
import { supabaseAdmin } from "@/lib/supabase";
import {
  analyzeResponses as analyzeWithGemini,
  generateSummary,
  generateSolutions,
  generateDynamicPrompts,
} from "@/lib/gemini";
import { textToSpeech } from "@/lib/elevenlabs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await auth0.getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { roomId, mode = "solutions" } = await req.json();

    if (!roomId) {
      return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
    }

    // -------------------------------
    // Get user
    // -------------------------------
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // -------------------------------
    // Get room
    // -------------------------------
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
        { error: "Only room owner can analyze" },
        { status: 403 }
      );
    }

    // -------------------------------
    // Get responses
    // -------------------------------
    const { data: responses, error: responsesError } = await supabaseAdmin
      .from("responses")
      .select("*")
      .eq("room_id", roomId);

    if (responsesError) {
      return NextResponse.json({ error: responsesError.message }, { status: 500 });
    }

    if (!responses || responses.length === 0) {
      return NextResponse.json({ error: "No responses to analyze" }, { status: 400 });
    }

    // Update room status to READY_FOR_ANALYSIS
    await supabaseAdmin
      .from("rooms")
      .update({ status: "READY_FOR_ANALYSIS" })
      .eq("id", roomId);

    // -------------------------------
    // Get member names
    // -------------------------------
    const { data: members, error: membersError } = await supabaseAdmin
      .from("room_members")
      .select("user_id, name")
      .eq("room_id", roomId);

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    const nameByUserId = new Map(
      members?.map((m) => [m.user_id, m.name]) || []
    );

    // -------------------------------
    // Build transcripts for AI
    // -------------------------------
    const transcriptsForAnalysis = responses.map(
      (r: { user_id: string; transcript: string | null }, index: number) => ({
        name: nameByUserId.get(r.user_id) || `Person ${index + 1}`,
        transcript: r.transcript || "(no transcript)",
      })
    );

    // Generate dynamic prompts if they don't exist yet
    const { data: existingPrompts } = await supabaseAdmin
      .from("room_prompts")
      .select("id")
      .eq("room_id", roomId)
      .limit(1);

    if (!existingPrompts || existingPrompts.length === 0) {
      try {
        const prompts = await generateDynamicPrompts(room.prompt, transcriptsForAnalysis);
        await supabaseAdmin
          .from("room_prompts")
          .insert(
            prompts.map((p) => ({
              room_id: roomId,
              question: p.question,
              category: p.category,
              reasoning: p.reasoning,
            }))
          );
      } catch (error) {
        console.error("Failed to generate prompts:", error);
        // Don't fail the analysis if prompts generation fails
      }
    }

    // New workflow: Generate solutions instead of traditional analysis
    if (mode === "solutions") {
      try {
        // Generate solution proposals
        const solutions = await generateSolutions(room.prompt, transcriptsForAnalysis);

        // Store solutions in database
        const solutionRecords = solutions.map((sol) => ({
          room_id: roomId,
          title: sol.title,
          description: sol.description,
          rationale: sol.rationale,
          pros: sol.pros,
          cons: sol.cons,
          implementation_difficulty: sol.implementation_difficulty,
          estimated_effort: sol.estimated_effort,
        }));

        const { data: savedSolutions, error: solutionError } = await supabaseAdmin
          .from("room_solutions")
          .insert(solutionRecords)
          .select();

        if (solutionError) {
          console.error("Error saving solutions:", solutionError);
          return NextResponse.json({ error: solutionError.message }, { status: 500 });
        }

        // Update room status to VOTING
        await supabaseAdmin
          .from("rooms")
          .update({ status: "VOTING" })
          .eq("id", roomId);

        return NextResponse.json(
          {
            status: "VOTING",
            solutions: savedSolutions,
            message: "Solutions generated. Team members can now vote.",
          },
          { status: 201 }
        );
      } catch (err) {
        console.error("SOLUTIONS GENERATION ERROR:", err);
        throw err;
      }
    }

    // Legacy mode: Original analysis workflow (optional fallback)
    let analysis;
    let summaryText;

    try {
      analysis = await analyzeWithGemini(transcriptsForAnalysis);
    } catch (err) {
      console.error("GEMINI ANALYSIS ERROR:", err);
      throw err;
    }

    try {
      summaryText = await generateSummary(transcriptsForAnalysis);
    } catch (err) {
      console.error("SUMMARY ERROR:", err);
      throw err;
    }

    // Text-to-Speech
    let narrationUrl = "";

    try {
      const audioBlob = await textToSpeech(summaryText);
      const fileName = `${roomId}/summary_${Date.now()}.mp3`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("audio")
        .upload(fileName, audioBlob);

      if (!uploadError) {
        const { data } = supabaseAdmin.storage
          .from("audio")
          .getPublicUrl(fileName);

        narrationUrl = data.publicUrl;
      }
    } catch (error) {
      console.error("TTS generation failed:", error);
    }

    // Save analysis
    const { data: savedAnalysis, error: saveError } = await supabaseAdmin
      .from("room_analysis")
      .insert({
        room_id: roomId,
        satisfaction_score: analysis.satisfaction_score,
        status: analysis.status,
        consensus_points: analysis.consensus_points,
        blockers: analysis.blockers,
        alignment_percent: analysis.alignment_percent,
        meeting_needed: analysis.meeting_needed,
        suggested_attendees: analysis.suggested_attendees,
        suggested_agenda: analysis.suggested_agenda,
        narration_url: narrationUrl,
      })
      .select()
      .single();

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 500 });
    }

    // Update room status
    await supabaseAdmin
      .from("rooms")
      .update({ status: analysis.status })
      .eq("id", roomId);

    return NextResponse.json(savedAnalysis, { status: 201 });
  } catch (error) {
    console.error("POST /api/analyse error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}