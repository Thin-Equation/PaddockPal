import json
import os
import google.generativeai as genai
from flask import Flask, jsonify, request, send_file, send_from_directory, Response
from http import HTTPStatus
from dotenv import load_dotenv

load_dotenv()

# F1 Domain Prompt
F1_DOMAIN_PROMPT = """
You are a highly knowledgeable Formula 1 (F1) expert chatbot. Your responses should be:
1. Exclusively focused on Formula 1 racing
2. Accurate and up-to-date through the 2023 season
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
"""

# Configuration
class Config:
    PORT = int(os.environ.get('PORT', 8080))
    API_KEY = os.environ.get("GOOGLE_API_KEY")
    DEFAULT_MODEL = "gemini-1.5-flash"
    
    @staticmethod
    def validate():
        if not Config.API_KEY:
            raise ValueError("GOOGLE_API_KEY environment variable is not set")

# Initialize application
app = Flask(__name__)
app.config.from_object(Config)

Config.validate()
genai.configure(api_key=Config.API_KEY)

class ChatbotError(Exception):
    """Custom exception for chatbot-specific errors"""
    pass

def stream_response(response):
    """Stream the response from the model"""
    try:
        for chunk in response:
            if chunk.text:
                yield f'data: {json.dumps({"text": chunk.text})}\n\n'
    except Exception as e:
        yield f'data: {json.dumps({"error": str(e)})}\n\n'

@app.route("/")
def index() -> Response:
    """Serve the main page"""
    try:
        return send_file('web/index.html')
    except FileNotFoundError:
        return jsonify({"error": "Frontend files not found"}), HTTPStatus.NOT_FOUND

@app.route("/api/generate", methods=["POST"])
def generate_api() -> Response:
    """Handle generation requests"""
    if request.method != "POST":
        return jsonify({"error": "Method not allowed"}), HTTPStatus.METHOD_NOT_ALLOWED
    
    try:
        req_body = request.get_json()
        if not req_body:
            raise ChatbotError("Request body is empty")
        
        content = req_body.get("contents")
        if not content:
            raise ChatbotError("No content provided")
        
        message_text = content[0]['parts'][0]['text'] if isinstance(content, list) else content

        model_name = req_body.get("model", Config.DEFAULT_MODEL)
        model = genai.GenerativeModel(model_name=model_name)
        
        try:
            prompt = f"{F1_DOMAIN_PROMPT}\nUser: {message_text}\nF1 Expert:"
            response = model.generate_content(prompt, stream=True)
            
            return Response(
                stream_response(response),
                content_type='text/event-stream'
            )
        except Exception as e:
            raise ChatbotError(f"Model generation error: {str(e)}")

    except ChatbotError as e:
        return jsonify({"error": str(e)}), HTTPStatus.BAD_REQUEST
    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR


@app.route('/<path:path>')
def serve_static(path: str) -> Response:
    """Serve static files"""
    try:
        return send_from_directory('web', path)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), HTTPStatus.NOT_FOUND

if __name__ == "__main__":
    app.run(port=Config.PORT, debug=False)
