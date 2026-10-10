import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.basename(__dirname) === "dist" ? path.join(__dirname, "..") : __dirname;
const PORT = 3000;
const sitesPath = path.join(PROJECT_ROOT, "data", "sites.json");
const sites = JSON.parse(fs.readFileSync(sitesPath, "utf-8"));
// Приводим keywords к строке один раз при загрузке — так быстрее и проще
const normalizedSites = sites.map((site) => ({
    ...site,
    description: site.description ?? "",
    keywordsStr: Array.isArray(site.keywords)
        ? site.keywords.join(" ")
        : (site.keywords ?? ""),
}));
function search(query) {
    const words = query
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (words.length === 0)
        return [];
    const results = normalizedSites.map((site) => {
        const title = site.title.toLowerCase();
        const description = site.description.toLowerCase();
        const keywords = site.keywordsStr.toLowerCase();
        const url = site.url.toLowerCase();
        const haystack = `${title} ${description} ${keywords} ${url}`;
        let score = 0;
        for (const word of words) {
            if (title.includes(word))
                score += 10;
            if (keywords.includes(word))
                score += 5;
            if (description.includes(word))
                score += 3;
            if (haystack.includes(word))
                score += 1;
        }
        return { ...site, score };
    });
    return results.filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
}
function serveStatic(res, filePath, contentType) {
    try {
        const data = fs.readFileSync(filePath);
        res.writeHead(200, { "Content-Type": contentType });
        res.end(data);
    }
    catch {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("404 Not Found");
    }
}
const MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
};
const server = http.createServer((req, res) => {
    const url = new URL(req.url || "/", `http://localhost:${PORT}`);
    if (url.pathname === "/api/search") {
        const query = url.searchParams.get("q") || "";
        const results = search(query);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ query, results }));
        return;
    }
    if (url.pathname === "/data/sites.json") {
        serveStatic(res, path.join(PROJECT_ROOT, "data", "sites.json"), MIME[".json"]);
        return;
    }
    let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
    filePath = path.join(PROJECT_ROOT, "public", filePath);
    const ext = path.extname(filePath);
    serveStatic(res, filePath, MIME[ext] || "application/octet-stream");
});
server.listen(PORT, () => {
    console.log(`Biscotti Search запущен: http://localhost:${PORT}`);
});
