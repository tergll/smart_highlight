console.log("✅ [Content Script] Loaded on:", window.location.href);

// Create and add selection button
const selectionButton = document.createElement('button');
selectionButton.innerHTML = '✨ Add to highlights';
selectionButton.style.cssText = `
    position: fixed;
    display: none;
    padding: 10px 16px;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    font-weight: bold;
    z-index: 999999;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    transition: all 0.2s;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    pointer-events: auto;
`;
selectionButton.addEventListener('mouseover', () => {
    selectionButton.style.background = '#1976D2';
    selectionButton.style.transform = 'scale(1.05)';
});
selectionButton.addEventListener('mouseout', () => {
    selectionButton.style.background = '#2196F3';
    selectionButton.style.transform = 'scale(1)';
});

// Create a container for the button to ensure it's always on top
const buttonContainer = document.createElement('div');
buttonContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 999999;
`;
buttonContainer.appendChild(selectionButton);
document.body.appendChild(buttonContainer);

// Handle text selection
document.addEventListener('mouseup', (e) => {
    // Clear any existing timeout
    if (window.selectionTimeout) {
        clearTimeout(window.selectionTimeout);
    }

    window.selectionTimeout = setTimeout(() => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();

        if (selectedText && e.target !== selectionButton) {
            try {
                // Position the button near the selection
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                
                // Ensure the button is visible within viewport
                const viewportHeight = window.innerHeight;
                const viewportWidth = window.innerWidth;
                
                let top = rect.bottom + 10;
                let left = rect.left;
                
                // Adjust if button would go below viewport
                if (top + 50 > viewportHeight) {
                    top = rect.top - 50;
                }
                
                // Adjust if button would go beyond right edge
                if (left + 200 > viewportWidth) {
                    left = viewportWidth - 200;
                }
                
                // Ensure button stays within viewport
                top = Math.max(10, Math.min(viewportHeight - 50, top));
                left = Math.max(10, Math.min(viewportWidth - 200, left));
                
                selectionButton.style.display = 'block';
                selectionButton.style.top = `${top}px`;
                selectionButton.style.left = `${left}px`;
                
                // Add click handler
                selectionButton.onclick = () => {
                    // Create highlight object with default yellow color
                    const highlight = {
                        text: selectedText,
                        color: '#ffeb3b'  // Default yellow color
                    };
                    
                    // Send highlight to sidebar
                    chrome.runtime.sendMessage({
                        action: 'addHighlight',
                        text: selectedText,
                        color: highlight.color  // Include color in the message
                    });
                    
                    // Highlight the selected text immediately with the color
                    highlightSentences([selectedText], highlight.color);
                    
                    // Clear selection and hide button
                    window.getSelection().removeAllRanges();
                    selectionButton.style.display = 'none';
                };
                
                console.log("✅ Button displayed at:", { top, left });
            } catch (error) {
                console.error("Error showing selection button:", error);
            }
        } else {
            selectionButton.style.display = 'none';
        }
    }, 50); 
});

// Hide button when clicking elsewhere
document.addEventListener('mousedown', (e) => {
    if (e.target !== selectionButton) {
        selectionButton.style.display = 'none';
    }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log("📩 [Content Script] Message received:", message);

    if (message.action === "ping") {
        sendResponse({ status: "Content script active" });
    }

    if (message.action === "highlight") {
        console.log("🔍 [Content Script] Highlighting sentences:", message.sentences);
        highlightSentences(message.sentences);
        sendResponse({ status: "Highlighting applied" });
    }

    if (message.action === "scrollTo") {
        console.log("🔍 [Content Script] Scrolling to sentence:", message.sentence);
        scrollToSentence(message.sentence);
        sendResponse({ status: "Scrolled to sentence" });
    }

    if (message.action === "removeHighlight") {
        console.log("🔍 [Content Script] Removing highlight:", message.sentence);
        removeHighlight(message.sentence);
        sendResponse({ status: "Highlight removed" });
    }

    if (message.action === "updateColor") {
        console.log("🔍 [Content Script] Updating highlight color:", message.sentence, message.color);
        updateHighlightColor(message.sentence, message.color);
        sendResponse({ status: "Color updated" });
    }
});

function cleanText(text) {
    return text
        .trim()
        .replace(/^["']|["']$/g, '') // Remove quotes at start/end
        .replace(/[""]/g, '"')  // Normalize quotes
        .replace(/\.$/, ''); // Remove period at the end
}

function shouldProcessElement(el) {
    // Skip script, style, and non-content elements
    const tagName = el.tagName.toLowerCase();
    if (tagName === 'script' || tagName === 'style' || tagName === 'noscript') {
        return false;
    }

    // Skip elements with CSS/JS content
    const text = el.textContent.trim();
    if (text.includes('{') && text.includes('}')) {
        return false;
    }
    if (text.includes('function(') || text.includes('var ') || text.includes('const ')) {
        return false;
    }

    return true;
}

function scrollToSentence(sentence) {
    const cleanedSentence = cleanText(sentence);
    const elements = Array.from(document.querySelectorAll('.ai-highlighted'));
    
    for (const el of elements) {
        if (cleanText(el.textContent).includes(cleanedSentence)) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Add a temporary highlight effect
            const originalBackground = el.style.backgroundColor;
            el.style.backgroundColor = '#ffff00';
            setTimeout(() => {
                el.style.backgroundColor = originalBackground;
            }, 2000);
            
            break;
        }
    }
}

function removeHighlight(sentence) {
    const cleanedSentence = cleanText(sentence);
    const elements = Array.from(document.querySelectorAll('.ai-highlighted'));
    
    elements.forEach(el => {
        if (cleanText(el.textContent).includes(cleanedSentence)) {
            // Replace the highlighted span with its text content
            el.outerHTML = el.textContent;
        }
    });
}

function highlightSentences(sentences, defaultColor = 'yellow') {
    if (!sentences || sentences.length === 0) {
        console.warn("⚠️ [Content Script] No sentences received for highlighting.");
        return;
    }

    console.log("🔍 [Content Script] Applying highlights for", sentences.length, "sentences...");
    
    // Get all text-containing elements but filter out non-content elements
    const elements = Array.from(document.querySelectorAll("p, span, div, article, section"))
        .filter(shouldProcessElement);
    
    console.log(`Found ${elements.length} content elements to search through`);

    let highlightCount = 0;
    
    elements.forEach((el, index) => {
        // Skip if element is already processed or is a parent of processed elements
        if (el.querySelector('.ai-highlighted') || el.closest('.ai-highlighted')) {
            return;
        }

        let elementText = el.innerHTML;
        let wasModified = false;

        sentences.forEach(sentence => {
            // Clean both the sentence and the element text
            const cleanedSentence = cleanText(sentence);
            const cleanedElementText = cleanText(el.textContent);
            
            if (cleanedElementText.includes(cleanedSentence)) {
                console.log(`✅ [Content Script] Found sentence ${sentences.indexOf(sentence)} in element ${index}:`, {
                    original: sentence,
                    cleaned: cleanedSentence,
                    elementText: cleanedElementText.substring(0, 100) + "..."
                });

                // Create regex to match the original text
                const regex = new RegExp(cleanedSentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                
                // Replace with highlight using the specified color
                elementText = elementText.replace(regex, (match) => {
                    highlightCount++;
                    return `<span class="ai-highlighted" style="background-color: ${defaultColor}; font-weight: bold;">${match}</span>`;
                });
                
                wasModified = true;
            }
        });

        // Only update innerHTML if we made changes
        if (wasModified) {
            el.innerHTML = elementText;
        }
    });

    console.log(`✅ [Content Script] Highlighting complete. Applied ${highlightCount} highlights.`);
}

function updateHighlightColor(sentence, color) {
    const cleanedSentence = cleanText(sentence);
    const elements = Array.from(document.querySelectorAll('.ai-highlighted'));
    
    elements.forEach(el => {
        if (cleanText(el.textContent).includes(cleanedSentence)) {
            el.style.backgroundColor = color;
        }
    });
}
