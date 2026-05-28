// Global hover handler to prevent memory leaks
let hoverTooltip = null;
let hoverTrackingActive = false;

const handleHoverMove = (e) => {
    if (!hoverTrackingActive) return;
    
    const target = e.target;
    let msg = "";
    
    if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.closest('button, a')) {
        msg = "🚩 Generic CTA. Users will ignore this.";
        if (target.innerText.length > 20) msg = "🚩 Nobody is reading this essay of a button.";
    } else if (target.tagName === 'H1' || target.tagName === 'H2') {
        msg = "🥱 Boring copy. Sounds like a template.";
    } else if (target.tagName === 'IMG') {
        msg = "🗑️ Looks like a stock photo.";
    }
    
    if (msg && hoverTooltip) {
        hoverTooltip.innerText = msg;
        hoverTooltip.style.display = 'block';
        hoverTooltip.style.left = (e.clientX + 15) + 'px';
        hoverTooltip.style.top = (e.clientY + 15) + 'px';
        target.style.outline = "2px dashed #ff4757";
    } else if (hoverTooltip) {
        hoverTooltip.style.display = 'none';
        target.style.outline = "";
    }
};

const handleHoverOut = (e) => {
     if (hoverTrackingActive && e.target) e.target.style.outline = "";
};

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "extractPageData") {
        try {
            // Extract Title
            const title = document.title;

            // Extract Meta Description
            const metaDescription = document.querySelector('meta[name="description"]');
            const description = metaDescription ? metaDescription.getAttribute('content') : '';

            // Extract Headings (H1, H2, H3)
            const headings = [];
            document.querySelectorAll('h1, h2, h3').forEach(el => {
                const text = el.innerText.trim();
                if (text.length > 0) headings.push(text);
            });
            const topHeadings = headings.slice(0, 5).join(' | ');

            // Extract Call to Actions (buttons and links)
            const ctas = [];
            document.querySelectorAll('a, button').forEach(el => {
                const text = el.innerText.trim();
                if (text.length > 0 && text.length < 30) ctas.push(text);
            });
            // Get unique CTAs
            const uniqueCtas = [...new Set(ctas)].slice(0, 5).join(' | ');

            // Extract a sample of paragraph text (first 3 paragraphs)
            let textSample = "";
            document.querySelectorAll('p').forEach((el, index) => {
                if (index < 3) {
                    textSample += el.innerText.trim() + " ";
                }
            });

            sendResponse({
                success: true,
                data: {
                    url: window.location.href,
                    title: title,
                    description: description,
                    headings: topHeadings,
                    ctas: uniqueCtas,
                    textSample: textSample.substring(0, 300) // Keep it brief
                }
            });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
        return true; 
    }
    
    // --- V3 ON-PAGE FEATURES ---
    
    if (request.action === "rewrite_page") {
        // Rewrite H1
        const h1 = document.querySelector('h1');
        if (h1 && request.headline) {
            h1.innerText = request.headline;
            h1.style.color = "#ff4757";
            h1.style.transition = "all 0.5s";
        }
        // Rewrite CTA
        document.querySelectorAll('a, button').forEach(el => {
            if (el.innerText.length > 0 && el.innerText.length < 30 && request.cta) {
                el.innerText = request.cta;
                el.style.backgroundColor = "#ff4757";
                el.style.color = "white";
                el.style.transition = "all 0.5s";
            }
        });
        sendResponse({ success: true });
    }
    
    if (request.action === "show_red_flags") {
        // Inject red borders on buttons
        document.querySelectorAll('a, button').forEach(el => {
            el.style.outline = "3px dashed #ff4757";
            el.style.boxShadow = "0 0 15px rgba(255, 71, 87, 0.8)";
            el.style.animation = "pulseRed 1s infinite alternate";
            
            // Inject fake tooltip
            const flag = document.createElement('div');
            flag.innerText = "🚩 Terrible CTA";
            flag.style.position = "absolute";
            flag.style.backgroundColor = "#ff4757";
            flag.style.color = "white";
            flag.style.fontSize = "10px";
            flag.style.padding = "2px 6px";
            flag.style.borderRadius = "4px";
            flag.style.marginTop = "-20px";
            flag.style.zIndex = "999999";
            el.prepend(flag);
        });
        
        // Add animation style if not exists
        if (!document.getElementById('roast-animations')) {
            const style = document.createElement('style');
            style.id = 'roast-animations';
            style.innerHTML = `@keyframes pulseRed { from { outline-color: #ff4757; } to { outline-color: #ff0000; box-shadow: 0 0 25px red; } }`;
            document.head.appendChild(style);
        }
        sendResponse({ success: true });
    }
    
    if (request.action === "eye_tracking") {
        let canvas = document.getElementById('roast-heatmap-canvas');
        if (canvas) canvas.remove();
        
        canvas = document.createElement('canvas');
        canvas.id = 'roast-heatmap-canvas';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '999998';
        canvas.style.mixBlendMode = 'multiply';
        canvas.style.opacity = '0.6';
        document.body.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Draw fake heatmap blobs
        function drawBlob(x, y, radius, color) {
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Target H1 and random buttons
        const h1 = document.querySelector('h1');
        if (h1) {
            const rect = h1.getBoundingClientRect();
            drawBlob(rect.left + rect.width/2, rect.top + rect.height/2, 200, 'rgba(255, 0, 0, 0.8)');
        }
        
        document.querySelectorAll('button, a').forEach((el, i) => {
            if(i > 5) return;
            const rect = el.getBoundingClientRect();
            if(rect.top > 0 && rect.top < window.innerHeight) {
                drawBlob(rect.left + rect.width/2, rect.top + rect.height/2, 100, 'rgba(255, 100, 0, 0.6)');
            }
        });
        
        sendResponse({ success: true });
    }
    
    if (request.action === "toggle_hover") {
        if (hoverTrackingActive) {
            hoverTrackingActive = false;
            if (hoverTooltip) hoverTooltip.remove();
            document.removeEventListener('mousemove', handleHoverMove);
            document.removeEventListener('mouseout', handleHoverOut);
        } else {
            hoverTrackingActive = true;
            hoverTooltip = document.createElement('div');
            hoverTooltip.style.position = 'fixed';
            hoverTooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
            hoverTooltip.style.color = '#ff4757';
            hoverTooltip.style.border = '1px solid #ff4757';
            hoverTooltip.style.padding = '8px 12px';
            hoverTooltip.style.borderRadius = '8px';
            hoverTooltip.style.fontSize = '12px';
            hoverTooltip.style.fontWeight = 'bold';
            hoverTooltip.style.zIndex = '999999';
            hoverTooltip.style.pointerEvents = 'none';
            hoverTooltip.style.transition = 'all 0.1s ease';
            hoverTooltip.style.boxShadow = '0 4px 15px rgba(255, 71, 87, 0.4)';
            document.body.appendChild(hoverTooltip);
            
            document.addEventListener('mousemove', handleHoverMove);
            document.addEventListener('mouseout', handleHoverOut);
        }
        sendResponse({ success: true });
    }
});
