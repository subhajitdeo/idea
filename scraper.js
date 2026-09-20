(function () {
    "use strict";

    const REFRESH_MS = 1000;

    function isRealStrikeRow(row, strikeCell) {
        if (!strikeCell) return false;
        const strikeText = strikeCell.innerText || "";
        if (/spot\s*price/i.test(strikeText)) return false;
        const numeric = strikeText.replace(/[^\d]/g, "");
        if (!numeric || numeric.length < 4) return false;
        const cells = row.querySelectorAll("td");
        if (!cells.length) return false;
        return [...cells].some(c => {
            const t = (c.innerText || "").trim();
            return t && t !== "undefined" && t !== "--" && t.length > 0;
        });
    }

    function firstNum(text) {
        if (!text) return 0;
        const m = String(text).match(/-?[\d,]+\.?\d*/);
        return m ? parseFloat(m[0].replace(/,/g, "")) : 0;
    }
    function parseNum(v) {
        if (!v) return 0;
        return Number(String(v).replace(/,/g, "").replace(/--/g, "0")) || 0;
    }

    function getSpotPrice() {
        const tiles = document.querySelectorAll("div.price-left-tile");
        for (const tile of tiles) {
            const txt = tile.innerText || "";
            if (!txt.includes("Spot Price")) continue;
            const ltp = tile.querySelector("span.ltp");
            if (!ltp) continue;
            const v = parseFloat(ltp.innerText.replace(/[^\d.]/g, ""));
            if (v > 1000 && v < 1000000) return v;
        }
        return 0;
    }

    function getExpiryDate() {
        const all = document.querySelectorAll("div, span");
        for (const el of all) {
            const t = (el.innerText || "").trim();
            const m = t.match(/Exp\.\s*on\s+(\d{1,2})-([A-Za-z]{3})-(\d{2})/i);
            if (m) {
                const months = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
                const mo = months[m[2].toLowerCase()];
                if (mo === undefined) continue;
                const year = 2000 + parseInt(m[3], 10);
                return new Date(Date.UTC(year, mo, parseInt(m[1], 10), 10, 0, 0));
            }
        }
        for (const el of all) {
            const t = (el.innerText || "").trim();
            if (t.length < 20 && /^\d{1,2}-[A-Za-z]{3}-\d{2}$/.test(t)) {
                const m2 = t.match(/(\d{1,2})-([A-Za-z]{3})-(\d{2})/);
                if (m2) {
                    const months = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
                    const mo = months[m2[2].toLowerCase()];
                    if (mo === undefined) continue;
                    return new Date(Date.UTC(2000 + parseInt(m2[3], 10), mo, parseInt(m2[1], 10), 10, 0, 0));
                }
            }
        }
        return null;
    }

    function scrape() {
        const ceTable     = document.querySelector("div.optionTable_call table");
        const strikeTable = document.querySelector("div.optionTable_strikePrice table");
        const peTable     = document.querySelector("div.optionTable_put table");
        if (!ceTable || !strikeTable || !peTable) return null;

        const spot = getSpotPrice();
        if (!spot) return null;

        const expiry = getExpiryDate();
        if (!expiry) return null;

        const daysToExpiry = (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        if (daysToExpiry <= 0) return null;

        const ceRows     = [...ceTable.querySelectorAll("tbody tr")];
        const strikeRows = [...strikeTable.querySelectorAll("tbody tr")];
        const peRows     = [...peTable.querySelectorAll("tbody tr")];
        const count      = Math.min(ceRows.length, strikeRows.length, peRows.length);

        const rows = [];
        let atmStrike = null, minDiff = Infinity;

        for (let i = 0; i < count; i++) {
            const ceC = ceRows[i].querySelectorAll("td");
            const stC = strikeRows[i].querySelectorAll("td");
            const peC = peRows[i].querySelectorAll("td");
            if (!ceC.length || !stC.length || !peC.length) continue;
            if (!isRealStrikeRow(strikeRows[i], stC[0])) continue;

            const strike = parseNum(stC[0].innerText);
            if (!strike || strike < 1000) continue;

            rows.push({
                strike,
                ceLTP: firstNum(ceC[0]?.innerText),
                ceOI:  firstNum(ceC[1]?.innerText),
                ceVol: firstNum(ceC[2]?.innerText),
                ceIV:  firstNum(ceC[3]?.innerText),
                peLTP: firstNum(peC[0]?.innerText),
                peOI:  firstNum(peC[1]?.innerText),
                peVol: firstNum(peC[2]?.innerText),
                peIV:  firstNum(peC[3]?.innerText)
            });

            const diff = Math.abs(strike - spot);
            if (diff < minDiff) { minDiff = diff; atmStrike = strike; }
        }

        if (!rows.length || !atmStrike) return null;

        return {
            spot,
            atmStrike,
            daysToExpiry,
            rows,
            timestamp: Date.now()
        };
    }

    setInterval(() => {
        const data = scrape();
        if (!data) return;
        try {
            chrome.runtime.sendMessage({ type: "NUVAMA_DATA", payload: data }, () => {
                if (chrome.runtime.lastError) { /* ignore */ }
            });
        } catch (e) { /* ignore */ }
    }, REFRESH_MS);

    console.log("[nuvama-pyodide] scraper active, 1s refresh");
})();
