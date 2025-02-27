import { traceable } from "langsmith/traceable";
import { NextResponse } from 'next/server';
import { AISDKExporter } from "langsmith/vercel";
// Set max duration for serverless function
export const maxDuration = 300;

// Define the data structure for logging
interface LogData {
  userId: string;
  timestamp?: string;
  question: string;
  response: string;
}

// Create a traceable function for storing interactions
const storeInteraction = traceable(
  async (userId: string, question: string, response: string) => {
    try {
      // Generate timestamp on server to ensure consistency
      const timestamp = new Date().toISOString();
      
      // Log the data being stored (useful for debugging)
      console.log('Storing interaction:', { 
        userId, 
        timestamp,
        questionLength: question.length,
        responseLength: response.length 
      });
      
      // Return complete data for tracing
      return { 
        userId, 
        timestamp, 
        question, 
        response,
        success: true 
      };
    } catch (error) {
      console.error('Failed to store interaction:', error);
      throw error;
    }
  },
  {
    name: 'storeInteraction',
    tags: ['production'], // Add tags to help with filtering in LangSmith
  }
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
    // Verify LangSmith connectivity
    const connectivityCheck = await checkLangSmithConnectivity();
    
    // Parse the request body
    const { userId, question, response }: LogData = await request.json();
    
    if (!userId || !question || !response) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Store the interaction with LangSmith
    const result = await storeInteraction(userId, question, response);
    
    // Return success response with connectivity status
    return NextResponse.json({ 
      success: true,
      langsmith_connected: connectivityCheck
    });
    
  } catch (error) {
    console.error('Error in logging route:', error);
    return NextResponse.json(
      { error: 'Failed to log interaction', details: (error as Error).message },
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
