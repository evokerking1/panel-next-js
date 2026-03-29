import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true });
  const session = await getSessionFromRequest(req, response);
  await session.destroy();
  return response;
}
