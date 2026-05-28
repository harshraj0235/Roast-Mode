const prompt = `You are a brutal web designer. Roast this: URL: http://example.com. Title: Example Domain. Respond ONLY with JSON: {"roast": "...", "whyItFails": "...", "conversionScore": 10, "trustScore": 10}`;

async function test() {
    try {
        const response = await fetch('https://text.pollinations.ai/openai', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                model: 'openai',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' }
            })
        });
        const data = await response.json();
        console.log("Raw Response:");
        console.log(JSON.stringify(data, null, 2));
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            const content = data.choices[0].message.content;
            console.log("\nParsed Content:");
            console.log(JSON.parse(content));
        }
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
