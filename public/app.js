const form = document.getElementById("search-form");
const input = document.getElementById("query");
const resultsEl = document.getElementById("results");
const statsEl = document.getElementById("stats");
const indexSizeEl = document.getElementById("index-size");

fetch("/data/sites.json")
  .then((r) => r.json())
  .then((sites) => {
    indexSizeEl.textContent = String(sites.length);
  })
  .catch(() => {
    indexSizeEl.textContent = "—";
  });

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;

  const url = new URL(window.location);
  url.searchParams.set("q", q);
  window.history.pushState({}, "", url);

  doSearch(q);
});

document.querySelectorAll(".quick-links a").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    input.value = a.dataset.q;
    form.dispatchEvent(new Event("submit"));
  });
});

const initialQ = new URLSearchParams(window.location.search).get("q");
if (initialQ) {
  input.value = initialQ;
  doSearch(initialQ);
}

document.getElementById("about").addEventListener("click", (e) => {
  e.preventDefault();
  alert(
    "Biscotti Search v1.0\n\n" +
      "Поисковик.\n" +
      "Ищет по заранее заданной базе сайтов (data/sites.json).\n\n" +
      "Сделано на TypeScript + Node.js без зависимостей."
  );
});

async function doSearch(query) {
  resultsEl.innerHTML = '<div class="no-results">Поиск...</div>';
  statsEl.textContent = "";

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (data.results.length === 0) {
      statsEl.textContent = `По запросу «${escapeHtml(query)}» ничего не найдено.`;
      resultsEl.innerHTML =
        '<div class="no-results">Попробуйте другие ключевые слова.</div>';
      return;
    }

    statsEl.textContent = `Найдено результатов: ${data.results.length} по запросу «${escapeHtml(query)}»`;

    resultsEl.innerHTML = data.results
      .map(
        (r) => `
        <div class="result">
          <a class="title" href="${r.url}" target="_blank" rel="noopener">
            ${escapeHtml(r.title)}
          </a>
          <div class="url">${escapeHtml(r.url)}</div>
          <div class="desc">${escapeHtml(r.description)}</div>
        </div>
      `
      )
      .join("");
  } catch (err) {
    statsEl.textContent = "Ошибка при поиске.";
    resultsEl.innerHTML = '<div class="no-results">Сервер недоступен.</div>';
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}