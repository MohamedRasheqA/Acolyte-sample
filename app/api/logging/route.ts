import { traceable } from 'langsmith/traceable';
import { NextResponse } from 'next/server';
const maxDuration = 300;
interface LogData {
  userId: string;
  timestamp: string;
  question: string;
  response: string;
}

const storeInteraction = traceable(
  async(userId: string, question: string, response: string) => {
    console.log('Storing interaction:', { userId, question, response });
    return { userId, question, response }; // Return a value for proper tracing
  },{
    name: 'storeInteraction',
  }
);

export async function POST(request: Request) {
  try {
    const {userId, question, response}: LogData = await request.json();
    
    await storeInteraction(userId, question, response);
    return NextResponse.json({ success: true });
   
  } catch (error) {
    console.error('Error in logging route:', error);
    return NextResponse.json(
      { error: 'Failed to log interaction' },
      { status: 500 }
    );
  }
}
