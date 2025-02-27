import { traceable } from 'langsmith/traceable';
import { NextResponse } from 'next/server';

interface LogData {
  userId: string;
  timestamp: string;
  question: string;
  response: string;
}

const storeInteraction = traceable(
  async (userId: string,question: string, response: string): Promise<{ userId: string; question: string; response: string }> => {
    // Add your storage logic here
    // For example, storing in a database or sending to an analytics service
    console.log('Storing interaction:', { userId, question, response });
    return { userId, question, response };
  },
  {
    name: "Store Chat Interaction"
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
