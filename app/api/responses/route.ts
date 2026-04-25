



import { auth0 } from "@/lib/auth0";
import { supabaseAdmin } from "@/lib/supabase";
import { transcribeAudio } from "@/lib/elevenlabs";
import { NextRequest, NextResponse } from "next/server";


export async function POST(req: NextRequest) {
  try {
    console.log("POST /api/responses called");
    const session = await auth0.getSession();
    console.log("session:", session?.user?.email);

    const formData = await req.formData();
    const audioFile = formData.get("audio") as Blob;
    const roomId = formData.get("room_id") as string;
    console.log("audioFile:", audioFile?.size, "roomId:", roomId);

    if (!audioFile || !roomId) {
      return NextResponse.json({ error: "Missing audio or room_id" }, { status: 400 });
    }

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", session!.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: membership } = await supabaseAdmin
      .from("room_members")
      .select("*")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this room" }, { status: 403 });
    }

    let transcript = "";
    try {
      const transcriptionResult = await transcribeAudio(audioFile);
      transcript = transcriptionResult.text;
    } catch (error) {
      console.error("Transcription failed:", error);
    }

    const fileName = `${roomId}/${user.id}/${Date.now()}.webm`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("audio")
      .upload(fileName, audioFile);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from("audio")
      .getPublicUrl(fileName);

    const { data: response, error } = await supabaseAdmin
      .from("responses")
      .insert({
        room_id: roomId,
        user_id: user.id,
        audio_url: urlData.publicUrl,
        transcript,
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("POST /api/responses error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
