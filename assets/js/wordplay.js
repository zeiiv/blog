document.addEventListener("DOMContentLoaded", () => {
  const pinned = document.querySelector(".pinned-word");
  const pile = document.querySelector(".wordpile");

  if (!pinned || !pile) return;

  const getWordElements = () => pile.querySelectorAll(".word-item .word");

  getWordElements().forEach((wordEl) => {
    wordEl.addEventListener("click", () => {
      const newWord = wordEl.textContent.trim();
      const oldWord = pinned.textContent.trim();

      if (newWord === oldWord) return; // No action if same word

      // Clone both words for animation
      const cloneNew = wordEl.cloneNode(true);
      const cloneOld = pinned.cloneNode(true);
      document.body.append(cloneNew, cloneOld);

      // Get bounding boxes
      const newBox = wordEl.getBoundingClientRect();
      const pinnedBox = pinned.getBoundingClientRect();
      const wordEls = getWordElements();
      const firstPileBox = wordEls.length > 0 ? wordEls[0].getBoundingClientRect() : null;

      // Animate new word → to pinned position
      gsap.set(cloneNew, {
        position: "fixed",
        top: newBox.top,
        left: newBox.left,
        margin: 0,
        zIndex: 9999,
      });

      gsap.to(cloneNew, {
        duration: 0.45,
        x: pinnedBox.left - newBox.left,
        y: pinnedBox.top - newBox.top,
        ease: "power2.out",
        onComplete: () => {
          const enSpan = pinned.querySelector(".en");
          const heSpan = pinned.querySelector(".he");
          if (enSpan) enSpan.textContent = newWord;
          if (heSpan) heSpan.textContent = newWord;
          cloneNew.remove();
        },
      });

      // Animate old word → to start of pile
      if (firstPileBox) {
        gsap.set(cloneOld, {
          position: "fixed",
          top: pinnedBox.top,
          left: pinnedBox.left,
          margin: 0,
          zIndex: 9998,
        });

        gsap.to(cloneOld, {
          duration: 0.45,
          x: firstPileBox.left - pinnedBox.left,
          y: firstPileBox.top - pinnedBox.top,
          ease: "power2.in",
          onComplete: () => cloneOld.remove(),
        });
      }

      // Reorder real DOM: clicked word removed, old word prepended
      wordEl.remove();
      const newOldEl = document.createElement("li");
      newOldEl.className = "word-item";
      const newOldLink = document.createElement("a");
      newOldLink.className = "word";
      newOldLink.href = "#"; // or reuse old href if tracked
      newOldLink.innerHTML = `
        <span class="en">${oldWord}</span>
        <span class="he">${oldWord}</span>
      `;
      newOldEl.appendChild(newOldLink);
      pile.prepend(newOldEl);

      newOldLink.addEventListener("click", () => newOldLink.click());
    });
  });
});