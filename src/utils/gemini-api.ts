interface GeminiContent {
  role: string;
  parts: { text: string }[];
}

interface GeminiParams {
  model?: string;
  contents: GeminiContent[];
}

/**
 * Calls the Gemini model with the given content,
 * streaming output (as an async generator function).
 */
export async function* streamGemini({
  model = 'gemini-2.0-flash',
  contents = [],
}: GeminiParams) {
  // Send the prompt to the API endpoint
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, contents })
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  yield* streamResponseChunks(response);
}

/**
 * A helper that streams text output chunks from a fetch() response.
 */
async function* streamResponseChunks(response: Response) {
  let buffer = '';

  const CHUNK_SEPARATOR = '\n\n';

  const processBuffer = async function* (streamDone = false) {
    while (true) {
      let flush = false;
      let chunkSeparatorIndex = buffer.indexOf(CHUNK_SEPARATOR);
      if (streamDone && chunkSeparatorIndex < 0) {
        flush = true;
        chunkSeparatorIndex = buffer.length;
      }
      if (chunkSeparatorIndex < 0) {
        break;
      }

      let chunk = buffer.substring(0, chunkSeparatorIndex);
      buffer = buffer.substring(chunkSeparatorIndex + CHUNK_SEPARATOR.length);
      chunk = chunk.replace(/^data:\s*/, '').trim();
      if (!chunk) {
        if (flush) break;
        continue;
      }
      
      try {
        const { error, text } = JSON.parse(chunk);
        if (error) {
          console.error(error);
          throw new Error(error?.message || JSON.stringify(error));
        }
        yield text;
      } catch (error) {
        console.error('Failed to parse chunk:', chunk, error);
        throw new Error(`Invalid response format: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      if (flush) break;
    }
  };

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += new TextDecoder().decode(value);
      yield* processBuffer();
    }
  } finally {
    reader.releaseLock();
  }

  yield* processBuffer(true);
}