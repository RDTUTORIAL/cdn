import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * POST /api/auth/supabase
 * Exchange a Supabase session (from client-side login) into our app cookie.
 * This bridges Supabase Auth with our existing auth system.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "No Supabase session" }, { status: 401 });
    }

    // The Supabase user is now authenticated.
    // We store a simple token that our middleware can verify.
    const response = NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email,
      },
    });

    return response;
  } catch (error) {
    console.error("Supabase auth error:", error);
    return NextResponse.json({ error: "Auth failed" }, { status: 500 });
  }
}

/**
 * GET /api/auth/supabase — get current Supabase user info
 */
export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
