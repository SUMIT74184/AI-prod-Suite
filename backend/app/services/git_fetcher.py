import os
import shutil
import tempfile
import subprocess
import logging
from urllib.parse import urlparse
from typing import List, Dict

logger = logging.getLogger(__name__)

# List of extensions we want to scan (ignore images, binaries, etc.)
SUPPORTED_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".c", ".cpp", 
    ".h", ".hpp", ".go", ".rs", ".rb", ".php", ".cs"
}

# Directories to always skip
IGNORE_DIRS = {
    ".git", "node_modules", "venv", ".venv", "env", "__pycache__", 
    "dist", "build", "out", "target", "vendor"
}

# Maximum files to process from a single repo to avoid huge LLM contexts
MAX_FILES_TO_SCAN = 20

class GitFetcher:
    """
    Utility to clone a GitHub/GitLab repository and extract source code files.
    """

    @staticmethod
    def _inject_token(url: str, token: str) -> str:
        """Injects a PAT into the git URL for private repos."""
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            raise ValueError("Invalid URL format.")
            
        # e.g. https://github.com/user/repo -> https://oauth2:TOKEN@github.com/user/repo
        # We use oauth2: for GitLab, or just the token for GitHub. Git usually figures it out.
        auth_netloc = f"oauth2:{token}@{parsed.netloc}"
        return parsed._replace(netloc=auth_netloc).geturl()

    @staticmethod
    def clone_and_extract(repo_url: str, token: str | None = None) -> List[Dict[str, str]]:
        """
        Shallow clones a repository, reads its important files, and returns them.
        
        Args:
            repo_url: The URL of the repository.
            token: Optional Personal Access Token for private repos.
            
        Returns:
            A list of dicts: [{"filepath": "src/main.py", "content": "..."}]
        """
        clone_url = GitFetcher._inject_token(repo_url, token) if token else repo_url
        
        temp_dir = tempfile.mkdtemp(prefix="lumina_repo_")
        extracted_files = []
        
        try:
            logger.info("Cloning repository into %s", temp_dir)
            
            # Shallow clone to save time and bandwidth
            cmd = ["git", "clone", "--depth", "1", clone_url, temp_dir]
            
            # Run the git clone command, suppress output for security if token is present
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                logger.error("Git clone failed.")
                raise Exception("Failed to clone repository. Check URL and access permissions.")
                
            logger.info("Clone successful. Scanning files...")
            
            # Traverse directory to find source files
            for root, dirs, files in os.walk(temp_dir):
                # Prune ignored directories
                dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
                
                for file in files:
                    ext = os.path.splitext(file)[1].lower()
                    if ext in SUPPORTED_EXTENSIONS:
                        filepath = os.path.join(root, file)
                        rel_path = os.path.relpath(filepath, temp_dir)
                        
                        try:
                            with open(filepath, "r", encoding="utf-8") as f:
                                content = f.read()
                                if content.strip():  # Skip empty files
                                    extracted_files.append({
                                        "filepath": rel_path,
                                        "content": content
                                    })
                        except Exception as e:
                            logger.warning("Could not read file %s: %s", rel_path, e)
                            
            # Sort files roughly by importance (e.g., prioritize src/, main, index)
            # and limit to MAX_FILES_TO_SCAN
            extracted_files.sort(key=lambda x: (
                0 if "src" in x["filepath"] or "main" in x["filepath"] else 1,
                len(x["filepath"])
            ))
            
            extracted_files = extracted_files[:MAX_FILES_TO_SCAN]
            logger.info("Extracted %d files for analysis.", len(extracted_files))
            
            return extracted_files
            
        finally:
            # Clean up temp directory
            shutil.rmtree(temp_dir, ignore_errors=True)
