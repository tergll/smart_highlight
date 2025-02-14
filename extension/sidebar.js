console.log("✅ [Sidebar] sidebar.js is loaded and running...");

const btn = document.getElementById("summarise");
const output = document.getElementById("output");
const summaryText = document.getElementById("summary-text");
const highlightsList = document.getElementById("highlights-list");
const promptInput = document.getElementById("userPrompt");

// Define available colors
const COLORS = {
    yellow: '#ffeb3b',
    green: '#a5d6a7',
    blue: '#90caf9',
    pink: '#f48fb1',
    orange: '#ffcc80'
};

// Store highlights with their colors
let currentHighlights = [];

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'addHighlight') {
        // Add new highlight with provided or default color
        const newHighlight = {
            text: message.text,
            color: message.color || COLORS.yellow
        };
        
        // Add to our list
        currentHighlights.push(newHighlight);
        
        // Update UI
        updateHighlightsList();
        
        // Send highlight to content script with color
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            const [tab] = tabs;
            chrome.tabs.sendMessage(tab.id, {
                action: "highlight",
                sentences: [newHighlight.text],
                color: newHighlight.color
            });
        });
        
        sendResponse({ status: "Highlight added" });
    }
});

if (!btn) {
    console.error("❌ [Sidebar] ERROR: Button with id 'summarise' not found!");
} else {
    console.log("✅ [Sidebar] Found the Summarize button.");
}

function scrollToHighlight(sentence) {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const [tab] = tabs;
        chrome.tabs.sendMessage(tab.id, { 
            action: "scrollTo", 
            sentence: sentence 
        });
    });
}

function removeHighlight(sentence) {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const [tab] = tabs;
        chrome.tabs.sendMessage(tab.id, { 
            action: "removeHighlight", 
            sentence: sentence 
        });
        
        // Remove from our list
        currentHighlights = currentHighlights.filter(h => h.text !== sentence);
        updateHighlightsList();
    });
}

function updateHighlightColor(sentence, color) {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const [tab] = tabs;
        chrome.tabs.sendMessage(tab.id, { 
            action: "updateColor", 
            sentence: sentence,
            color: color
        });
        
        // Update in our list
        const highlight = currentHighlights.find(h => h.text === sentence);
        if (highlight) {
            highlight.color = color;
        }
    });
}

function createColorButton(color, value, isActive, onClick) {
    const btn = document.createElement('div');
    btn.className = `color-btn color-${color}${isActive ? ' active' : ''}`;
    btn.title = color.charAt(0).toUpperCase() + color.slice(1);
    btn.onclick = onClick;
    return btn;
}

function updateHighlightsList() {
    highlightsList.innerHTML = '';
    currentHighlights.forEach(highlight => {
        const div = document.createElement('div');
        div.className = 'highlight-item';
        div.draggable = true;
        
        // Add drag and drop handlers
        div.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', highlight.text);
            div.classList.add('dragging');
        });
        
        div.addEventListener('dragend', () => {
            div.classList.remove('dragging');
        });
        
        div.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingItem = highlightsList.querySelector('.dragging');
            if (draggingItem && draggingItem !== div) {
                const rect = div.getBoundingClientRect();
                const midpoint = (rect.bottom + rect.top) / 2;
                if (e.clientY < midpoint) {
                    div.parentNode.insertBefore(draggingItem, div);
                } else {
                    div.parentNode.insertBefore(draggingItem, div.nextSibling);
                }
                // Update the currentHighlights array to match new order
                const newOrder = Array.from(highlightsList.children).map(item => {
                    const text = item.querySelector('.highlight-content').textContent;
                    return currentHighlights.find(h => h.text === text);
                });
                currentHighlights = newOrder;
            }
        });
        
        // Create content wrapper
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'highlight-content-wrapper';
        
        // Create drag handle
        const dragHandle = document.createElement('div');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '⋮⋮';
        dragHandle.title = 'Drag to reorder';
        
        // Create content div with background color
        const content = document.createElement('div');
        content.className = 'highlight-content';
        content.textContent = highlight.text;
        content.style.backgroundColor = highlight.color || COLORS.yellow;
        
        // Add click to scroll
        content.onclick = () => scrollToHighlight(highlight.text);
        
        // Create controls div
        const controls = document.createElement('div');
        controls.className = 'highlight-controls';
        
        // Create left and right control sections
        const controlsLeft = document.createElement('div');
        controlsLeft.className = 'highlight-controls-left';
        
        const controlsRight = document.createElement('div');
        controlsRight.className = 'highlight-controls-right';
        
        // Add color options
        const colorOptions = document.createElement('div');
        colorOptions.className = 'color-options';
        
        Object.entries(COLORS).forEach(([colorName, colorValue]) => {
            const isActive = highlight.color === colorValue;
            const colorBtn = createColorButton(colorName, colorValue, isActive, () => {
                colorOptions.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
                colorBtn.classList.add('active');
                content.style.backgroundColor = colorValue;
                updateHighlightColor(highlight.text, colorValue);
            });
            colorOptions.appendChild(colorBtn);
        });

        // Add copy button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.innerHTML = '📋';
        copyBtn.title = 'Copy this highlight';
        copyBtn.onclick = async (e) => {
            e.stopPropagation();
            try {
                await navigator.clipboard.writeText(highlight.text);
                copyBtn.innerHTML = '✓';
                copyBtn.classList.add('copied');
                setTimeout(() => {
                    copyBtn.innerHTML = '📋';
                    copyBtn.classList.remove('copied');
                }, 1500);
            } catch (err) {
                console.error('Failed to copy highlight:', err);
                alert('Failed to copy highlight to clipboard');
            }
        };
        
        // Add remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = '×';
        removeBtn.title = 'Remove highlight';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            removeHighlight(highlight.text);
        };
        
        // Assemble the controls
        controlsLeft.appendChild(colorOptions);
        controlsRight.appendChild(copyBtn);
        controlsRight.appendChild(removeBtn);
        controls.appendChild(controlsLeft);
        controls.appendChild(controlsRight);
        
        // Assemble the content wrapper
        contentWrapper.appendChild(dragHandle);
        contentWrapper.appendChild(content);
        
        // Assemble the highlight item
        div.appendChild(contentWrapper);
        div.appendChild(controls);
        highlightsList.appendChild(div);
    });
}

btn?.addEventListener("click", async function () {
    btn.disabled = true;
    btn.innerHTML = "Summarizing...";
    summaryText.innerHTML = "";
    highlightsList.innerHTML = "";

    try {
        console.log("[Sidebar] Extracting text...");
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const [{ result: text }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: getSelectedText
        });

        if (!text) {
            console.warn("[Sidebar] No text found on the page.");
            summaryText.innerHTML = "No text detected.";
            resetButton();
            return;
        }

        console.log("[Sidebar] Extracted text:", text);
        const userPrompt = promptInput.value.trim();

        console.log("[Sidebar] Sending request to AI API...");

        const response = await fetch("http://127.0.0.1:5000/process-text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, prompt: userPrompt }),
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("[Sidebar] Full API Response:", data);

        // Display summary
        summaryText.innerHTML = `${data.summary}`;
        document.querySelector('.summary-section').classList.add('visible');

        // Store highlights with default color
        currentHighlights = (data.highlights || []).map(text => ({
            text,
            color: COLORS.yellow  // Default yellow
        }));
        updateHighlightsList();

        // Send highlights to content script
        if (currentHighlights.length > 0) {
            chrome.tabs.sendMessage(tab.id, { 
                action: "highlight", 
                sentences: currentHighlights.map(h => h.text)
            });
        } else {
            console.warn("[Sidebar] No key sentences received for highlighting.");
            highlightsList.innerHTML = "No key sentences were identified for highlighting.";
        }

    } catch (error) {
        console.error("[Sidebar] Error:", error);
        summaryText.innerHTML = "Error processing text. Check console logs.";
    } finally {
        resetButton();
    }
});

// Function to get selected text or full article
function getSelectedText() {
    let selectedText = window.getSelection().toString();
    if (!selectedText) {
        const article = document.querySelector("article") || document.querySelector("main");
        return article ? article.innerText : document.body.innerText;
    }
    return selectedText;
}

// Reset button UI
function resetButton() {
    btn.disabled = false;
    btn.innerHTML = "Summarize";
}

// Add copy functionality
const copyHighlightsBtn = document.getElementById('copyHighlights');

copyHighlightsBtn.addEventListener('click', async () => {
    if (currentHighlights.length === 0) {
        alert('No highlights to copy!');
        return;
    }

    // Create formatted text with highlights
    const formattedHighlights = currentHighlights.map((highlight, index) => {
        const colorName = Object.entries(COLORS).find(([_, value]) => value === highlight.color)?.[0] || 'yellow';
        return `${index + 1}. ${highlight.text} [${colorName}]`;
    }).join('\n\n');

    try {
        await navigator.clipboard.writeText(formattedHighlights);
        
        // Visual feedback
        const originalText = copyHighlightsBtn.innerHTML;
        copyHighlightsBtn.innerHTML = '✅ Copied!';
        setTimeout(() => {
            copyHighlightsBtn.innerHTML = originalText;
        }, 2000);
    } catch (err) {
        console.error('Failed to copy highlights:', err);
        alert('Failed to copy highlights to clipboard');
    }
});
