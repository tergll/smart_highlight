import os
from groq import Groq
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Set up Groq API client
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

def summarize_text(text):
    """Use Groq API to summarize the article in 3-4 sentences."""
    response = client.chat.completions.create(
        model="mixtral-8x7b-32768",
        messages=[
            {"role": "system", "content": "Summarize the following article in 3-4 sentences. Keep it concise."},
            {"role": "user", "content": text}
        ]
    )
    return response.choices[0].message.content.strip()

def extract_relevant_sentences(text, prompt):
    """Use Groq API to find the most relevant sentences for highlighting."""
    response = client.chat.completions.create(
        model="mixtral-8x7b-32768",
        messages=[
            {"role": "system", "content": 
                "From the article below, return the exact sentences in full from start to finish without any changes that answer the user's question. "
                "If no Question is provided, return the sentences that best summarize the article. "
                "No explanations, summaries, or bullet points. "
                "Ensure each sentence is a standalone sentence from the article, separated by newlines."},
            {"role": "user", "content": f"Article:\n{text}\n\nQuestion: {prompt}"}
        ]
    )

    raw_response = response.choices[0].message.content.strip()
    extracted_sentences = raw_response.split("\n")

    cleaned_sentences = [s.strip().strip("\"'") for s in extracted_sentences if len(s.strip()) > 3]

    print("\n✅ DEBUG: Extracted Sentences (Cleaned):", cleaned_sentences)  

    return cleaned_sentences if cleaned_sentences else ["⚠️ No exact matches found."]



@app.route("/process-text", methods=["POST"])
def process_text():
    """Handles summarization and sentence highlighting."""
    try:
        data = request.json
        text = data.get("text", "").strip()
        prompt = data.get("prompt", "").strip()

        if not text:
            return jsonify({"error": "No text provided"}), 400

        # Generate a short summary
        summary = summarize_text(text)

        # Extract relevant sentences for highlighting
        highlighted_sentences = extract_relevant_sentences(text, prompt) #if prompt else []

        return jsonify({
            "summary": summary,
            "highlights": highlighted_sentences
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
