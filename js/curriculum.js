// Výchozí údaje o ročnících, rozvrhu, tématech (z tematických plánů) a šablony aktivit.
// Tyto hodnoty se použijí při prvním spuštění; témata a slovíčka pak upravujete přímo v aplikaci.

export const GRADES = {
  2: {
    id: 2,
    name: '2. ročník',
    color: 'orange',
    kids: 5,
    year: 'první rok angličtiny',
    note: 'Hodina po obědě – krátké aktivity 3–7 min, hodně pohybu, převážně mluvená forma, minimum psaní.',
    maxActivity: 7,
    // weekday: 1 = pondělí, 2 = úterý
    slots: [{ weekday: 1, period: '5. hodina', minutes: 45, equipment: 'interaktivní tabule + počítače' }],
  },
  3: {
    id: 3,
    name: '3. ročník',
    color: 'green',
    kids: 13,
    year: 'druhý rok angličtiny',
    note: 'Přechod z mluvené na psanou formu (doplňovačky, slovíčka i ustálená spojení). Pondělí dvouhodinovka – jasné předěly a pohybová přestávka.',
    maxActivity: 12,
    slots: [
      { weekday: 1, period: '1.–2. hodina', minutes: 90, equipment: 'interaktivní tabule, bez počítačů' },
      { weekday: 2, period: '3. hodina', minutes: 45, equipment: 'počítače + interaktivní tabule' },
    ],
  },
  4: {
    id: 4,
    name: '4. ročník',
    color: 'blue',
    kids: 12,
    year: 'třetí rok angličtiny',
    note: 'Převaha soutěživých chlapců – týmy, body, časovka s pravidly fair play. Rozšíření hlavně na psaní.',
    maxActivity: 15,
    slots: [
      { weekday: 1, period: '3. hodina', minutes: 45, equipment: 'počítače + interaktivní tabule' },
      { weekday: 2, period: '1.–2. hodina', minutes: 90, equipment: 'počítače + interaktivní tabule' },
    ],
  },
};

export const GRADE_IDS = [2, 3, 4];

// Témata podle tematických plánů učiva (měsíc → obsah). Pořadí = pořadí v roce.
export const TOPICS = {
  2: [
    { months: 'září', title: 'Hello ball, hello boy, hello girl', content: 'big / little; barvy; in, on; pohyby up, down, around, touch the ground, turn around, run, jump, sit down; písničky Hello ball, Explorers' },
    { months: 'říjen', title: 'Barvy, čísla do 12, A Ball Story', content: 'Lucky says + slovesa pohybu; barevné diktáty, anglická matematika; garden, tree, grass, house, flower, ball, jump over, run around; in, on; dramatizace; první setkání s psanou podobou' },
    { months: 'listopad', title: 'Pocity a hračky', content: 'happy, angry, scared, sleepy; toys; I have got; propojování mluvené a psané podoby; Bingo, If you’re happy…, Look and say and clap with me' },
    { months: 'prosinec', title: 'How are you? I’m…', content: 'hračky, barvy, čísla – procvičování; old, new, big, small; ride a scooter, ride a bike, kick a ball, play the guitar, drive a car; I have got, who has got; Bingo' },
    { months: 'leden', title: 'Školní potřeby, čísla do 20', content: 'anglická matematika, barvy, big/little; spojovačky psané a mluvené podoby; Lucky says, I have…who has…, Bingo, Wordwall; jump, run, tiptoe, walk, hop' },
    { months: 'únor', title: 'Upevnění slovní zásoby', content: 'psaná podoba – doplňování písmen; flashcards a wordcards; anglické hry' },
    { months: 'březen', title: 'Co umím – can / can’t', content: 'jump, run, climb, rollerblade, dance, ride a bike; hungry, thirsty, cold, hot; He’s / She’s…' },
    { months: 'duben', title: 'Velikonoce, rodina – This is my…', content: 'Easter egg hunt; rodina; poslech, písničky, kreslicí diktáty' },
    { months: 'květen', title: 'Zvířata – les, zahrada, farma', content: 'slovesa pohybu zvířat; can / can’t – co zvířata umí; mluvená a psaná podoba; písničky s pohybem' },
    { months: 'červen', title: 'Opakování a hry', content: 'opakování slovní zásoby a vazeb; Wordwall; pohybové hry, písničky' },
  ],
  3: [
    { months: 'září', title: 'Opakování 2. ročníku', content: 'barvy, hračky, rodina, zvířata, školní potřeby, čísla do 20, pocity; How are you? He’s, She’s, I’ve got, I’m, I can, I can’t; in, on; množné číslo -s; skip, hop, stretch, bend; Wordwall' },
    { months: 'říjen–listopad', title: 'Hello again + Explorers', content: 'představení se, potřeby průzkumníka, dny v týdnu, počasí; He is, she is, He has got, she has got; doplňování, skládání, opis' },
    { months: 'říjen–listopad', title: 'Unit 1 – Outdoors', content: 'co vidím venku, moje oblíbené místo; there is / there are; Outdoors in Britain; Bonfire Night, Halloween' },
    { months: 'prosinec–leden', title: 'Unit 2 – Food', content: 'oblíbené jídlo a pití; I like, I don’t like, My favourite…; fráze u stolu; Food in Britain; abeceda, spelling; The Toys 1' },
    { months: 'únor–březen', title: 'Unit 3 – Tiny creatures', content: 'hmyz a maskování, rostliny, neživá příroda; zvířata na zahradě, farmě, v lese; They are…, on / in; Tropical World' },
    { months: 'duben', title: 'Unit 4 – Clothes', content: 'oblečení; put on, take off, I am wearing, How many?; práce s grafem; oblečení ze starých časů; The Toys 2' },
    { months: 'květen', title: 'Unit 5 – The beach', content: 'pláž, léto, prázdniny; přídavná jména; My bucket is small; koloběh vody; The Toys 3; Den matek' },
    { months: 'červen', title: 'Shrnutí a opakování', content: 'výslovnost, poslech, psaná podoba jazyka' },
  ],
  4: [
    { months: 'září–říjen', title: 'Hello, Unit 1 – Let’s play', content: 'představení se; čísla do 20, rodina, měsíce; volnočasové aktivity; can, can’t, Can you?, I have got, Have you got?; hudba ve světě; Space Explorers 1; Halloween' },
    { months: 'listopad–prosinec', title: 'Unit 2 – Clothes', content: 'oblečení, roční období; I am wearing, He is wearing, What are you wearing?; svátky, maškarní kostým; Christmas Day' },
    { months: 'leden–únor', title: 'Unit 3 – My bedroom', content: 'nábytek; in, on, under, next to; Where is…? Is it…? It’s over there. I don’t know.; můj pokoj; Broughton Castle; Space Explorers 2' },
    { months: 'březen–duben', title: 'Unit 4 – Wild animals', content: 'divoká zvířata, ZOO, části těla; Has it got…? Yes, it has. No, it hasn’t. It can / can’t; ochrana zvířat; Wildlife park' },
    { months: 'květen–červen', title: 'Unit 5 – Camping', content: 'jídlo, potraviny, hlavní jídla dne; Do you like…? Yes, I do. No, I don’t.; z pšenice k mouce; Space Explorers 3; opakování celého roku' },
  ],
};

// Typy forem práce – zobrazují se jako barevné štítky v průběhu hodiny.
export const FORMS = {
  lavice: { label: 'lavice', icon: '✏️' },
  tabule: { label: 'tabule', icon: '🖥️' },
  pc: { label: 'počítače', icon: '💻' },
  koberec: { label: 'koberec', icon: '🧶' },
  pohyb: { label: 'pohyb', icon: '🏃' },
};

// Šablony aktivit pro rychlé skládání hodiny.
export const ACTIVITY_TEMPLATES = [
  { name: 'Hello song / pozdrav', minutes: 3, form: 'koberec', description: 'Pozdrav, písnička, How are you? – rituál na začátek.', tip: 'Stejný začátek každou hodinu = klid a jistota.' },
  { name: 'Opakování z minula', minutes: 5, form: 'tabule', description: 'Rychlé zopakování slovíček a spojení, která ještě nesedí.', tip: '' },
  { name: 'Flashcards', minutes: 5, form: 'koberec', description: 'Uvedení / procvičení slovíček s obrázkovými kartami (What’s missing?, Flash, Whisper).', tip: 'Slabší dítě může karty ukazovat jako „pomocník“.' },
  { name: 'Lucky says', minutes: 4, form: 'pohyb', description: 'Pohybová hra s pokyny (obdoba Simon says).', tip: 'Předem jasně: kdo se splete, sedne si na 1 kolo – žádné strkání.' },
  { name: 'I have… Who has…?', minutes: 7, form: 'koberec', description: 'Řetězová hra s kartičkami.', tip: 'Kdo neví, smí se poradit s „expertem“.' },
  { name: 'Bingo', minutes: 6, form: 'lavice', description: 'Obrázkové / slovní bingo.', tip: '' },
  { name: 'Wordwall', minutes: 7, form: 'tabule', description: 'Hra na tabuli nebo na počítačích.', tip: 'Na tabuli: děti chodí po jednom podle pořadí.' },
  { name: 'Kahoot / Blooket', minutes: 10, form: 'pc', description: 'Kvíz na počítačích, soutěž jednotlivců nebo týmů.', tip: 'Pravidla fair play před startem; body za týmovou spolupráci.' },
  { name: 'Písnička / říkanka', minutes: 4, form: 'pohyb', description: 'Písnička s pohybem.', tip: '' },
  { name: 'Příběh / dramatizace', minutes: 8, form: 'koberec', description: 'Příběh s obrázky, potom zahrání rolí.', tip: 'Každý má roli – i živější děti dostanou aktivní, ale jasně vymezenou úlohu.' },
  { name: 'Doplňovačka', minutes: 8, form: 'lavice', description: 'Pracovní list – doplnění slov a spojení (2 úrovně).', tip: '' },
  { name: 'Flapbook / tvoření', minutes: 15, form: 'lavice', description: 'Stříhání, lepení, workbook.', tip: '' },
  { name: 'Pohybová přestávka', minutes: 5, form: 'pohyb', description: 'Krátká pohybová pauza (hlavně v dvouhodinovce).', tip: 'Jasný začátek i konec (signál, odpočítávání).' },
  { name: 'Rozloučení / reflexe', minutes: 3, form: 'koberec', description: 'Co jsme se dnes naučili? Goodbye song.', tip: '' },
];

// Moje nástroje – rychlý přístup z přehledu a z menu (vlastní knihovny aktivit).
export const MY_TOOLS = [
  { name: 'Wordwall', icon: '🧩', url: 'https://wordwall.net/myactivities', grades: [2, 3, 4], note: 'Moje aktivity – hry na tabuli i na PC.' },
  { name: 'Oxford Bookshelf', icon: '📚', url: 'https://www.oxfordlearnersbookshelf.com/home/main.html', grades: [2, 3, 4], note: 'E-učebnice a pracovní sešity (Let’s Explore, Explore Together) s audiem.' },
  { name: 'Blooket', icon: '🎮', url: 'https://dashboard.blooket.com/my-sets', grades: [3, 4], note: 'Moje sady – od 3. ročníku.' },
  { name: 'Kahoot!', icon: '🟣', url: 'https://create.kahoot.it/my-library/kahoots/all', grades: [3, 4], note: 'Moje knihovna kvízů – od 3. ročníku.' },
  { name: 'Toglic', icon: '🗣️', url: 'https://www.toglic.com/cs/aktivity/load/my/18493', grades: [2, 3, 4], note: 'Moje aktivity v Toglicu.' },
];

// Výchozí zdroje v knihovně (připojitelné k aktivitám v hodině).
export const DEFAULT_RESOURCES = [
  ...MY_TOOLS.map((t) => ({ title: t.name + ' – moje knihovna', url: t.url, tool: t.name.replace('!', ''), grades: t.grades, topic: '', notes: t.note })),
  { title: 'Canva', url: 'https://www.canva.com', tool: 'Canva', grades: [3, 4], topic: '', notes: 'Tvorba plakátů, prezentací.' },
  { title: 'YouTube', url: 'https://www.youtube.com', tool: 'YouTube', grades: [2, 3, 4], topic: '', notes: 'Autentická videa, písničky.' },
];

export const TOOLS = ['Wordwall', 'Kahoot', 'Blooket', 'Toglic', 'Oxford Bookshelf', 'YouTube', 'Canva', 'PowerPoint', 'Pracovní list', 'Flashcards', 'Audio', 'Jiné'];

export const VOCAB_STATUS = {
  new: { label: 'nové', short: 'nové' },
  practice: { label: 'procvičujeme', short: 'proc.' },
  weak: { label: 'potřebuje opakovat', short: 'opakovat' },
  known: { label: 'umí', short: 'umí' },
};
