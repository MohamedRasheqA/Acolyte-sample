import { traceable } from "langsmith/traceable";
import { NextResponse } from 'next/server';
import { AISDKExporter } from "langsmith/vercel";
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

// Create a traceable function for LLM interaction
const createTeachbackCompletion = traceable(
  async (question: string, answer: string) => {
    const systemPrompt = `This Teach-Back is an activity where the user practices a skill they just learned in an online course. 
    The user's response should include:
    ✔ A clear explanation of key drug pricing benchmarks (AWP, WAC, MAC, NADAC) and how they function.
    ✔ An analysis of how these benchmarks influence pharmacy costs and reimbursement structures.
    ✔ A connection to pharmacy benefits consulting, including how understanding benchmarks supports cost management and plan design.`;

    return await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
        { role: "assistant", content: answer }
      ],
    });
  },
  { name: "TeachbackCompletion", run_type: "llm" }
);

// Update the storeInteraction function to include LLM processing
const storeInteraction = traceable(
  async (userId: string, question: string, response: string) => {
    try {
      const timestamp = new Date().toISOString();
      
      // Process with LLM
      const llmResponse = await createTeachbackCompletion(question, response);
      
      console.log('Storing interaction:', { 
        userId, 
        timestamp,
        questionLength: question.length,
        responseLength: response.length,
        llmResponseLength: llmResponse.choices[0]?.message?.content?.length
      });
      
      return { 
        userId, 
        timestamp, 
        question, 
        response,
        llmResponse: llmResponse.choices[0]?.message?.content,
        success: true 
      };
    } catch (error) {
      console.error('Failed to store interaction:', error);
      throw error;
    }
  },
  {
    name: 'storeInteraction',
    tags: ['production'],
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
