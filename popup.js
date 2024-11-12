const searchButton = document.getElementById("searchButton");
const cancelButton = document.getElementById("cancelButton");
const searchInput = document.getElementById("searchInput");
const resultsContainer = document.getElementById("results");
const loadingSpinner = document.getElementById("loadingSpinner");
const actionsContainer = document.getElementById("actions");

// Load stored results, keyword, and Cancel button state when the popup opens
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(
    ["searchResults", "searchKeyword", "cancelButtonVisible"],
    (data) => {
      if (data.searchResults) {
        displayResults(data.searchResults); // Display stored results
      }
      if (data.searchKeyword) {
        searchInput.value = data.searchKeyword; // Restore the keyword in the search input
      }
      if (data.cancelButtonVisible) {
        actionsContainer.classList.remove("hidden"); // Show Cancel button if previously visible
      }
    },
  );
});

// Start search
searchButton.addEventListener("click", () => {
  const keyword = searchInput.value.trim();
  if (keyword) {
    // Start loading animation and show cancel button
    loadingSpinner.classList.remove("hidden");
    actionsContainer.classList.remove("hidden");
    resultsContainer.innerHTML = ""; // Clear previous results

    // Store the Cancel button visibility state
    chrome.storage.local.set({ cancelButtonVisible: true });

    // Send the search keyword to the background script
    chrome.runtime.sendMessage({ type: "SEARCH", keyword }, (response) => {
      loadingSpinner.classList.add("hidden"); // Hide loading spinner

      if (chrome.runtime.lastError) {
        console.error("Runtime error:", chrome.runtime.lastError.message);
        resultsContainer.textContent = "Error during search. Please try again.";
        return;
      }

      if (response && response.results) {
        displayResults(response.results);

        // Store the results and keyword in Chrome's storage
        chrome.storage.local.set({
          searchResults: response.results,
          searchKeyword: keyword,
        });
      } else if (response && response.error) {
        console.error("Search error:", response.error);
        resultsContainer.textContent = "Error during search. Please try again.";
      } else {
        resultsContainer.textContent = "No results found.";
      }
    });
  }
});

// Display results
function displayResults(results) {
  resultsContainer.innerHTML = ""; // Clear any previous results
  console.log("results:", results);

  if (results.length > 0) {
    results.forEach((tab) => {
      const resultItem = document.createElement("div");
      resultItem.className =
        "result-item flex items-center p-2 rounded-md hover:bg-gray-100 cursor-pointer mb-2";

      // Favicon using Chrome's built-in favicon URL generation
      const favicon = document.createElement("img");
      favicon.className = "w-6 h-6 mr-3";

      if (tab.url) {
        const faviconUrl = new URL(chrome.runtime.getURL("/_favicon/"));
        faviconUrl.searchParams.set("pageUrl", tab.url);
        faviconUrl.searchParams.set("size", "32");
        favicon.src = faviconUrl.toString();
      } else {
        favicon.src = "default-icon.png"; // Use a default icon if URL is undefined
      }
      favicon.alt = "Favicon";

      // Title and URL container
      const textContainer = document.createElement("div");

      const title = document.createElement("p");
      title.className = "text-sm font-medium text-gray-900";
      title.textContent = tab.title || "Untitled"; // Fallback for missing title

      const url = document.createElement("p");
      url.className = "text-xs text-gray-500";
      url.textContent = tab.url ? new URL(tab.url).hostname : "Unknown URL"; // Fallback for missing URL

      textContainer.appendChild(title);
      textContainer.appendChild(url);

      // Append elements to the result item
      resultItem.appendChild(favicon);
      resultItem.appendChild(textContainer);

      // Click event to activate the tab and inject the highlight function
      resultItem.addEventListener("click", () => {
        // Send a message to the background script to activate the tab and trigger highlighting
        chrome.runtime.sendMessage({
          type: "ACTIVATE_AND_HIGHLIGHT",
          tabId: tab.id,
          keyword: searchInput.value.trim(),
        });
      });

      // Append result item to the results container
      resultsContainer.appendChild(resultItem);
    });
  } else {
    resultsContainer.textContent = "No matching tabs found";
  }
}

// Cancel search workflow
cancelButton.addEventListener("click", () => {
  resetSearch(); // Reset the popup UI and search input

  // Send REMOVE_HIGHLIGHTS message to all tabs to clear highlights
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, { type: "REMOVE_HIGHLIGHTS" });
    });
  });

  // Clear the stored search results, keyword, and cancel button state
  chrome.storage.local.remove([
    "searchResults",
    "searchKeyword",
    "cancelButtonVisible",
  ]);
});

// Reset the popup UI to initial state
function resetSearch() {
  searchInput.value = "";
  resultsContainer.innerHTML = "";
  loadingSpinner.classList.add("hidden");
  actionsContainer.classList.add("hidden");
}
