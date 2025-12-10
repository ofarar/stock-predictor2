// server/bot_registry.js

/**
 * BOT REGISTRY
 * Defines the "League of Analyst Bots" including their persona, strategy, and risk params.
 */

const BOT_CATEGORIES = {
    TECH_MOMENTUM: {
        prefix: "",
        count: 35,
        // Added: SOFI, ADBE, SNOW, UBER, NFLX, PYPL, MARVL (MRVL), MU, OKTA, GTLB, ZETA
        universe: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'AMD', 'NFLX', 'INTC', 'CRM', 'ADBE', 'AVGO', 'QCOM', 'TXN', 'SOFI', 'SNOW', 'UBER', 'PYPL', 'MRVL', 'MU', 'OKTA', 'GTLB', 'ZETA'],
        strategy: "Momentum",
        risk: "Aggressive",
        description: "Specializes in high-growth technology stocks, looking for momentum breakouts.",
        volatilityCap: 0.05
    },
    QUANTUM_COMPUTE: {
        prefix: "",
        count: 15,
        // Added: QBTS, IONQ, RGTI in previous, ensuring QBTS is here. Added RKLB (Space/Futuristic), OKLO (Nuclear/Future), ASTS, EOSE, ONDS, CIFR
        universe: ['IONQ', 'RGTI', 'QBTS', 'HON', 'IBM', 'GOOGL', 'MSFT', 'NVDA', 'INTC', 'RKLB', 'OKLO', 'ASTS', 'EOSE', 'ONDS', 'CIFR'],
        strategy: "DisruptiveTech",
        risk: "Speculative",
        description: "Focuses on emerging quantum computing, space, and next-gen energy infrastructure.",
        volatilityCap: 0.08
    },
    HEALTH_PLUS: { // NEW CATEGORY
        prefix: "",
        count: 20,
        // Stocks: HIMS, OSCR, UNH, AMRN, VKTX (Bio/Health mix)
        universe: ['HIMS', 'OSCR', 'UNH', 'AMRN', 'VKTX', 'PFE', 'LLY', 'JNJ', 'MRK', 'ABBV', 'TMO', 'DHR'],
        strategy: "SectorRotation",
        risk: "Moderate",
        description: "Analyzes healthcare trends, insurance cycles, and pharmaceutical breakthroughs.",
        volatilityCap: 0.04
    },
    SAFE_DIVIDEND: {
        prefix: "",
        count: 25,
        universe: ['KO', 'JNJ', 'PG', 'WMT', 'VZ', 'T', 'PEP', 'MCD', 'COST', 'XOM', 'CVX', 'MRK', 'PFE'],
        strategy: "MeanReversion",
        risk: "Conservative",
        description: "Focuses on stable, dividend-paying blue chip stocks with low volatility.",
        volatilityCap: 0.02
    },
    CRYPTO_WHALE: {
        prefix: "",
        count: 20,
        // Added: IREN, CORZ (if any), HOOD (Crypto adjacent), OPEN (Fintech/Proptech often correlated), GME (Meme/Retail)
        universe: ['BTC-USD', 'ETH-USD', 'COIN', 'MSTR', 'MARA', 'RIOT', 'IREN', 'HOOD', 'GME', 'CIFR'],
        strategy: "HighVol",
        risk: "Speculative",
        description: "Navigates the volatile cryptocurrency markets and retail favorites.",
        volatilityCap: 0.10
    },
    GOLD_MINER: {
        prefix: "",
        count: 20,
        universe: ['GLD', 'GDX', 'NEM', 'GOLD', 'AEM', 'RGLD', 'FNV', 'SIL', 'SLV'],
        strategy: "CommodityCycle",
        risk: "Moderate",
        description: "Analyzes precious metals and mining stocks correlated with macro-economic cycles.",
        volatilityCap: 0.04
    },
    ENERGY_BULL: {
        prefix: "",
        count: 20,
        // Added: AEOSMR (assuming correct ticker? maybe AEHR? or similar. Keeping as requested if valid), RR (Rolls Royce - Industrial/Energy)
        universe: ['XOM', 'CVX', 'SHELL', 'BP', 'TTE', 'COP', 'EOG', 'SLB', 'HAL', 'RR'],
        strategy: "Trend",
        risk: "Moderate",
        description: "Focuses on the energy, industrial, and defense sectors.",
        volatilityCap: 0.04
    },
    BANKING_PRO: {
        prefix: "",
        count: 20,
        universe: ['JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'AXP', 'V', 'MA', 'SOFI', 'HOOD', 'LMND', 'OPEN'],
        strategy: "Fundamental",
        risk: "Conservative",
        description: "Analyzes financial institutions, fintech disruption, and interest rate environments.",
        volatilityCap: 0.03
    },
    CONTRARIAN: {
        prefix: "",
        count: 25,
        // Added: DJT (Trump Media - very volatile/contrarian), LTR (Loews? or other. Keeping generic universe strong)
        universe: ['TSLA', 'NVDA', 'AMD', 'META', 'NFLX', 'BA', 'LULU', 'NKE', 'DJT', 'GME', 'AMC', 'PLTR'],
        strategy: "Contrarian",
        risk: "High",
        description: "Looks for overextended moves to predict sharp reversals against the herd.",
        volatilityCap: 0.06
    }
};

const MALE_NAMES = [
    "James", "Robert", "John", "Michael", "David", "William", "Richard", "Joseph", "Thomas", "Charles", "Christopher", "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven", "Paul", "Andrew", "Joshua", "Kenneth", "Kevin", "Brian", "George", "Edward", "Ronald", "Timothy", "Jason", "Jeffrey", "Ryan", "Jacob", "Gary", "Nicholas", "Eric", "Jonathan", "Stephen", "Larry", "Justin", "Scott", "Brandon", "Benjamin", "Samuel", "Gregory", "Alexander", "Frank", "Patrick", "Raymond", "Jack", "Dennis", "Jerry", "Tyler", "Aaron", "Jose", "Adam", "Henry", "Nathan", "Douglas", "Zachary", "Peter", "Kyle", "Walter", "Ethan", "Jeremy", "Harold", "Keith", "Christian", "Roger", "Noah", "Gerald", "Carl", "Terry", "Sean", "Austin", "Arthur", "Lawrence", "Jesse", "Dylan", "Bryan", "Joe", "Jordan", "Billy", "Bruce", "Albert", "Willie", "Gabriel", "Logan", "Alan", "Juan", "Wayne", "Roy", "Ralph", "Randy", "Eugene", "Vincent", "Russell", "Elijah", "Louis", "Bobby", "Philip", "Johnny"
];

const FEMALE_NAMES = [
    "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen", "Nancy", "Lisa", "Betty", "Margaret", "Sandra", "Ashley", "Kimberly", "Emily", "Donna", "Michelle", "Dorothy", "Carol", "Amanda", "Melissa", "Deborah", "Stephanie", "Rebecca", "Sharon", "Laura", "Cynthia", "Kathleen", "Amy", "Shirley", "Angela", "Helen", "Anna", "Brenda", "Pamela", "Nicole", "Emma", "Samantha", "Katherine", "Christine", "Debra", "Rachel", "Catherine", "Carolyn", "Janet", "Ruth", "Maria", "Heather", "Diane", "Virginia", "Julie", "Joyce", "Victoria", "Olivia", "Kelly", "Christina", "Lauren", "Joan", "Evelyn", "Judith", "Megan", "Cheryl", "Andrea", "Hannah", "Martha", "Jacqueline", "Frances", "Gloria", "Ann", "Teresa", "Kathryn", "Sara", "Janice", "Jean", "Alice", "Madison", "Doris", "Abigail", "Julia", "Judy", "Grace", "Denise", "Amber", "Marilyn", "Beverly", "Danielle", "Theresa", "Sophia", "Marie", "Diana", "Brittany", "Natalie", "Isabella", "Charlotte", "Rose", "Alexis", "Kayla"
];


const LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
    "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
    "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
    "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
    "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts",
    "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker", "Cruz", "Edwards", "Collins", "Reyes",
    "Stewart", "Morris", "Morales", "Murphy", "Cook", "Rogers", "Gutierrez", "Ortiz", "Morgan", "Cooper",
    "Peterson", "Bailey", "Reed", "Kelly", "Howard", "Ramos", "Kim", "Cox", "Ward", "Richardson",
    "Watson", "Brooks", "Chavez", "Wood", "James", "Bennett", "Gray", "Mendoza", "Ruiz", "Hughes",
    "Price", "Alvarez", "Castillo", "Sanders", "Patel", "Myers", "Long", "Ross", "Foster", "Jimenez",
    "Powell", "Jenkins", "Perry", "Russell", "Sullivan", "Bell", "Coleman", "Butler", "Henderson", "Barnes",
    "Gonzales", "Fisher", "Vasquez", "Simmons", "Romero", "Jordan", "Patterson", "Alexander", "Hamilton", "Graham",
    "Reynolds", "Griffin", "Wallace", "Moreno", "West", "Cole", "Hayes", "Bryant", "Herrera", "Gibson",
    "Ellis", "Tran", "Medina", "Aguilar", "Stevens", "Murray", "Ford", "Castro", "Marshall", "Owens",
    "Harrison", "Saunders", "Mata", "Woods", "Coleman", "Mccoy", "Gordon", "Knight", "Pope", "Blair"
];

function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
    return array;
}

function generateBotList() {
    const bots = [];

    // 1. Keep the Original Bot
    bots.push({
        username: "Sigma Alpha",
        category: "GENERAL_MARKET",
        gender: "male", // Assign default
        universe: ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AMD", "NFLX", "INTC", "CRM", "ADBE", "PYPL", "UBER", "ASML", "ORCL", "TSM", "AVGO"], // The OG list
        strategy: "EarningsPreRun",
        description: "The original Alpha. Specialized in pre-earnings momentum and institutional flows.",
        volatilityCap: 0.05,
        avatar: "https://robohash.org/SigmaAlpha.png?set=set1&bgset=bg1"
    });

    // 2. Add Special "Gold/USD Expert" (Requested by User)
    bots.push({
        username: "Aurelius Gold",
        category: "GOLD_FX",
        gender: "male",
        universe: ['GLD', 'GC=F', 'DX-Y.NYB', 'NEM'],
        strategy: "CommodityMacro",
        description: "Specialized model trained exclusively on historical Gold/USD correlations and macro data.",
        volatilityCap: 0.03
    });

    // Generate Pool of Gendered Names
    const maleNames = [];
    const femaleNames = [];

    for (let f of MALE_NAMES) {
        for (let l of LAST_NAMES) { if (Math.random() < 0.1) maleNames.push(`${f} ${l}`); }
    }
    for (let f of FEMALE_NAMES) {
        for (let l of LAST_NAMES) { if (Math.random() < 0.1) femaleNames.push(`${f} ${l}`); }
    }

    const shuffledMales = shuffle(maleNames);
    const shuffledFemales = shuffle(femaleNames);

    let mIndex = 0;
    let fIndex = 0;

    // 3. Generate the Fleet
    Object.keys(BOT_CATEGORIES).forEach(catKey => {
        const config = BOT_CATEGORIES[catKey];

        for (let i = 0; i < config.count; i++) {
            // Alternate gender or random
            const isMale = Math.random() > 0.5;
            let fullName, gender;

            if (isMale) {
                if (mIndex >= shuffledMales.length) mIndex = 0;
                fullName = shuffledMales[mIndex++];
                gender = 'male';
            } else {
                if (fIndex >= shuffledFemales.length) fIndex = 0;
                fullName = shuffledFemales[fIndex++];
                gender = 'female';
            }

            const shuffled = config.universe.sort(() => 0.5 - Math.random());
            const myUniverse = shuffled.slice(0, 5);

            bots.push({
                username: fullName,
                category: catKey,
                gender: gender,
                universe: myUniverse,
                strategy: config.strategy,
                description: config.description,
                volatilityCap: config.volatilityCap
            });
        }
    });

    return bots;
}

module.exports = { generateBotList, BOT_CATEGORIES };
