import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

const root = path.resolve("out");
const base = "/tyaga";
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
};

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  const pathname = decodeURIComponent(url.pathname);
  if (!pathname.startsWith(base)) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  const relative = pathname.slice(base.length) || "/";
  let file = path.join(root, relative);
  if (relative.endsWith("/")) {
    file = path.join(file, "index.html");
  } else if (!path.extname(file) && existsSync(path.join(file, "index.html"))) {
    file = path.join(file, "index.html");
  }
  if (!existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404);
    res.end(`missing ${relative}`);
    return;
  }
  res.writeHead(200, {
    "content-type": types[path.extname(file)] ?? "application/octet-stream",
  });
  createReadStream(file).pipe(res);
});

server.listen(4173, "127.0.0.1", () => {
  console.log("preview http://127.0.0.1:4173/tyaga/");
});
