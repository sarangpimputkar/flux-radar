import { subscribeToUpdates } from '@/lib/event-bus';

export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      const onUpdate = () => {
        controller.enqueue(encoder.encode('data: update\n\n'));
      };

      const unsubscribe = subscribeToUpdates(onUpdate);

      request.signal.addEventListener('abort', () => {
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}
