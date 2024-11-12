// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "HIGHLIGHT_TEXT") {
    console.log(
      "Received HIGHLIGHT_TEXT message with keyword:",
      message.keyword,
    );
    highlightAndScroll(message.keyword);
  } else if (message.type === "REMOVE_HIGHLIGHTS") {
    console.log("Received REMOVE_HIGHLIGHTS message");
    removeHighlights();
  }
});

// Function to highlight and scroll to the keyword
function highlightAndScroll(keyword) {
  if (!keyword) return;

  console.log("Highlighting keyword:", keyword);

  const style = document.createElement("style");
  style.id = "highlight-style";
  style.textContent = `
    .highlighted-keyword {
      background-color: yellow;
      color: black;
      font-weight: bold;
    }
  `;
  document.head.appendChild(style);

  function wrapText(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const keywordRegex = new RegExp(keyword, "gi");
      const matches = node.nodeValue.match(keywordRegex);
      if (matches) {
        const span = document.createElement("span");
        span.className = "highlighted-keyword";
        span.textContent = node.nodeValue;
        node.parentNode.replaceChild(span, node);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      node.childNodes.forEach(wrapText);
    }
  }

  wrapText(document.body);

  const firstHighlight = document.querySelector(".highlighted-keyword");
  if (firstHighlight) {
    firstHighlight.scrollIntoView({ behavior: "smooth" });
  }
}

// Function to remove highlights
function removeHighlights() {
  console.log("Removing highlights");
  document.querySelectorAll(".highlighted-keyword").forEach((element) => {
    element.replaceWith(element.textContent); // Reverts each highlighted element to its original text
  });

  const style = document.getElementById("highlight-style");
  if (style) {
    style.remove();
  }
}
