import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// F1 Domain Prompt from the original application
const F1_DOMAIN_PROMPT = `
You are a highly knowledgeable Formula 1 (F1) expert chatbot. Your responses should be:
1. Exclusively focused on Formula 1 racing
2. Accurate and up-to-date through the 2024 season
3. Professional yet engaging
4. Concise but informative
Your knowledge covers:
- Current and historical F1 drivers, teams, and championships
- Technical regulations and car specifications
- Race strategies and tire management
- Circuit details and race history
- F1 rules and procedures
- Notable events and records in F1 history
Guidelines for responses:
- If a query is not F1-related, respond with: "I am designed to answer Formula 1-related questions only."
- For questions about future events, clarify that you can only provide information up to the 2023 season
- Include relevant statistics when appropriate
- Explain technical terms when they're first used
- If uncertain about specific details, acknowledge the limitation
Remember to maintain the excitement and passion that F1 fans have for the sport in your responses.
`;

export async function POST(request: NextRequest) {
  try {
    // Check for API key
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return new NextResponse(JSON.stringify({ 
        error: 'API key is not configured'
      }), { 
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }

    // Parse request body
    const body = await request.json();
    const { contents, model = 'gemini-2.0-flash' } = body;
    
    // Validate request
    if (!contents || !Array.isArray(contents) || contents.length === 0) {
      return new NextResponse(JSON.stringify({ 
        error: 'Invalid request: contents field is required and must be an array'
      }), { 
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    // Get message text from the contents
    let messageText = '';
    if (typeof contents[0] === 'object' && contents[0].parts && contents[0].parts[0]) {
      messageText = contents[0].parts[0].text;
    } else if (typeof contents === 'string') {
      messageText = contents;
    } else {
      messageText = JSON.stringify(contents);
    }

    // Initialize Google Generative AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const generationModel = genAI.getGenerativeModel({ model });

    // Create prompt with F1 domain context
    const prompt = `${F1_DOMAIN_PROMPT}\nUser: ${messageText}\nF1 Expert:`;

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await generationModel.generateContentStream(prompt);
          
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
            }
          }
          controller.close();
        } catch (error) {
          console.error('Generation error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
          );
          controller.close();
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return new NextResponse(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    }), { 
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}