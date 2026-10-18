(() => {
  const $ = (id) => document.getElementById(id);
  const board = $("mahjong-board");
  if (!board) return;

  const faces = [
    { id: "duck", label: "Patito", image: "./mahjong-assets/duckling.jpg" },
    { id: "panda", label: "Panda", image: "./mahjong-assets/panda.jpg" },
    { id: "jeep", label: "Jeep", image: "./mahjong-assets/jeep.jpg" },
    { id: "flowers", label: "Dalias", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSmK5mGnkgCktl7hHzqJnZ2-0L9crExKgrZJimt_K9ohA&s=10" },
    { id: "cocoa", label: "Chocolate caliente", image: "./mahjong-assets/cocoa.jpg" },
    { id: "fairy", label: "Campanita", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQfkZ8p226eIWw66ATKvcZ-Q7tUXGzR0GCS0DUWuDkKsg&s=10" },
  ];
  const photoCredits = [
    ["Patito", "imagen proporcionada por ti", "https://fbi.cults3d.com/uploaders/25484882/illustration-file/b235c56f-b744-496e-bfc5-6845a94221c0/pollito-con-cuchillo.jpg"],
    ["Panda", "imagen proporcionada por ti", "https://www.magnific.com/es/fotos-vectores-gratis/panda"],
    ["Jeep y pato", "imagen proporcionada por ti", "https://dg2rmv9ji96aj.cloudfront.net/media/product/1/_/1718347781_1.jpg"],
    ["Dalias", "imagen proporcionada por ti", "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSmK5mGnkgCktl7hHzqJnZ2-0L9crExKgrZJimt_K9ohA&s=10"],
    ["Chocolate caliente", "imagen proporcionada por ti", "https://www.pngtree.com/"],
    ["Campanita", "imagen proporcionada por ti", "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQfkZ8p226eIWw66ATKvcZ-Q7tUXGzR0GCS0DUWuDkKsg&s=10"],
  ];

  const rectangle = (left, top, width, height) => Array.from(
    { length: width * height },
    (_, index) => [left + (index % width), top + Math.floor(index / width)],
  );
  const levels = [
    {
      name: "Pequeño",
      rows: 4,
      columns: 6,
      layers: [
        { layer: 0, cells: rectangle(0, 0, 6, 4) },
        { layer: 1, cells: rectangle(1, 1, 4, 2) },
        { layer: 2, cells: rectangle(2, 1, 2, 2) },
      ],
    },
    {
      name: "Mediano",
      rows: 6,
      columns: 8,
      layers: [
        { layer: 0, cells: rectangle(0, 0, 8, 6) },
        { layer: 1, cells: rectangle(1, 1, 6, 4) },
        { layer: 2, cells: rectangle(2, 1, 4, 4) },
        { layer: 3, cells: rectangle(3, 2, 2, 2) },
      ],
    },
    {
      name: "Grande",
      rows: 8,
      columns: 10,
      layers: [
        { layer: 0, cells: rectangle(0, 0, 10, 8) },
        { layer: 1, cells: rectangle(1, 1, 8, 6) },
        { layer: 2, cells: rectangle(2, 2, 6, 4) },
        { layer: 3, cells: rectangle(3, 3, 4, 2) },
        { layer: 4, cells: rectangle(4, 3, 2, 2) },
      ],
    },
  ];

  function shuffled(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const otherIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[otherIndex]] = [result[otherIndex], result[index]];
    }
    return result;
  }

  let levelIndex = 0;
  let tiles = [];
  let selected = [];
  let matchedPairs = 0;
  let moves = 0;
  let busy = false;
  let hintTimeout = 0;
  let resolutionTimeout = 0;
  let tileButtons = new Map();

  function createLayout(level) {
    const result = [];
    level.layers.forEach(({ layer, cells }) => {
      cells.forEach(([x, y], index) => result.push({
        id: `${layer}-${x}-${y}-${index}`,
        x,
        y,
        layer,
        face: null,
        removed: false,
        matching: false,
      }));
    });
    return result;
  }

  function isFree(tile, remaining) {
    const topLayer = Math.max(...remaining.filter((other) => !other.removed).map((other) => other.layer));
    return tile.layer === topLayer;
  }

  function dealSolvableFaces(remaining) {
    const live = [...remaining];
    const pairs = [];
    while (live.length) {
      const available = live.filter((tile) => isFree(tile, live));
      if (available.length < 2) {
        throw new Error("El diseño de este nivel no tiene suficientes fichas libres para continuar.");
      }
      const highestLayer = Math.max(...available.map((tile) => tile.layer));
      const topTiles = available.filter((tile) => tile.layer === highestLayer);
      const first = topTiles[Math.floor(Math.random() * topTiles.length)];
      const sameLayer = topTiles.filter((tile) => tile !== first);
      const candidates = sameLayer.length
        ? sameLayer
        : available.filter((tile) => tile !== first);
      const farthest = Math.max(...candidates.map((tile) => Math.abs(tile.x - first.x) + Math.abs(tile.y - first.y)));
      const partners = candidates.filter((tile) => Math.abs(tile.x - first.x) + Math.abs(tile.y - first.y) === farthest);
      const second = partners[Math.floor(Math.random() * partners.length)];
      pairs.push([first, second]);
      live.splice(live.indexOf(first), 1);
      live.splice(live.indexOf(second), 1);
    }

    const faceCounts = faces.map((face, index) => ({
      face,
      count: Math.floor(pairs.length / faces.length) + (index < pairs.length % faces.length ? 1 : 0),
    }));
    const adjacentPairs = pairs.map(([first, second], pairIndex) => pairs
      .map(([otherFirst, otherSecond], otherIndex) => ({
        index: otherIndex,
        tiles: [otherFirst, otherSecond],
      }))
      .filter(({ index: otherIndex, tiles: otherTiles }) => otherIndex !== pairIndex
        && [first, second].some((tile) => otherTiles.some((other) => tile.layer === other.layer
          && Math.abs(tile.x - other.x) <= 1
          && Math.abs(tile.y - other.y) <= 1
          && (tile.x !== other.x || tile.y !== other.y))))
      .map(({ index: otherIndex }) => otherIndex));
    const assignedFaces = Array(pairs.length);
    const assignmentOrder = shuffled(pairs.map((_, index) => index));
    assignmentOrder.forEach((pairIndex) => {
      const choices = faceCounts.map((entry, index) => ({
        ...entry,
        index,
        penalty: adjacentPairs[pairIndex].reduce((total, neighborIndex) => (
          total + (assignedFaces[neighborIndex]?.id === entry.face.id ? 1 : 0)
        ), 0),
        tieBreaker: Math.random(),
      })).filter(({ count }) => count > 0).sort((a, b) => a.penalty - b.penalty || a.tieBreaker - b.tieBreaker);
      const chosen = choices[0];
      faceCounts[chosen.index].count -= 1;
      assignedFaces[pairIndex] = chosen.face;
    });

    pairs.forEach(([first, second], pairIndex) => {
      first.face = assignedFaces[pairIndex];
      second.face = assignedFaces[pairIndex];
      first.pairId = pairIndex;
      second.pairId = pairIndex;
    });
  }

  function availableTiles() {
    const remaining = tiles.filter((tile) => !tile.removed && !tile.matching);
    const topLayer = Math.max(...remaining.map((tile) => tile.layer));
    return remaining.filter((tile) => tile.layer === topLayer);
  }

  function tileFace(tile) {
    const image = document.createElement("img");
    image.className = "mahjong-photo";
    image.src = tile.face.image;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    return image;
  }

  function renderPhotoCredits() {
    const list = $("mahjong-photo-credits");
    photoCredits.forEach(([subject, artist, source, license, licenseUrl]) => {
      const item = document.createElement("li");
      const credit = `${subject} — ${artist}`;
      if (source) {
        const sourceLink = document.createElement("a");
        sourceLink.href = source;
        sourceLink.target = "_blank";
        sourceLink.rel = "noopener noreferrer";
        sourceLink.textContent = credit;
        item.append(sourceLink);
      } else {
        item.append(document.createTextNode(credit));
      }
      item.append(document.createTextNode(license
        ? ` · ${license}`
        : " · referencia proporcionada por ti"));
      if (licenseUrl) {
        const licenseLink = document.createElement("a");
        licenseLink.href = licenseUrl;
        licenseLink.target = "_blank";
        licenseLink.rel = "noopener noreferrer";
        licenseLink.textContent = license;
        item.append(document.createTextNode(" · "), licenseLink);
      }
      list.append(item);
    });
  }

  function updateHud() {
    const totalPairs = tiles.length / 2;
    $("mahjong-level").textContent = `Nivel ${levelIndex + 1} de ${levels.length} · ${levels[levelIndex].name}`;
    $("mahjong-pairs").textContent = `Parejas: ${matchedPairs}/${totalPairs}`;
    $("mahjong-moves").textContent = `Movimientos: ${moves}`;
    $("mahjong-progress").value = totalPairs ? (matchedPairs / totalPairs) * 100 : 0;
  }

  function renderBoard() {
    const level = levels[levelIndex];
    board.style.gridTemplateColumns = `repeat(${level.columns}, minmax(0, 1fr))`;
    board.style.gridTemplateRows = `repeat(${level.rows}, minmax(0, 1fr))`;
    board.style.aspectRatio = `${level.columns} / ${level.rows * 1.13}`;
    if (tileButtons.size !== tiles.length) {
      board.replaceChildren();
      tileButtons.clear();
      tiles.forEach((tile) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "mahjong-tile";
        button.dataset.tileId = tile.id;
        button.dataset.kind = tile.face.id;
        button.dataset.layer = String(tile.layer);
        button.style.gridColumn = String(tile.x + 1);
        button.style.gridRow = String(tile.y + 1);
        button.style.zIndex = String(tile.layer + 1);
        if (tile.layer > 0) {
          button.style.transform = `translate(${tile.layer * 12}%, ${tile.layer * -12}%)`;
        }
        button.append(tileFace(tile));
        tileButtons.set(tile.id, button);
        board.append(button);
      });
    }

    const available = new Set(availableTiles());
    tiles.forEach((tile) => {
      const button = tileButtons.get(tile.id);
      button.hidden = tile.removed;
      const isAvailable = available.has(tile);
      button.classList.toggle("is-available", isAvailable && !busy);
      button.classList.toggle("is-covered", !isAvailable);
      button.disabled = !isAvailable || busy;
      button.setAttribute("aria-label", `${tile.face.label}${isAvailable ? ", disponible" : ", bloqueada"}`);
      button.setAttribute("aria-disabled", String(!isAvailable || busy));
      button.classList.toggle("is-selected", selected.includes(tile.id));
    });
    updateHud();
  }

  function beginLevel(index) {
    window.clearTimeout(resolutionTimeout);
    window.clearTimeout(hintTimeout);
    resolutionTimeout = 0;
    hintTimeout = 0;
    levelIndex = index;
    matchedPairs = 0;
    moves = 0;
    selected = [];
    busy = false;
    tileButtons.clear();
    $("mahjong-level-overlay").hidden = true;
    $("mahjong-board").hidden = false;
    $("mahjong-skip-level").disabled = false;
    tiles = createLayout(levels[levelIndex]);
    dealSolvableFaces(tiles);
    $("mahjong-message").textContent = "Toca o haz clic en una ficha libre para empezar.";
    renderBoard();
  }

  function showLevelComplete() {
    const isFinal = levelIndex === levels.length - 1;
    $("mahjong-overlay-title").textContent = isFinal ? "¡Reto completado! 🎉" : `¡Nivel ${levelIndex + 1} completado! ✨`;
    $("mahjong-overlay-copy").textContent = isFinal
      ? "¡Lo lograste! Limpiaste los tres tableros y encontraste todas las parejas. Hay otra sorpresa esperándote…"
      : "¡Muy bien! El siguiente tablero tiene más fichas, pero tú puedes.";
    $("mahjong-next").textContent = isFinal ? "Descubrir la sorpresa" : "Siguiente nivel →";
    $("mahjong-level-overlay").hidden = false;
    $("mahjong-skip-level").disabled = true;
    $("mahjong-message").textContent = isFinal
      ? "¡Completaste el reto Mahjong de cumpleaños!"
      : "¡Tablero limpio! Prepárate para el siguiente nivel.";
  }

  function chooseTile(tile) {
    if (busy || !isFree(tile, tiles.filter((entry) => !entry.removed))) return;
    if (selected.includes(tile.id)) {
      selected = selected.filter((id) => id !== tile.id);
      $("mahjong-message").textContent = "Ficha deseleccionada. Elige otra ficha libre.";
      renderBoard();
      return;
    }
    selected.push(tile.id);
    if (selected.length < 2) {
      $("mahjong-message").textContent = `Elegiste ${tile.face.label}. Busca otra igual.`;
      renderBoard();
      return;
    }

    moves += 1;
    const [firstId, secondId] = selected;
    const first = tiles.find((entry) => entry.id === firstId);
    const second = tiles.find((entry) => entry.id === secondId);
    selected = [];
    if (first.face.id === second.face.id) {
      first.matching = true;
      second.matching = true;
      $("mahjong-message").textContent = `¡Pareja encontrada! ${first.face.label} ✨`;
      busy = true;
      renderBoard();
      resolutionTimeout = window.setTimeout(() => {
        first.removed = true;
        second.removed = true;
        first.matching = false;
        second.matching = false;
        matchedPairs += 1;
        busy = false;
        resolutionTimeout = 0;
        renderBoard();
        if (tiles.every((entry) => entry.removed)) showLevelComplete();
        else $("mahjong-message").textContent = "¡Bien! Ya despejaste esta capa; ahora puedes jugar las fichas de abajo.";
      }, 360);
      return;
    }

    busy = true;
    renderBoard();
    const firstButton = tileButtons.get(first.id);
    const secondButton = tileButtons.get(second.id);
    firstButton?.classList.add("is-miss");
    secondButton?.classList.add("is-miss");
    $("mahjong-message").textContent = "No son iguales. Observa el símbolo y prueba con otra ficha.";
    resolutionTimeout = window.setTimeout(() => {
      selected = [];
      busy = false;
      resolutionTimeout = 0;
      firstButton?.classList.remove("is-miss");
      secondButton?.classList.remove("is-miss");
      renderBoard();
    }, 430);
  }

  function showHint() {
    window.clearTimeout(hintTimeout);
    const free = availableTiles();
    const pair = free.find((tile, index) => free.slice(index + 1).some((other) => other.face.id === tile.face.id));
    if (!pair) {
      $("mahjong-message").textContent = "No hay una pareja en esta capa. Despeja la capa superior para continuar.";
      return;
    }
    const partner = free.find((tile) => tile.id !== pair.id && tile.face.id === pair.face.id);
    const first = tileButtons.get(pair.id);
    const second = tileButtons.get(partner.id);
    first?.classList.add("is-selected");
    second?.classList.add("is-selected");
    $("mahjong-message").textContent = `Pista: hay una pareja libre de ${pair.face.label}.`;
    hintTimeout = window.setTimeout(() => {
      first?.classList.remove("is-selected");
      second?.classList.remove("is-selected");
    }, 1200);
  }

  function shuffleRemaining() {
    beginLevel(levelIndex);
    $("mahjong-message").textContent = "Nuevo tablero listo: el nivel vuelve a empezar con una solución posible.";
  }

  function skipCurrentLevel() {
    if (busy || !$("mahjong-level-overlay").hidden) return;
    selected = [];
    tiles.forEach((tile) => {
      tile.removed = true;
      tile.matching = false;
    });
    matchedPairs = tiles.length / 2;
    renderBoard();
    $("mahjong-message").textContent = "Nivel pasado temporalmente para probar el siguiente.";
    showLevelComplete();
  }

  $("launch-race").addEventListener("click", () => {
    $("birthday-race").hidden = false;
    $("birthday-race").scrollIntoView({ behavior: "smooth", block: "start" });
    if (!tiles.length) beginLevel(0);
  });

  board.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tile-id]");
    if (!button || button.getAttribute("aria-disabled") === "true") return;
    const tile = tiles.find((entry) => entry.id === button.dataset.tileId);
    if (tile) chooseTile(tile);
  });

  $("mahjong-hint").addEventListener("click", showHint);
  $("mahjong-shuffle").addEventListener("click", shuffleRemaining);
  $("mahjong-restart").addEventListener("click", () => beginLevel(levelIndex));
  $("mahjong-skip-level").addEventListener("click", skipCurrentLevel);
  $("mahjong-next").addEventListener("click", () => {
    if (levelIndex < levels.length - 1) {
      beginLevel(levelIndex + 1);
      $("birthday-race").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    $("race-surprise").hidden = false;
    $("race-surprise").scrollIntoView({ behavior: "smooth", block: "center" });
  });

  const gift = $("race-surprise");
  const giftPress = $("race-gift-press");
  const giftKey = $("race-gift-key");
  const giftStatus = $("race-gift-status");
  const giftMessage = $("race-gift-message");
  const sparkles = $("race-gift-sparkles");
  const lettersButton = $("launch-gift-game");
  const lettersLockStatus = $("gift-game-lock-status");
  const sparkleColors = ["#f26475", "#ffd82f", "#79aee8", "#7eb780", "#a779c5"];

  function openGift() {
    if (gift.classList.contains("is-open")) return;
    gift.classList.add("is-open");
    giftPress.disabled = true;
    giftPress.setAttribute("aria-label", "El regalo está abierto");
    giftStatus.textContent = "Toca la llave dorada para desbloquear las tres cartas.";
    giftKey.hidden = false;
    window.requestAnimationFrame(() => giftKey.classList.add("is-visible"));
    for (let index = 0; index < 32; index += 1) {
      const sparkle = document.createElement("span");
      sparkle.style.setProperty("--sparkle-x", `${(index * 37) % 100}%`);
      sparkle.style.setProperty("--sparkle-color", sparkleColors[index % sparkleColors.length]);
      sparkle.style.setProperty("--sparkle-delay", `${(index % 12) * 75}ms`);
      sparkles.append(sparkle);
    }
  }

  function unlockLetters() {
    if (giftKey.hidden) return;
    lettersButton.disabled = false;
    lettersButton.setAttribute("aria-disabled", "false");
    lettersLockStatus.classList.remove("coming-soon");
    lettersLockStatus.classList.add("game-action");
    lettersLockStatus.textContent = "🔓 Ya puedes abrir las cartas";
    giftKey.disabled = true;
    giftKey.hidden = true;
    giftStatus.textContent = "";
    giftMessage.textContent = "¡Encontraste la llave! Ya puedes abrir las tres cartas.";
    giftMessage.hidden = false;
  }

  giftPress.addEventListener("click", openGift);
  giftKey.addEventListener("click", unlockLetters);

  lettersButton.addEventListener("click", () => {
    if (lettersButton.disabled) return;
    const lettersSection = $("birthday-letters");
    lettersSection.hidden = false;
    lettersSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelectorAll(".letter-item").forEach((letterItem) => {
    const letterToggle = letterItem.querySelector(".letter-cover");
    const letterNote = letterItem.querySelector(".letter-note");
    const letterStatus = letterItem.querySelector(".letter-status");
    letterToggle.addEventListener("click", () => {
      const isOpen = letterToggle.getAttribute("aria-expanded") !== "true";
      letterItem.classList.toggle("is-open", isOpen);
      letterToggle.setAttribute("aria-expanded", String(isOpen));
      letterToggle.setAttribute("aria-label", `${isOpen ? "Cerrar" : "Abrir"} la carta`);
      letterNote.setAttribute("aria-hidden", String(!isOpen));
      letterStatus.textContent = `Carta ${isOpen ? "abierta" : "cerrada"}`;
    });
  });

  renderPhotoCredits();
})();
