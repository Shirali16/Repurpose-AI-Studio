#!/usr/bin/env python3
"""
Repurpose AI Studio - Zero-Crash Local Server
Automatically sets correct MIME types for ES6 modules and launches the default browser.
"""

import http.server
import socketserver
import os
import sys
import webbrowser
from pathlib import Path

# Safe encoding for Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

PORT = 8080
DIRECTORY = Path(__file__).resolve().parent

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIRECTORY), **kwargs)

    def guess_type(self, path):
        # Ensure .js files are served strictly as application/javascript for ES modules on Windows
        p_str = str(path).lower()
        if p_str.endswith(".js") or p_str.endswith(".mjs"):
            return "application/javascript"
        if p_str.endswith(".css"):
            return "text/css"
        if p_str.endswith(".html"):
            return "text/html"
        if p_str.endswith(".json"):
            return "application/json"
        if p_str.endswith(".svg"):
            return "image/svg+xml"
        return super().guess_type(path)

    def end_headers(self):
        # Enable CORS and disable cache during development/evaluation
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

def run():
    os.chdir(DIRECTORY)
    
    # Check for available port
    for p in range(PORT, PORT + 20):
        try:
            with socketserver.TCPServer(("127.0.0.1", p), CustomHandler) as httpd:
                print("==================================================")
                print(f"  [+] Repurpose AI Studio is LIVE!")
                print(f"  [+] URL: http://127.0.0.1:{p}")
                print(f"  [+] Directory: {DIRECTORY}")
                print("  [+] Press Ctrl+C to stop the server")
                print("==================================================")
                sys.stdout.flush()
                try:
                    webbrowser.open(f"http://localhost:{p}")
                except Exception:
                    pass
                httpd.serve_forever()
                break
        except OSError as e:
            if "Address already in use" in str(e) or getattr(e, 'errno', None) in (98, 10048):
                continue
            else:
                raise e

if __name__ == '__main__':
    try:
        run()
    except KeyboardInterrupt:
        print("\nStudio server stopped cleanly.")
        sys.exit(0)
