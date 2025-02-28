import { traceable } from "langsmith/traceable";
import { NextResponse } from 'next/server';
import { wrapOpenAI } from "langsmith/wrappers";
import { OpenAI } from "openai";

// Set max duration for serverless function
export const maxDuration = 300;
const openai = wrapOpenAI(new OpenAI());
// Define the data structure for logging
interface LogData {
  userId: string;
  timestamp?: string;
  question: string;
  response: string;
}
const systemPrompt = `Just print the same response you received.`;
// Create a traceable function for OpenAI call
const createCompletion = traceable(
  async (question: string, response: string) => {
    return await openai.chat.completions.create({
      model: "gpt-4o-mini",  // corrected model name
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Question: ${question}\nResponse: ${response}` }
      ],
    });
  },
  { name: "Tracing", run_type: "llm" }
);

// Health check function to verify LangSmith connectivity
const checkLangSmithConnectivity = async () => {
  try {
    // Log a simple test message
    console.log('LangSmith environment variables:',
      {
        endpoint: process.env.LANGSMITH_ENDPOINT ? 'Set' : 'Not set',
        project: process.env.LANGSMITH_PROJECT ? 'Set' : 'Not set',
        tracing: process.env.LANGSMITH_TRACING ? 'Set' : 'Not set',
        apiKey: process.env.LANGCHAIN_API_KEY ? 'Set (length: ' + process.env.LANGCHAIN_API_KEY.length + ')' : 'Not set'
      }
    );
    
    return true;
  } catch (error) {
    console.error('LangSmith connectivity check failed:', error);
    return false;
  }
};

export async function POST(request: Request) {
  try {
    const { question, response } = await request.json();
    
    if (!question || !response) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const result = await createCompletion(question, response);
    
    return NextResponse.json({ 
      success: true,
      content: result.choices[0]?.message?.content
    });
    
  } catch (error) {
    console.error('Error in logging route:', error);
    return NextResponse.json(
      { error: 'Failed to process completion', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// Add OPTIONS method to handle CORS preflight requests if needed
export async function OPTIONS(request: Request) {
  return NextResponse.json(
    { success: true },
    { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    }
  );
}
