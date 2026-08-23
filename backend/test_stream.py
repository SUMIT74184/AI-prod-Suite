import sys
import json
from app.web_research_agent.runner import stream_agent

def main():
    print("Testing stream_agent...")
    try:
        for update in stream_agent("what is react server components"):
            print("UPDATE:", json.dumps(update))
    except Exception as e:
        print("ERROR:", e)

if __name__ == "__main__":
    main()
