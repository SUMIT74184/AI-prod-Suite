import sys
import json
import logging
from dotenv import load_dotenv

logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

load_dotenv()

from app.web_research_agent.runner import stream_agent

def main():
    print("Testing stream_agent with dotenv...")
    try:
        for update in stream_agent("RAG vs fine tuning comparison"):
            print("UPDATE:", json.dumps(update))
    except Exception as e:
        print("ERROR:", e)

if __name__ == "__main__":
    main()
