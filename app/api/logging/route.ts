import { traceable } from "langsmith/traceable";
import { wrapOpenAI } from "langsmith/wrappers";
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
    try {
     
      console.log('Storing interaction:', { userId, question, response });
      return { response }; // Return complete data for tracing
    } catch (error) {
      console.error('Failed to store interaction:', error);
      throw error;
    }
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
