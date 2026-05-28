// Configure Side Panel to open on action click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "roast_website") {
        handleRoastRequest(request, sendResponse);
        return true; // Keep message channel open for async response
    } else if (request.action === "get_stats") {
        getGamificationStats().then(stats => sendResponse(stats));
        return true;
    } else if (request.action === "unlock_premium") {
        if (request.key === "ROAST-PRO-2026") {
            chrome.storage.local.set({ isPremium: true }).then(() => {
                sendResponse({ success: true });
            });
        } else {
            sendResponse({ success: false, error: "Invalid License Key" });
        }
        return true;
    }
});

async function getGamificationStats() {
    const today = new Date().toISOString().split('T')[0];
    const data = await chrome.storage.local.get(['roastDate', 'roastCount', 'isPremium']);
    let count = data.roastCount || 0;
    const isPremium = !!data.isPremium;
    
    if (data.roastDate !== today) {
        count = 0;
        await chrome.storage.local.set({ roastDate: today, roastCount: 0 });
    }
    
    let level = "Beginner Founder";
    if (count >= 1) level = "Startup Survivor";
    if (count >= 2) level = "Conversion Wizard";
    if (count >= 3 || isPremium) level = "UX God";
    
    return { count, level, remaining: isPremium ? "∞" : Math.max(0, 3 - count), isPremium };
}

async function handleRoastRequest(request, sendResponse) {
    try {
        // 0. Check Limits (Basic is always free, deep scan locked later)
        const stats = await getGamificationStats();
        const isDeepScanLocked = !stats.isPremium && stats.count >= 3;

        // 1. Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab || !tab.id) {
            sendResponse({ success: false, error: 'Cannot access current tab.' });
            return;
        }

        // 3. Extract data from page via content script
        let pageData = {
            url: tab.url || "Unknown Page",
            title: tab.title || "No Title",
            description: "No description found.",
            headings: "None",
            ctas: "None",
            textSample: "The user is trying to roast an unreadable or restricted browser page. Tell them they need to be on a real website."
        };
        try {
            if (!tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://') && !tab.url.startsWith('chrome-extension://')) {
                let response = await chrome.tabs.sendMessage(tab.id, { action: "extractPageData" }).catch(() => null);
                
                // If content script is not injected, inject it dynamically
                if (!response) {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['content.js']
                    }).catch(() => null);
                    response = await chrome.tabs.sendMessage(tab.id, { action: "extractPageData" }).catch(() => null);
                }

                if (response && response.success) {
                    pageData = response.data;
                }
            }
        } catch (e) {
            // Silently swallow errors and use fallback pageData so the roast always works
            console.warn("Could not read page, using fallback data.");
        }

        // 4. Call Pollinations API
        const mode = request.mode || 'savage';
        const result = await callPollinationsAPI(pageData, mode);
        
        // 5. Increment limit
        const today = new Date().toISOString().split('T')[0];
        await chrome.storage.local.set({ roastDate: today, roastCount: stats.count + 1 });
        
        sendResponse({ success: true, data: result, isDeepScanLocked: isDeepScanLocked });

    } catch (error) {
        console.error("Roast error:", error);
        sendResponse({ success: false, error: error.message || 'An unexpected error occurred.' });
    }
}

async function callPollinationsAPI(pageData, mode) {
    let modePersona = "a brutal, funny, Gordon Ramsay-style expert web designer";
    if (mode === "investor") modePersona = "an angry, toxic Silicon Valley VC who hates unprofitable businesses";
    if (mode === "genz") modePersona = "a Gen-Z internet troll who uses slang (fr fr, mid, no cap) and roasts design";
    if (mode === "ceo") modePersona = "a ruthless Fortune 500 CEO who only cares about the bottom line and hates fluff";
    if (mode === "ux") modePersona = "an elite, snobby UX/UI expert who nitpicks usability and accessibility";
    if (mode === "reddit") modePersona = "a cynical Reddit user from r/RoastMe and r/startups who thinks everything is a scam";
    if (mode === "hacker") modePersona = "an elite cybersecurity hacker who mocks their trust signals and basic tech stack";

    const prompt = `
You are ${modePersona}.
I want you to brutally roast a website based on the following extracted data:
URL: ${pageData.url}
Title: ${pageData.title}
Meta Description: ${pageData.description}
Headings: ${pageData.headings}
Call to Actions: ${pageData.ctas}
Sample Text: ${pageData.textSample}

Respond ONLY with a valid JSON object with the following structure:
{
  "roast": "A 2-3 sentence brutal and funny roast about their design, copy, or UX matching your persona. Make it sting. No markdown.",
  "whyItFails": "A 1-2 sentence explanation of why this landing page fails technically or from a marketing perspective.",
  "conversionScore": <number between 0 and 100>,
  "trustScore": <number between 0 and 100>,
  "scamProbability": <number between 0 and 100>,
  "designIQ": <number between 0 and 100>,
  "founderCopingLevel": "A funny rating like 'HIGH' or 'CRITICAL', and a 1 sentence explanation.",
  "startupBroStereotype": "A hilarious stereotype string e.g. 'Built after listening to 4 podcasts' or 'Definitely uses dark mode'.",
  "darkPatterns": "Any manipulative UX detected? E.g. 'Fake urgency, hidden pricing' or 'None detected'.",
  "richScore": "A fun string predicting how 'rich' the site looks (e.g., '₹5,000 Fiverr energy', 'Bootstrap founder vibes', 'Billion-dollar SaaS feel').",
  "personality": "A funny string detecting the startup's personality (e.g., 'This screams agency template', '2017 dropshipping store').",
  "founderTherapy": "A funny but slightly comforting 1 sentence message for the founder whose ego was just destroyed.",
  "memeCaption": "A very short, funny caption for an 'Expectation vs Reality' meme about this website.",
  "rewriteHeadline": "A much better, high-converting 1-sentence headline for this site.",
  "rewriteCTA": "A much better, punchy 2-3 word call-to-action button text.",
  "businessAdvice": ["Tip 1 about pricing/growth", "Tip 2 about UX strategy", "Tip 3 about positioning"]
}
`;

    const url = 'https://text.pollinations.ai/openai';
    
    const headers = {
        'Content-Type': 'application/json'
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            model: "openai",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
            throw new Error("API_RATE_LIMIT");
        }
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    try {
        let jsonString = data.choices[0].message.content;
        // Strip out markdown code blocks if the AI includes them
        jsonString = jsonString.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
        return JSON.parse(jsonString);
    } catch (e) {
        throw new Error("Failed to parse AI response. The AI might not have returned valid JSON.");
    }
}
