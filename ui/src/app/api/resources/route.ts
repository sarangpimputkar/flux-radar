import { NextResponse } from 'next/server';
import { getResources } from '@/lib/resource-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const resources = getResources();
  return NextResponse.json(resources);
}
