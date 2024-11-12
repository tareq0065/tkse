let isSearching = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "SEARCH" && !isSearching) {
    isSearching = true;
    searchTabs(request.keyword)
      .then((results) => {
        sendResponse({ results }); // Send search results back to popup.js
      })
      .catch((error) => {
        console.error("Error during search:", error);
        sendResponse({ error: error.message }); // Send error back to popup.js
      })
      .finally(() => {
        isSearching = false;
      });
    return true; // Keeps the message port open for async response
  }

  if (request.type === "CANCEL_SEARCH") {
    isSearching = false;
    sendResponse({ message: "Search canceled" });
    return true;
  }
});

async function searchTabs(keyword) {
  const tabs = await chrome.tabs.query({});
  const results = [];

  for (const tab of tabs) {
    const isAccessible = await checkTabAccess(tab.id);
    if (!isAccessible) continue;

    const text = await extractText(tab.id);
    if (text && text.toLowerCase().includes(keyword.toLowerCase())) {
      results.push(tab);
    }
  }

  return results;
}

// Check if the tab is accessible
function checkTabAccess(tabId) {
  return new Promise((resolve) => {
    chrome.scripting.executeScript(
      { target: { tabId: tabId }, func: () => true },
      (result) => {
        if (chrome.runtime.lastError) {
          console.warn(
            `Access denied to tab ${tabId}:`,
            chrome.runtime.lastError.message,
          );
          resolve(false); // Tab is not accessible
        } else {
          resolve(true); // Tab is accessible
        }
      },
    );
  });
}

// Extract text from the tab if accessible
function extractText(tabId) {
  return new Promise((resolve) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        func: () => (document.body ? document.body.innerText : ""),
      },
      (result) => {
        if (chrome.runtime.lastError) {
          console.error("Error executing script:", chrome.runtime.lastError);
          resolve(""); // Resolve to an empty string if there's an error
        } else if (result && result[0] && result[0].result) {
          resolve(result[0].result); // Return extracted text
        } else {
          resolve(""); // Resolve to an empty string if no result
        }
      },
    );
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ACTIVATE_AND_HIGHLIGHT") {
    const { tabId, keyword } = message;

    // Activate the specified tab
    chrome.tabs.update(tabId, { active: true }, () => {
      // Attempt to send a message to the content script directly
      chrome.tabs.sendMessage(
        tabId,
        { type: "HIGHLIGHT_TEXT", keyword: keyword },
        (response) => {
          if (chrome.runtime.lastError) {
            console.log("Content script not found; injecting content script.");

            // Dynamically inject content.js if it’s not already loaded
            chrome.scripting.executeScript(
              {
                target: { tabId: tabId },
                files: ["content.js"],
              },
              (injectionResults) => {
                if (chrome.runtime.lastError) {
                  console.error(
                    "Script injection error:",
                    chrome.runtime.lastError.message,
                  );
                } else {
                  console.log(
                    "content.js injected successfully:",
                    injectionResults,
                  );

                  // After injection, send the highlight message again
                  chrome.tabs.sendMessage(tabId, {
                    type: "HIGHLIGHT_TEXT",
                    keyword: keyword,
                  });
                }
              },
            );
          } else {
            console.log(
              "Content script already loaded, highlighting directly.",
            );
          }
        },
      );
    });
  }
});

let lastHighlightedTabId = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SEARCH") {
    const keyword = message.keyword;
    // Logic to initiate search and highlight keywords (existing functionality)
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        chrome.runtime.sendMessage({
          type: "ACTIVATE_AND_HIGHLIGHT",
          tabId: tab.id,
          keyword: keyword,
        });
      });
    });
  }
});
