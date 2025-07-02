document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("search-input");
    const dropdown = document.getElementById("search-results");
  
    input.addEventListener("input", async () => {
      const query = input.value.trim();
      if (!query) {
        dropdown.style.display = "none";
        return;
      }
  
      try {
        const res = await fetch(`/buscar?q=${encodeURIComponent(query)}`);
        const data = await res.json();
  
        if (data.length === 0) {
          dropdown.innerHTML = `<div class="dropdown-item disabled">No se encontraron resultados</div>`;
          dropdown.style.display = "block";
          return;
        }
  
        dropdown.innerHTML = data.map(item => `
          <a href="${item.url}" class="dropdown-item">
            <strong>${item.titulo}</strong><br><small>${item.contenido}</small>
          </a>
        `).join("");
        dropdown.style.display = "block";
      } catch (err) {
        console.error("Error en búsqueda:", err);
      }
    });
  
    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target) && e.target !== input) {
        dropdown.style.display = "none";
      }
    });
  });
  