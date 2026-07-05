import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_LOCAL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json'
};

export async function GET() {
  if (!SUPA_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  try {
    console.log('Fetching weekly missions from database...');
    const res = await fetch(`${SUPA_URL}/rest/v1/missions?select=id,title,deadline_at,status&mission_type=eq.weekly`, {
      headers
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch missions', details: await res.text() }, { status: 500 });
    }

    const missions = await res.json();
    let updateCount = 0;
    const updatedMissions = [];

    for (const mission of missions) {
      if (!mission.deadline_at) continue;

      const deadline = new Date(mission.deadline_at);
      const dayOfWeek = deadline.getUTCDay();

      // If it's Sunday (0) and 12:00:00 UTC (i.e. Sunday noon Taipei time when timezone stripped)
      if (dayOfWeek === 0 && deadline.getUTCHours() === 12) {
        const newDeadline = new Date(deadline.getTime() + 24 * 60 * 60 * 1000); // add 24 hours (Monday 12:00:00 UTC)

        console.log(`Updating "${mission.title}" (${mission.id}): ${mission.deadline_at} -> ${newDeadline.toISOString()}`);

        const updateRes = await fetch(`${SUPA_URL}/rest/v1/missions?id=eq.${mission.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ deadline_at: newDeadline.toISOString() })
        });

        if (updateRes.ok) {
          updateCount++;
          updatedMissions.push({
            id: mission.id,
            title: mission.title,
            old: mission.deadline_at,
            new: newDeadline.toISOString()
          });
        } else {
          console.error(`Failed to update mission ${mission.id}:`, await updateRes.text());
        }
      }
    }

    return NextResponse.json({
      success: true,
      total_missions: missions.length,
      updated_count: updateCount,
      updated: updatedMissions
    });

  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Error', message: err.message }, { status: 500 });
  }
}
