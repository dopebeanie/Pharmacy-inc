#!/usr/bin/env python3
"""Static server with HTTP Range support for the player (audio seeking).

Why: `python -m http.server` answers 200 to Range requests, so browsers can
only seek inside already-downloaded bytes. This server answers 206 + sends
Accept-Ranges, so any position is reachable instantly (like GitHub Pages).

Usage (from anywhere):
    python docs/tools/serve.py [port]
    # open http://localhost:8000
"""
import os
import re
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class RangeHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, *args):
        pass  # quiet

    def send_head(self):
        raw = self.path.split("?", 1)[0].split("#", 1)[0]
        path = self.translate_path(raw)
        if os.path.isdir(path):
            return super().send_head()
        try:
            f = open(path, "rb")
        except OSError:
            self.send_error(404, "File not found")
            return None
        size = os.fstat(f.fileno()).st_size
        ctype = self.guess_type(path)
        m = re.match(r"bytes=(\d*)-(\d*)$", (self.headers.get("Range") or "").strip())
        if m and self.command == "GET":
            s, e = m.groups()
            if s == "" and e == "":
                f.close()
                return super().send_head()
            start = int(s) if s else max(0, size - int(e or 0))
            end = int(e) if e else size - 1
            end = min(end, size - 1)
            if start >= size or start > end:
                self.send_error(416, "Requested Range Not Satisfiable")
                f.close()
                return None
            length = end - start + 1
            self.send_response(206)
            self.send_header("Content-Type", ctype)
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Range", "bytes %d-%d/%d" % (start, end, size))
            self.send_header("Content-Length", str(length))
            self.end_headers()
            f.seek(start)
            self.wfile.write(f.read(length))
            f.close()
            return None
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(size))
        self.end_headers()
        return f

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    with ThreadingHTTPServer(("127.0.0.1", port), RangeHandler) as httpd:
        print("Serving %s at http://localhost:%d (Range OK, cache off)" % (ROOT, port))
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
