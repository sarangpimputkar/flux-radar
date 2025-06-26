import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { addClusterData } from '@/lib/resource-store';
import type { ClusterData } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const data: ClusterData = await request.json();
    
    if (!data.clusterName || !Array.isArray(data.resources)) {
        throw new Error("Invalid ClusterData format. Expecting { clusterName: string, resources: Resource[] }");
    }

    addClusterData(data);
    
    console.log('Successfully added data for cluster:', data.clusterName);

    return NextResponse.json({ message: 'Data received and added successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to process incoming data:', error);
    return NextResponse.json({ message: 'Error processing request', error: (error as Error).message }, { status: 400 });
  }
}
