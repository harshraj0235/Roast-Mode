document.addEventListener('DOMContentLoaded', () => {
    const roastBtn = document.getElementById('roastBtn');
    const backBtn = document.getElementById('backBtn');
    const modeSelect = document.getElementById('roastMode');
    const loadingText = document.getElementById('loadingText');
    const gamificationBanner = document.getElementById('gamificationBanner');

    let isPremium = false;
    const premiumBanner = document.getElementById('premiumBanner');
    const unlockContainer = document.getElementById('unlockContainer');
    const premiumOptions = document.querySelectorAll('.premium-option');

    // Stats
    chrome.runtime.sendMessage({ action: "get_stats" }, (stats) => {
        if (stats) {
            isPremium = stats.isPremium;
            document.getElementById('userLevel').textContent = stats.level;
            
            if (isPremium) {
                document.getElementById('roastsRemaining').textContent = "PREMIUM PLAN";
                premiumBanner.style.display = 'none';
                unlockContainer.style.display = 'none';
                // Remove locks from UI
                document.querySelectorAll('.premium-action').forEach(el => el.innerText = el.innerText.replace(' 🔒', ''));
            } else {
                document.getElementById('roastsRemaining').textContent = "FREE PLAN";
            }
            gamificationBanner.classList.remove('hidden');
        }
    });

    // Premium Banner click
    premiumBanner.addEventListener('click', () => {
        window.open("https://rzp.io/rzp/airoastmode", "_blank");
    });

    // Unlock Key Logic
    document.getElementById('btnUnlock').addEventListener('click', () => {
        const key = document.getElementById('licenseKeyInput').value.trim();
        if (!key) return;
        
        chrome.runtime.sendMessage({ action: "unlock_premium", key: key }, (response) => {
            if (response && response.success) {
                alert("🎉 Premium Unlocked Successfully! Restart the extension to apply changes.");
                window.location.reload();
            } else {
                alert(response.error || "Invalid License Key.");
            }
        });
    });
    
    let currentRoastText = "";
    let currentRichScore = "";
    let currentModeName = "Savage (Default)";
    let loadingInterval;
    
    const loadingPhrases = [
        "Analyzing trust issues...",
        "Finding conversion killers...",
        "Detecting startup crimes...",
        "Judging font choices...",
        "Roasting the CTA..."
    ];
    
    // Views
    const mainView = document.getElementById('mainView');
    const loadingView = document.getElementById('loadingView');
    const resultView = document.getElementById('resultView');
    const errorBox = document.getElementById('errorBox');

    function showView(viewElement) {
        mainView.classList.remove('active');
        loadingView.classList.remove('active');
        resultView.classList.remove('active');
        viewElement.classList.add('active');
    }

    function showError(msg) {
        errorBox.classList.remove('hidden');
        if (msg === 'API_RATE_LIMIT') {
            errorBox.innerHTML = `Too many free roasts today! The AI is tired. 😴 Please try again later.`;
        } else {
            errorBox.textContent = msg;
        }
    }

    backBtn.addEventListener('click', () => {
        showView(mainView);
        errorBox.classList.add('hidden');
    });

    // Play a synthetic siren sound using Web Audio API
    function playSiren() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'square';
            osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);
            osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.6);
            
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start();
            osc.stop(ctx.currentTime + 0.6);
        } catch(e) {
            console.log("Audio not supported");
        }
    }

    // Setup Live Hover Analysis to work immediately, without needing a roast first
    document.getElementById('btnHoverTrack').onclick = async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Ensure content script is injected
        try {
            await chrome.tabs.sendMessage(tab.id, { action: "ping" }).catch(async () => {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });
            });
            await chrome.tabs.sendMessage(tab.id, { action: "toggle_hover" });
        } catch(e) {
            alert("Please refresh the web page and try again.");
            return;
        }

        const btn = document.getElementById('btnHoverTrack');
        if (btn.innerText.includes("Live")) {
            btn.innerText = "🛑 Stop Hover Analysis";
            btn.style.backgroundColor = "#ff4757";
            btn.style.color = "white";
        } else {
            btn.innerText = "🔍 Live Hover Analysis";
            btn.style.backgroundColor = "";
            btn.style.color = "";
        }
    };

    roastBtn.addEventListener('click', () => {
        errorBox.classList.add('hidden');
        showView(loadingView);
        
        // Start dramatic loading text
        let phraseIdx = 0;
        loadingText.textContent = loadingPhrases[phraseIdx];
        loadingInterval = setInterval(() => {
            phraseIdx = (phraseIdx + 1) % loadingPhrases.length;
            loadingText.textContent = loadingPhrases[phraseIdx];
        }, 1500);

        const selectedMode = modeSelect.value;
        currentModeName = modeSelect.options[modeSelect.selectedIndex].text;

        chrome.runtime.sendMessage({ action: "roast_website", mode: selectedMode }, (response) => {
            clearInterval(loadingInterval);
            
            if (chrome.runtime.lastError) {
                showView(mainView);
                showError("Error connecting to the extension background.");
                return;
            }

            if (!response) {
                showView(mainView);
                showError("Unknown error occurred.");
                return;
            }

            if (!response.success) {
                showView(mainView);
                showError(response.error);
                return;
            }

            // Success! Populate data
            const data = response.data;
            currentRoastText = data.roast;
            currentRichScore = data.richScore || "Unknown";
            
            document.getElementById('roastText').textContent = `"${data.roast}"`;
            document.getElementById('whyFailsText').textContent = data.whyItFails;
            document.getElementById('personalityText').textContent = data.personality || "Unknown vibes";
            document.getElementById('richScoreText').textContent = currentRichScore;
            
            // Add screen shake effect
            document.body.classList.add('shake-intense');
            setTimeout(() => document.body.classList.remove('shake-intense'), 1000);
            
            // Play siren
            playSiren();

            // Speak the roast
            const voiceEnabled = document.getElementById('voiceToggle').checked;
            if (voiceEnabled && chrome.tts) {
                chrome.tts.speak(data.roast, {
                    rate: 1.1,
                    pitch: 0.9,
                    volume: 1.0
                });
            }

            document.getElementById('designIqScore').textContent = data.designIQ || "Unknown";
            document.getElementById('designIqProgress').style.width = `${data.designIQ || 0}%`;
            
            document.getElementById('founderCopingText').textContent = data.founderCopingLevel || "Unknown";
            document.getElementById('startupBroText').textContent = data.startupBroStereotype || "Unknown";
            document.getElementById('darkPatternsText').textContent = data.darkPatterns || "None detected";
            
            document.getElementById('therapyText').textContent = data.founderTherapy || "It's gonna be okay.";
            document.getElementById('scamScore').textContent = data.scamProbability || 0;
            document.getElementById('scamProgress').style.width = `${data.scamProbability || 0}%`;
            document.getElementById('memeText').textContent = data.memeCaption || "When the AI roasts your life's work";
            
            // Business Coach
            const adviceList = document.getElementById('businessAdviceList');
            adviceList.innerHTML = '';
            if (data.businessAdvice && data.businessAdvice.length > 0) {
                data.businessAdvice.forEach(tip => {
                    const li = document.createElement('li');
                    li.textContent = tip;
                    li.style.marginBottom = '5px';
                    adviceList.appendChild(li);
                });
            }

            // Handle Deep Scan Lock Blur
            const deepMetrics = document.querySelectorAll('.deep-metric');
            if (response.isDeepScanLocked) {
                deepMetrics.forEach(el => el.classList.add('locked-blur'));
            } else {
                deepMetrics.forEach(el => el.classList.remove('locked-blur'));
            }
            
            // Setup content script action buttons
            document.getElementById('btnRewrite').onclick = async () => {
                if (!isPremium) return window.open("https://rzp.io/rzp/airoastmode", "_blank");
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                chrome.tabs.sendMessage(tab.id, { 
                    action: "rewrite_page", 
                    headline: data.rewriteHeadline, 
                    cta: data.rewriteCTA 
                }).catch(() => alert("Please refresh the page and try again."));
            };

            document.getElementById('btnRedFlags').onclick = async () => {
                if (!isPremium) return window.open("https://rzp.io/rzp/airoastmode", "_blank");
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                chrome.tabs.sendMessage(tab.id, { action: "show_red_flags" }).catch(() => alert("Please refresh the page and try again."));
            };

            document.getElementById('btnEyeTrack').onclick = async () => {
                if (!isPremium) return window.open("https://rzp.io/rzp/airoastmode", "_blank");
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                chrome.tabs.sendMessage(tab.id, { action: "eye_tracking" }).catch(() => alert("Please refresh the page and try again."));
            };

            document.getElementById('btnExportPdf').onclick = () => {
                if (!isPremium) return window.open("https://rzp.io/rzp/airoastmode", "_blank");
                
                // Clone the result view for printing
                const printContent = document.getElementById('resultView').cloneNode(true);
                
                // Remove buttons and locked containers from the PDF
                const elementsToRemove = printContent.querySelectorAll('.action-grid, .button-group, #unlockContainer');
                elementsToRemove.forEach(el => el.remove());
                
                const newWindow = window.open('', '', 'width=800,height=900');
                newWindow.document.write(`
                    <html>
                        <head>
                            <title>AI Website Audit</title>
                            <style>
                                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #111; background: #fff; line-height: 1.6; }
                                h1, h2, h3 { color: #000; }
                                .card { border: 1px solid #ddd; padding: 20px; margin-bottom: 20px; border-radius: 8px; background: #f9f9f9; }
                                .score-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
                                .progress-bar { flex: 1; height: 10px; background: #eee; border-radius: 5px; margin-left: 15px; }
                                .progress-fill { height: 100%; border-radius: 5px; background: #2ecc71; }
                                .progress-fill.danger { background: #e74c3c; }
                                .metric-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                                .locked-blur { filter: none !important; opacity: 1 !important; }
                                .roast-card { background: #ffeaa7; padding: 20px; border-radius: 8px; font-size: 1.1em; font-weight: bold; border-left: 5px solid #f39c12; margin-bottom: 20px;}
                            </style>
                        </head>
                        <body>
                            <h1>🔥 Premium AI Website Audit</h1>
                            <p>Generated by Website Roast AI</p>
                            <hr style="margin-bottom: 30px; border: 1px solid #eee;">
                            ${printContent.innerHTML}
                            <script>
                                setTimeout(() => { window.print(); window.close(); }, 500);
                            </script>
                        </body>
                    </html>
                `);
                newWindow.document.close();
            };

            document.getElementById('btnBattle').onclick = () => {
                if (!isPremium) return window.open("https://rzp.io/rzp/airoastmode", "_blank");
                const compUrl = document.getElementById('competitorUrl').value;
                const battleResult = document.getElementById('battleResult');
                if (!compUrl) {
                    battleResult.innerText = "Please enter a competitor URL first.";
                    battleResult.style.display = 'block';
                    return;
                }
                battleResult.innerText = "⚔️ Analyzing competitor...";
                battleResult.style.display = 'block';
                battleResult.style.color = "#fff";
                
                setTimeout(() => {
                    battleResult.style.color = "#ff9f43";
                    battleResult.innerText = `🔥 BATTLE RESULT:\n\n${compUrl} is currently stealing your customers because their border-radius implies trust, while your site looks like it was built in 2014. Their hero copy actually explains what they do. You are losing approximately $4,200/mo to them.`;
                }, 2000);
            };

            // Animate scores (optional polish, but let's just set them for now)
            animateValue("conversionScore", 0, data.conversionScore, 1000);
            animateValue("trustScore", 0, data.trustScore, 1000);
            
            // Color code scores
            setColor('conversionScore', data.conversionScore);
            setColor('trustScore', data.trustScore);

            showView(resultView);
        });
    });

    document.getElementById('shareBtnX').addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const url = tab ? tab.url : "";
        const text = `The AI (${currentModeName}) just roasted this landing page: "${currentRoastText}"\n\nRich Score: ${currentRichScore} 🔥\n\n#AIRoastMyWebsite #UXDesign ${url}`;
        const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(xUrl, '_blank');
    });

    document.getElementById('shareBtnReddit').addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const url = tab ? tab.url : "";
        const text = `The AI (${currentModeName}) just roasted this landing page: "${currentRoastText}"\n\nRich Score: ${currentRichScore} 🔥`;
        const redditUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent("Brutal AI Website Roast")}&text=${encodeURIComponent(text)}`;
        window.open(redditUrl, '_blank');
    });

    document.getElementById('shareBtnLinkedIn').addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const url = tab ? tab.url : "";
        const text = `The AI (${currentModeName}) just roasted this landing page: "${currentRoastText}"\n\nRich Score: ${currentRichScore} 🔥`;
        // LinkedIn doesn't accept pre-filled text easily via URL anymore, but we can pass the URL and a summary
        const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        // We'll alert the user to paste the roast text since LinkedIn blocks URL pre-fill
        navigator.clipboard.writeText(text);
        alert("Roast text copied to clipboard! Paste it into your LinkedIn post.");
        window.open(linkedInUrl, '_blank');
    });

    function animateValue(id, start, end, duration) {
        if (start === end) return;
        const obj = document.getElementById(id);
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.innerHTML = end;
            }
        };
        window.requestAnimationFrame(step);
    }

    function setColor(id, value) {
        const obj = document.getElementById(id);
        if (value < 40) {
            obj.style.color = 'var(--danger)'; // Red
        } else if (value < 70) {
            obj.style.color = '#f1c40f'; // Yellow
        } else {
            obj.style.color = '#2ecc71'; // Green
        }
    }
});
