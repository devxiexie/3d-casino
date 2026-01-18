const SYMBOL_DATA = {
    '1': { value: 1000, weight: 2 },
    '2': { value: 500, weight: 5 },
    '3': { value: 200, weight: 10 },
    '4': { value: 100, weight: 15 },
    '5': { value: 50, weight: 20 },
    '6': { value: 10, weight: 60 }
};

const symbols = Object.keys(SYMBOL_DATA);
const reel1 = document.getElementById('reel1');
const reel2 = document.getElementById('reel2');
const reel3 = document.getElementById('reel3');
const spinBtn = document.getElementById('spin-btn');
const creditsEl = document.getElementById('credits');
const messageEl = document.getElementById('message');

let credits = 100;
let spinning = false;

function getRandomSymbol() {
    return symbols[Math.floor(Math.random() * symbols.length)];
}

function getWeightedSymbol() {
    const totalWeight = Object.values(SYMBOL_DATA).reduce((sum, item) => sum + item.weight, 0);
    let random = Math.floor(Math.random() * totalWeight);
    
    for (const symbol of symbols) {
        random -= SYMBOL_DATA[symbol].weight;
        if (random < 0) return symbol;
    }
    return symbols[symbols.length - 1];
}

function spinReel(reel, delay) {
    return new Promise(resolve => {
        reel.classList.add('spinning');
        const prevEl = reel.querySelector('.symbol.prev');
        const currentEl = reel.querySelector('.symbol.current');
        const nextEl = reel.querySelector('.symbol.next');
        
        const interval = setInterval(() => {
            prevEl.textContent = getRandomSymbol();
            currentEl.textContent = getRandomSymbol();
            nextEl.textContent = getRandomSymbol();
        }, 100);
        
        setTimeout(() => {
            clearInterval(interval);
            reel.classList.remove('spinning');
            
            const finalSymbol = getWeightedSymbol();
            
            prevEl.textContent = getRandomSymbol();
            currentEl.textContent = finalSymbol;
            nextEl.textContent = getRandomSymbol();
            
            resolve(finalSymbol);
        }, delay);
    });
}

async function spin() {
    if (spinning || credits < 10) {
        if (credits < 10) {
            messageEl.textContent = "NO CREDITS!";
            messageEl.style.color = "red";
        }
        return;
    }

    spinning = true;
    credits -= 10;
    creditsEl.textContent = credits;
    messageEl.textContent = "SPINNING...";
    messageEl.style.color = "#ff00ff";
    spinBtn.disabled = true;

    const p1 = spinReel(reel1, 1000);
    const p2 = spinReel(reel2, 1500);
    const p3 = spinReel(reel3, 2000);

    const [s1, s2, s3] = await Promise.all([p1, p2, p3]);

    checkWin(s1, s2, s3);
    
    spinning = false;
    spinBtn.disabled = false;
}

function checkWin(s1, s2, s3) {
    if (s1 === s2 && s2 === s3) {
        const winAmount = SYMBOL_DATA[s1].value;
        credits += winAmount;
        creditsEl.textContent = credits;
        messageEl.textContent = `JACKPOT! +${winAmount}`;
        messageEl.style.color = "yellow";
        triggerWinEffect();
    } else if (s1 === s2) {
         const winAmount = Math.floor(SYMBOL_DATA[s1].value * 0.2);
         credits += winAmount;
         creditsEl.textContent = credits;
         messageEl.textContent = `MATCH! +${winAmount}`;
         messageEl.style.color = "#00ffff";
    } else if (s2 === s3) {
         const winAmount = Math.floor(SYMBOL_DATA[s2].value * 0.2);
         credits += winAmount;
         creditsEl.textContent = credits;
         messageEl.textContent = `MATCH! +${winAmount}`;
         messageEl.style.color = "#00ffff";
    } else if (s1 === s3) {
         const winAmount = Math.floor(SYMBOL_DATA[s1].value * 0.2);
         credits += winAmount;
         creditsEl.textContent = credits;
         messageEl.textContent = `MATCH! +${winAmount}`;
         messageEl.style.color = "#00ffff";
    } else {
        messageEl.textContent = "TRY AGAIN";
        messageEl.style.color = "#ff00ff";
    }
}

function triggerWinEffect() {
    const container = document.querySelector('.machine-container');
    container.style.boxShadow = '0 0 100px gold';
    setTimeout(() => {
        container.style.boxShadow = '0 0 50px rgba(0,0,0,0.8), inset 0 0 20px rgba(255, 255, 255, 0.5), inset 5px 5px 15px rgba(0,0,0,0.2)';
    }, 1000);
}

spinBtn.addEventListener('click', spin);

