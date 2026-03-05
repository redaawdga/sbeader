require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path'); 
const { GoogleGenerativeAI } = require("@google/generative-ai");
// --- MULTI-KEY SETUP ---
const apiKeys = [
    "AIzaSyDdmD1mvrUsiqgYszzoOW9A7ULCuX5659s",
    "AIzaSyByNOGumWG1eIf7330yCC3cCc8RE-51Mo0",
    "AIzaSyD51jXu6jL9w0Bd9EZ4u5bfSI1uLeKa2ig",
    "AIzaSyA_WaBF2_H2p9M_KJDnfJDBQ4wZdV6zBqQ",
    "AIzaSyBWmdVEphO4T9BtX-_1SbfrjjOM3IPT0x8",
    "AIzaSyDLmqY0Ecq8ZZ8mgUjb51kK8I1ErUqxZWY",
    "AIzaSyDgygeXoVXgMTjdpSC1YHMVeZomAUgKtkc",
    "AIzaSyBhiimMNHhRQKepm24fTf2JLPmH8J9YKw0",
    "AIzaSyAMKfTDRGUaQrMdChpgMzatyM93ioEajfI",
    "AIzaSyB4pVflJEehIygTrrVu9ilUuEn3p3QG7Os"

]
// 2. THESE TWO LINES MUST BE HERE! (Outside of all functions)
let currentKeyIndex = 0;
let aiModel;
function initAI() {
    if (apiKeys.length === 0 || apiKeys[0].startsWith("AIzaSyYourFirst")) {
        console.error("❌ API Keys missing! Make sure you pasted them in.");
        return;
    }
    
    const genAI = new GoogleGenerativeAI(apiKeys[currentKeyIndex]);
    
    // We recreate the model, but this time WITH the prompt and JSON rules!
    aiModel = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash-lite",
        systemInstruction: `Role: You are a strict, no-mercy data-validation robot for a National Science Bowl game. Your sole purpose is to evaluate the player_answer against the official_answer using the rigorous grading criteria of the Department of Energy.

Grading Logic & Criteria:

Multiple Choice Precision: For Multiple Choice questions, a player is correct ONLY if they provide the exact official letter (W, X, Y, or Z), the exact verbatim text of that choice, or both. If a player provides the correct letter but the wrong text (e.g., says "X" when the answer is "W) Mitochondria"), or provides the correct text but the wrong letter, you MUST mark them as incorrect (is_correct: false). There is no partial credit for "half-right" multiple-choice pairings.

List and Sequence Mandate: If the official_answer contains multiple items separated by semicolons (;) or commas (,), it is a list. The player must provide ALL items mentioned. If they miss even one item or include an extra incorrect item, they are incorrect. However, if the list in the official_answer uses numbered labels (e.g., "1) Igneous; 2) Sedimentary"), the player is correct if they provide the full words OR just the sequence of numbers (e.g., "1 and 2").

The First Answer Rule: You must only evaluate the first scientific fact or term provided by the player. If a player provides a string of different answers (e.g., "Mitosis, no, wait, Meiosis"), you must grade the first one ("Mitosis"). If the first term is wrong, the entire response is incorrect, regardless of any subsequent "self-correction."

Scientific Synonyms vs. Verbatim Terms: For Short Answer questions, you may accept commonly recognized scientific synonyms (e.g., "renal" instead of "kidney") unless the question specifically asks for a "precise" or "specific" term. For Multiple Choice, however, synonyms are NOT allowed; the player must use the exact wording provided in the choice.

Technical Accuracy & Typos: Ignore minor phonetic spelling errors or capitalization. However, do not forgive "typos" that change the scientific meaning. For example, "Methane" and "Methyne" are different chemicals; "Co" (Cobalt) and "CO" (Carbon Monoxide) are different entities. If a typo creates a different scientific concept, mark it incorrect. Units can be disregarded.

Output Format:
You must return a valid JSON object with the following structure:
{
  "reasoning": "A detailed 1-2 sentence explanation. Mention if it was Multiple Choice (matching letter/phrase) or a List (counting items). Note if the First Answer Rule was triggered.",
  "is_correct": true/false
}`,
        generationConfig: {
            responseMimeType: "application/json", // This guarantees it won't break your parser!
        }
    });
    
    console.log(`[SYSTEM] AI Initialized using Key #${currentKeyIndex + 1}`);
}


initAI();


const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sbreadermultiplayer.html'));
});

// --- PASTE YOUR FULL 200+ QUESTION DATABASE HERE ---
const questions = [
    // ROUND 1
{cat: "LIFE SCIENCE", type: "Toss-up", q: "What organelle functions to isolate a human cell’s chromosomes from the cytoplasm?", a: "NUCLEUS", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "What is the primary oxygen-carrying protein found in red blood cells?", a: "HEMOGLOBIN", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "What physical state of matter is intermediate between a solid and gas?", a: "LIQUID", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Which of the following BEST describes the term static: W) stationary X) low Y) constant Z) used", a: "STATIONARY", letter: "W"},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "What is the general name for the rising and falling of sea levels in response to the forces exerted by the Moon and Sun?", a: "TIDES", letter: ""},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Approximately what fraction of Earth’s surface is covered by oceans: W) one-half X) two-thirds Y) seven-tenths Z) four-fifths", a: "SEVEN-TENTHS", letter: "Y"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "The number 4.56 × 10^11 has how many zeroes?", a: "9", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Giving your answer in grams, subtract 200 grams from 6.2 kilograms:", a: "6,000", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "How many permanent teeth does a typical adult human have?", a: "32", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "How many canine teeth does the typical human adult have?", a: "4", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Mary tried to lift her couch by exerting 500 newtons of force but it doesn’t budge. If the couch weighed 2,000 newtons, how much work did she do: W) 0 X) 50 watts Y) 500 joules Z) 2000 joules", a: "0", letter: "W"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Jeff walks west in a straight path for 100 meters and then east in a straight path for 150 meters. What is the magnitude of his displacement, in meters?", a: "50", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "The hydrologic cycle describes the circulation of Earth’s: W) tides X) water Y) sediments Z) rocks", a: "WATER", letter: "X"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "What is the name of the rock that makes up most of the ocean floor and volcanic ocean islands?", a: "BASALT", letter: ""},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "What is the SI base unit for length?", a: "METER", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Name all of the following 3 choices that are measurements units for speed: mach; newton; knots", a: "MACH; KNOTS", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Most of the heart is composed of which of the following types of tissues: W) epithelial X) connective Y) nervous Z) muscle", a: "MUSCLE", letter: "Z"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "In the taxonomical name Homo sapiens, what taxonomical rank does sapiens represent?", a: "SPECIES", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "What atomic particle balances the charge of protons to produce a neutral atom?", a: "ELECTRON", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Isotopes of the same element are based on their different numbers of what atomic particle?", a: "NEUTRONS", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the Gas giant planets is closest to the Sun?", a: "JUPITER", letter: ""},
{cat: "EARTH SCIENCE", type: "Bonus", q: "What are the 2 main factors causing the metamorphism of rocks?", a: "HEAT AND PRESSURE", letter: ""},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "If there are 640 ounces of water in 5 gallons, how many ounces are in ½ gallon?", a: "64", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Name all of the following 4 choices that are measurement units of area: meter; hectare; acre; mile", a: "HECTARE; ACRE", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "What is generally considered the basic unit of life?", a: "THE CELL", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "In what organelle of a plant cell does photosynthesis occur?", a: "CHLOROPLAST", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "An ionic state of an atom of hydrogen would have how many protons?", a: "1", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "What is the name for the biochemical process that converts grape juice into wine or soy beans into soy sauce?", a: "FERMENTATION", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Giving your answer as north, south, east, or west, a southerly wind blows FROM what direction?", a: "SOUTH", letter: ""},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following clouds has little vertical development: W) altostratus X) altocumulus Y) cirrus Z) nimbostratus", a: "CIRRUS", letter: "Y"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "What is the common name for the antiseptic, found in many homes, that decomposes into water and oxygen?", a: "HYDROGEN PEROXIDE", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "What is the chemical formula for hydrogen peroxide?", a: "H2O2", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "What is the scientific name for the white of a cooked egg?", a: "ALBUMEN", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "What term is generally used for biological catalysts?", a: "ENZYMES", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "What term do scientists use for the force of gravity acting on anything that has mass?", a: "WEIGHT", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "How many protons are present in a single helium nucleus?", a: "2", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "A weather forecast of 100% relative humidity suggests an increased possibility of: W) rain X) wind Y) rising temperature Z) drying conditions", a: "RAIN", letter: "W"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "What is the name for all Great Circles that pass through the north and south poles?", a: "LONGITUDES", letter: ""},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "What general term describes the angle or degree north or south of the equator?", a: "LATITUDE", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "The geographic north pole is at what latitude?", a: "90", letter: ""},

// ROUND 2
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "What is the most common term for the energy an object has because of its position or configuration?", a: "POTENTIAL", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Which one of the four basic forces of the universe is most directly involved with maintaining the planets in their orbits?", a: "GRAVITY", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Based on size and location, which of the 2 basic types of glaciers dominates Greenland today?", a: "CONTINENTAL", letter: ""},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following fossils is the oldest: W) trilobite X) snake Y) petrified wood Z) megalodon tooth", a: "TRILOBITE", letter: "W"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following can sometimes result after a moderate to severe blow to the head: W) Down syndrome X) meningitis Y) impetigo Z) concussion", a: "CONCUSSION", letter: "Z"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "What is the year of a person’s death who was born in the year 580 BC and lived 63 years?", a: "517 BC", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "How many limbs are tetrapods typically considered to have?", a: "4", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Which of the following is the most common source of energy for brain cells in humans: W) nucleic acids X) proteins Y) glucose Z) pectins", a: "GLUCOSE", letter: "Y"},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "What is the most common term for the ratio of the output force to the input force of a simple machine?", a: "MECHANICAL ADVANTAGE", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Which of the following most directly contributes to the actual mechanical advantage always being less than the ideal mechanical advantage: W) the basic design of any machine X) friction Y) how simple machines are combined Z) the input distance always being less than the output distance", a: "FRICTION", letter: "X"},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following is NOT a mineral: W) quartz X) topaz Y) basalt Z) diamond", a: "BASALT", letter: "Y"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following is the hottest region of planet Earth: W) the mantle X) the inner core Y) the outer core Z) the crust", a: "THE INNER CORE", letter: "X"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "What is the kelvin temperature that represents a condition of no molecular motion?", a: "0", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "How many grams are in 1 metric ton?", a: "1 MILLION", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "What is the ultimate energy source for nearly all life on Earth?", a: "THE SUN", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "What is the environmental factor most directly involved in phototropism?", a: "LIGHT", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "If a chimpanzee were to throw darts at a Periodic Table, he would most likely hit an element with which of the following characteristics: W) a naturally radioactive element X) a solid at room temperature Y) a gas at room temperature Z) a liquid at room temperature", a: "A SOLID AT ROOM TEMPERATURE", letter: "X"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Which of the following has the most inertia: W) 1 kilogram of iron X) 2 kilograms of flour Y) 5 newtons of iron Z) 4 kilograms of iron", a: "4 KILOGRAMS OF IRON", letter: "Z"},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following is the BEST example of the chemical weathering of rock: W) cracking of rock by plant roots X) rain percolating through limestone Y) frost action Z) abrasion", a: "RAIN PERCOLATING THROUGH LIMESTONE", letter: "X"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "What is the name for the “river” of high altitude wind over North America that marks the southern boundary between polar air to the north and warmer air to the south?", a: "POLAR JET STREAM", letter: ""},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "What is the general name for a plastic material composed of a polymer of styrene?", a: "POLYSTYRENE", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following is a product found in most toothpastes for the purpose of making the teeth more resistant to decay by promoting remineralization: W) fluoride X) melamine Y) titanium dioxide Z) diethylene glycol", a: "FLUORIDE", letter: "W"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "What is the scientific name of the human windpipe?", a: "TRACHEA", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "The organ of Corti is directly involved in what human sense?", a: "HEARING", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following is TRUE regarding mixing pigments: W) violet is typically considered a primary color for pigments X) only primary pigment colors can be mixed to give other colors Y) as more pigments are mixed, the darker the resulting mixture becomes Z) magenta and cyan are complementary pigment colors", a: "AS MORE PIGMENTS ARE MIXED, THE DARKER THE RESULTING MIXTURE BECOMES", letter: "Y"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "What color will a red colored object appear to a human if it is illuminated by a red light?", a: "RED", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following is often the LEAST reliable property of a mineral that is used in mineral identification: W) magnetism X) specific gravity Y) color Z) cleavage", a: "COLOR", letter: "Y"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following terms best describes the streak of a mineral: W) wavy X) tabular Y) translucent Z) brown", a: "BROWN", letter: "Z"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following best describes a smaller stream that merges with a larger stream: W) delta X) rip-rap Y) streamer Z) tributary", a: "TRIBUTARY", letter: "Z"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following is a structural adaptation of ducks that is most helpful in keeping them dry: W) an oil-producing gland X) hollow fur Y) darkly colored plumage Z) ability to float", a: "AN OIL-PRODUCING GLAND", letter: "W"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Which of the following is the closest synonym for motile: W) having a motor X) using energy Y) able to move Z) living in water", a: "ABLE TO MOVE", letter: "Y"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Which of the following terms is used by microbiologists for a bacterium with a rod shape: W) tubular X) bacillus Y) trichome Z) cylindrical", a: "BACILLUS", letter: "X"},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "What nucleon balances the charge of electrons to give an atom a neutral state?", a: "PROTON(S)", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Nitrogen has 7 protons. What is the atomic mass of its common isotope, rounded to the nearest whole number?", a: "14", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "What molecular substance is believed to be the most basic requirement or signature for life to exist on a planet?", a: "WATER", letter: ""},
{cat: "EARTH SCIENCE", type: "Bonus", q: "What planets are able to pass between the Earth and the Sun?", a: "MERCURY; VENUS", letter: ""},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "The lead-acid battery is most commonly found in: W) automobiles X) cell phones Y) flashlights Z) laptop computers", a: "AUTOMOBILES", letter: "W"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "From what biological polymer is paper primarily composed?", a: "CELLULOSE", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "What is the common name of the members of the Class Aves?", a: "BIRDS", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Name all of the following 3 groups of animals that are vertebrates: amphibians; reptiles; gastropods", a: "AMPHIBIANS; REPTILES", letter: ""},

// ROUND 3
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following is a coastal morphology most characteristic of the west coast of the U.S.: W) numerous estuaries X) depositional coast Y) extensive barrier islands Z) rocky coast with small spits and pocket beaches", a: "ROCKY COAST WITH SMALL SPITS AND POCKET BEACHES", letter: "Z"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following best describes how a sedimentary rock can form: W) compaction and cementation X) slow cooling and hardening of magma Y) fast cooling and hardening of magma Z) high temperature and pressure causing recrystalization", a: "COMPACTION AND CEMENTATION", letter: "W"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following does the prefix “ambi” mean, as in the word ambidextrous: W) equal X) both Y) neither Z) always", a: "BOTH", letter: "X"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Arrange the following 4 choices from the one with the LOWEST mass to the HIGHEST mass: decigram; microgram; centigram; hectogram", a: "MICROGRAM; CENTIGRAM; DECIGRAM; HECTOGRAM", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "What is the most common term for the biological polymer found in chromosomes that stores genetic information?", a: "DNA", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Inside what human cell organelle does replication of the chromosomal DNA in preparation for mitosis occur?", a: "NUCLEUS", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "What is the mass, in grams to the nearest whole number, of one cubic centimeter of pure water at standard temperature and pressure?", a: "1", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Name all of the following 3 choices that a physicist would consider to be simple machines: bicycle; lever; ramp", a: "LEVER; RAMP", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "The greatest geophysical impacts from the movement of Earth’s lithospheric plates are most often seen and felt in which of the following areas: W) at the center of the plates X) at plate boundaries Y) evenly distributed throughout the entire plate Z) along riverbeds within the plates", a: "AT PLATE BOUNDARIES", letter: "X"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "What layer of Earth’s interior contains over 60% of the Earth’s mass and is composed of iron- and magnesium-rich silicates?", a: "MANTLE", letter: ""},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "One quintillion contains how many zeroes?", a: "18", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "A single U.S. quarter is 2 millimeters thick. Find the height, in centimeters, of a stack of 50 quarters:", a: "10", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "What specific structure is most directly responsible for the motility of bacteria?", a: "FLAGELLA", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "If an animal has 42 chromosomes in its normal, non-gamete or somatic cells, what term would be given to the gametes that have 21 chromosomes: W) somatic X) unigentic Y) haploid Z) solitary", a: "HAPLOID", letter: "Y"},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following BEST describes how the SI unit called the Newton is derived: W) the product of force times time X) the energy in one kilogram traveling at one meter per second Y) the force needed to accelerate 1 kilogram at one meter per second squared Z) the power needed to accelerate 1 kilogram at one kilometer per hour", a: "THE FORCE NEEDED TO ACCELERATE 1 KILOGRAM AT ONE METER PER SECOND SQUARED", letter: "Y"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "A car is traveling at a constant speed of 20 kilometers per hour on a long straight road. How many minutes will it take to travel a distance of 5 kilometers?", a: "15", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "The best evidence for the model of Earth's interior comes from the study of: W) seismology X) paleontology Y) paleomagnetism Z) glaciology", a: "SEISMOLOGY", letter: "W"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following is TRUE of the Richter Scale: W) values are always given in whole numbers X) an earthquake measuring 5 has 50-times more energy than an earthquake measuring 4 Y) it is based on a scale of 0 to 14 Z) it is based on a logarithmic scale", a: "IT IS BASED ON A LOGARITHMIC SCALE", letter: "Z"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "What hard silvery-grey metal is the 9th most common element in the Earth’s crust, has an atomic number of 22, and takes its name from the Titans?", a: "TITANIUM", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "What state in the U.S. has the largest continuous system of mangroves in the world?", a: "FLORIDA", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "What is the most common term for the symbiotic relationship where one organism benefits and the other is harmed?", a: "PARASITISM", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "What is the most common term for the type of symbiosis where one organism benefits and the other is neither significantly harmed nor helped by the interaction?", a: "COMMENSALISM", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "When using the periodic chart, what number gives the number of protons in a given element: W) period number X) group number Y) atomic number Z) average atomic mass", a: "ATOMIC NUMBER", letter: "Y"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Which of the following is NOT true: W) compounds have atoms from more than one element X) atoms can bond together to make molecules Y) all helium atoms have one more proton than all hydrogen atoms Z) all oxygen molecules have 8 neutrons", a: "ALL OXYGEN MOLECULES HAVE 8 NEUTRONS", letter: "Z"},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Most blizzards that strike the continental U.S. most directly originated in which of the following locations: W) the Gulf of Alaska X) the Gulf of Mexico Y) along the Gulf Stream Z) in the North Sea", a: "THE GULF OF ALASKA", letter: "W"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "What terrestrial planet rotates in an opposite direction to the planet Earth?", a: "VENUS", letter: ""},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following types of maps would be most useful on a hiking trip through the Alps: W) synoptic X) topographic Y) planimetric Z) Mercator projection", a: "TOPOGRAPHIC", letter: "X"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Regarding computer technology, which of the following BEST describes the bit: W) an analogue magnetic storage sequence X) a computer processor Y) a memory value of 1 through 8 Z) a binary digit that stores information", a: "A BINARY DIGIT THAT STORES INFORMATION", letter: "Z"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "What is the scientific term for the biting structures of spiders?", a: "CHELICERAE", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "In what structure of a nucleated cell are ribosomes assembled into their subunits?", a: "NUCLEOLUS", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "If the angle of incidence for a beam of light on a mirror is 27 degrees, what is the angle of reflection, in degrees?", a: "27", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Which of the following is TRUE of gases: W) they have a definite shape X) they are highly compressible Y) they behave like a fluid Z) their particles are in uniform motion", a: "THEY ARE HIGHLY COMPRESSIBLE", letter: "X"},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following terms best describes the cleavage of a mineral: W) silky X) brittle Y) perfect one way Z) sub-metallic", a: "PERFECT ONE WAY", letter: "Y"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following is a region of Earth’s atmosphere where convection is most likely to take place: W) troposphere X) stratosphere Y) tropopause Z) thermosphere", a: "TROPOSPHERE", letter: "W"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "What is the most common element in most steel?", a: "IRON", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Stainless steel is differentiated from other steels based mainly on the content of what element?", a: "CHROMIUM", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Which of the following is part of the nephron in the kidney: W) islet cells X) ureter Y) amygdala Z) glomerulus", a: "GLOMERULUS", letter: "Z"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "The human body is most commonly described as having what type of symmetry?", a: "BILATERAL", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following BEST explains why a concrete floor feels colder than a wooden floor if both are at 21ºC: W) wood is not as dense as concrete X) concrete conducts heat better than wood Y) wood is alive and concrete is not Z) concrete is much less elastic than wood", a: "CONCRETE CONDUCTS HEAT BETTER THAN WOOD", letter: "X"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Molasses flows more slowly than water. What is the most common scientific term for the ability of different substances to flow more or less freely?", a: "VISCOSITY", letter: ""},

// ROUND 4
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Rounded to the nearest whole number, what is the specific gravity of water at standard temperature and pressure?", a: "1", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Arrange the following 4 choices in order of INCREASING speed of computer data transmission: 1 gigabyte per second; 1 kilobyte per second; 1 megabyte per second; 1 terabyte per second", a: "1 KILOBYTE PER SECOND; 1 MEGABYTE PER SECOND; 1 GIGABYTE PER SECOND; 1 TERABYTE PER SECOND", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "In which of the following places would meiosis most likely occur in a mammal: W) skin X) liver Y) heart Z) ovary", a: "OVARY", letter: "Z"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "What are the most common names of the gametes produced by a human male and female, respectively?", a: "SPERM; EGG", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "An empty plastic soda bottle is closed tightly at an elevation of 10,000 feet elevation and brought back to sea level. What is the visible condition of the bottle?", a: "IT IS CRUSHED", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Name all of the following 3 choices that are physical properties of an object: length; mass; density", a: "ALL", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "A mangrove coast is likely to be found in which of the following locations: W) Alaskan Peninsula X) Hawaiian Islands Y) Florida Z) Maine", a: "FLORIDA", letter: "Y"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following is most important for climate because it transports large amounts of heat and moisture from the ocean to land: W) tides X) monsoons Y) longshore drift Z) erosion", a: "MONSOONS", letter: "X"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Rounded to the nearest whole number, what is absolute zero in degrees Celsius?", a: "–273", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Convert 1 million centimeters per hour into kilometers per hour:", a: "10", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "What anatomical structures in humans function by connecting muscles to bones?", a: "TENDONS", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "What is the light-yellow fluid that makes up the fluid portion of normal circulating human blood?", a: "PLASMA", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "A screw driver and a doorknob are considered variations of what simple machine?", a: "WHEEL AND AXLE", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Consider a lever with an ideal mechanical advantage of 8. What will its mechanical advantage be if the effort arm length is reduced by ½?", a: "4", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Bioluminescence in marine organisms is important for all but which of the following functions: W) attracting prey X) communicating with other organisms Y) illumination Z) buoyancy", a: "BUOYANCY", letter: "Z"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Magmas that crystallize beneath the Earth’s surface form intrusive bodies of igneous rock that are generally known as: W) pumice X) plutons Y) tuffs Z) breccia", a: "PLUTONS", letter: "X"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Whereas mass is measured in kilograms, what SI unit is the most common measure of an object’s weight?", a: "NEWTON(S)", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "On the earth’s surface, which of the following is CLOSEST to the mass of 1,000 pounds: W) 454 kilograms X) 2,200 kilograms Y) 1 ton Z) 1 kiloton", a: "454 KILOGRAMS", letter: "W"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Most biological catalysts are: W) proteins X) vitamins Y) carbohydrates Z) lipids", a: "PROTEINS", letter: "W"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Which of the following best describes a bacteriophage: W) a bacterial virus X) a stage in the development of most bacteria Y) the release of disease-causing bacteria from a host organism Z) a very small bacteria", a: "A BACTERIAL VIRUS", letter: "W"},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following will occur when an unbalanced force acts on an object: W) the object will stop X) the object will lose heat Y) the object will accelerate Z) the object will melt", a: "THE OBJECT WILL ACCELERATE", letter: "Y"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "What is the average acceleration, in kilometers per hour per second to the first decimal place, of a bird flying in a straight path from 0 to 50 kilometers per hour in 4 minutes and 10.0 seconds?", a: "0.2", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following terms best describes the crystal form of a mineral: W) tabular X) fluorescent Y) metallic Z) vitreous", a: "TABULAR", letter: "W"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following is the most common group of rock-forming minerals: W) sulfides X) carbonates Y) phosphates Z) silicates", a: "SILICATES", letter: "Z"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following is the MOST likely underlying reason why trees evolved with the capacity to grow tall: W) to absorb more carbon dioxide X) to enhance transpiration Y) to compete for sunlight Z) to produce more oxygen", a: "TO COMPETE FOR SUNLIGHT", letter: "Y"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Consider a star observed just above the horizon in the western sky at dusk. Where would it most likely have been at sunrise that day: W) in the same position X) just above the horizon in the eastern sky Y) high in the western sky Z) high in the southern sky", a: "JUST ABOVE THE HORIZON IN THE EASTERN SKY", letter: "X"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Which of the following plants is sometimes called a fiddlehead when it is immature: W) maple tree X) tulip Y) moss Z) fern", a: "FERN", letter: "Z"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Name all of the following 4 groups of animals that are reptiles: lizards; snakes; frogs; crocodiles", a: "LIZARDS; SNAKES; CROCODILES", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "The exchange or sharing of what atomic particle is most directly involved in chemical bonding?", a: "ELECTRONS", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "How many valence electrons are in an oxygen atom, which resides in group 16 or 6A of the Periodic Table?", a: "6", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following would be used on a weather map to indicate a cold day in winter with clear, blue skies: W) capital L X) capital H Y) green shaded areas Z) pink shaded areas", a: "CAPITAL H", letter: "X"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "What is the name for the northern-most latitude where the Sun can appear directly overhead?", a: "THE TROPIC OF CANCER", letter: ""},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "What is the astronomical term for the bright trail of a meteoroid passing through the atmosphere of the Earth?", a: "METEOR", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following foods contains the MOST calories: W) 1, twelve-ounce non-diet soda X) 1 tablespoon catsup Y) 1 8-ounce fresh orange Z) 1 tablespoon white, granulated sugar", a: "1, TWELVE-OUNCE NON-DIET SODA", letter: "W"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "How many pairs of walking legs do spiders have?", a: "4", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Name all of the following 4 organisms that are bivalves: squid; clams; snails; mussels", a: "CLAMS; MUSSELS", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Consider a yo-yo swinging on the end of a string in uniform circular motion. What is the most accurate term for the center-seeking force exerted on the yo-yo through the string?", a: "CENTRIPETAL", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "What are the four basic forces of the universe?", a: "GRAVITY; ELECTROMAGNETISM; STRONG; WEAK", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following is a highly crystalline mineral with perfect cleavage: W) native gold X) native silver Y) graphite Z) halite", a: "HALITE", letter: "Z"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "What period of the Geological Time Scale ends with the extinction of dinosaurs?", a: "CRETACEOUS", letter: ""},

// ROUND 5
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following does the prefix “photo” mean, as in the word photometer: W) record X) light Y) measure Z) expose", a: "LIGHT", letter: "X"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Arrange the following 3 choices in order of DECREASING average size: blood platelet; grain of common table salt; ragweed pollen", a: "GRAIN OF COMMON TABLE SALT; RAGWEED POLLEN; BLOOD PLATELET", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Which of the following is NOT a structure found in human cells: W) mitochondrion X) cell wall Y) lysosome Z) peroxisome", a: "CELL WALL", letter: "X"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Which of the following is closest to the meaning of intercellular: W) from within cells X) between cells Y) inside of cells Z) underneath cells", a: "BETWEEN CELLS", letter: "X"},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following must be TRUE for a tree that doubled its mass over a growing period of 2 years: W) it has doubled its volume X) it has doubled its number of atoms Y) it has doubled its inertia Z) it has doubled its density", a: "IT HAS DOUBLED ITS INERTIA", letter: "Y"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "What is the ideal mechanical advantage of a ramp that is 24 meters long and 4 meters higher at one end versus the other?", a: "6", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "The presence of which of the following is evidence that 2 valley glaciers have or had at one time joined into a larger glacier: W) perpendicular striation pattern X) overlapping end moraines Y) medial moraine Z) V-shaped valley", a: "MEDIAL MORAINE", letter: "Y"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following is NOT generally true regarding glaciers: W) the Antarctic ice sheet is depressing the crust of the Earth X) we are currently in an interglacial period Y) the ice front of a glacier with a large zone of ablation is rapidly advancing Z) the Little Ice Age ended around the mid-nineteenth century", a: "THE ICE FRONT OF A GLACIER WITH A LARGE ZONE OF ABLATION IS RAPIDLY ADVANCING", letter: "Y"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "What is the average internal Celsius temperature of the human body?", a: "37", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "By name or number, arrange the following 3 choices from the one with the LOWEST temperature to the HIGHEST temperature: 1) coldest temperature recorded on Earth; 2) average surface temperature of Saturn; 3) coldest ocean water temperature", a: "2) AVERAGE SURFACE TEMPERATURE OF SATURN; 1) COLDEST TEMPERATURE RECORDED ON EARTH; 3) COLDEST OCEAN WATER TEMPERATURE", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "What is the name of the blood vessels in vertebrate bodies where most of the exchange of oxygen and carbon dioxide occurs?", a: "CAPILLARIES", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "What specific part of the human brain is most responsible for regulating body temperature?", a: "HYPOTHALAMUS", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which one of Newtons Laws of motion most directly deals with the resistance of a body to a change in its motion?", a: "FIRST LAW", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Jerry has a mass of 100 kilograms. He runs with a velocity of 0.5 meters per second. Giving your answer in proper SI units, what is his momentum?", a: "50 KILOGRAM METERS PER SECOND", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following geological terms best refers to deposits of unsorted and unstratified sediments deposited by the movement of a glacier: W) till X) loess Y) varve Z) glacial milk", a: "TILL", letter: "W"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "What is the most abundant element in the Sun?", a: "HYDROGEN", letter: ""},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "What is the SI base unit used for the intensity of a light source?", a: "CANDELA", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Giving your answer in proper scientific notation, convert 400 grams per liter into milligrams per liter:", a: "4 × 10^5", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Which of the following describes the shape of a bacterial pilus: W) a solid sphere X) a cuboidal shaped cell Y) a thin tube Z) a helical thick solid fiber", a: "A THIN TUBE", letter: "Y"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Name all of the following 4 groups of plants that are legumes: peas; rice; soy beans; peanuts", a: "PEAS; SOY BEANS; PEANUTS", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "The most useful unit of concentration in the chemistry lab is: W) mole fraction X) mass percent Y) normality Z) molarity", a: "MOLARITY", letter: "Z"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Which of the following is NOT true of chemical reactions: W) they are always reversible X) energy is either absorbed or released Y) a new substance is formed Z) chemical bonds are broken and formed", a: "THEY ARE ALWAYS REVERSIBLE", letter: "W"},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "What northward-moving ocean current is the dominant feature generally located off the east coast of the U.S.?", a: "GULF STREAM", letter: ""},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Spring tides typically coincide with what 2 phases of the Moon?", a: "FULL; NEW", letter: ""},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following is the study of spiders: W) arachnology X) dendrochronology Y) planktology Z) lepidopterology", a: "ARACHNOLOGY", letter: "W"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "What is the astronomical term for the orbital arrangement of a superior planet with reference to the positions of the Sun and Earth, at which time the superior planet will usually appear its brightest?", a: "OPPOSITION", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Which of the following is the location of the human thymus gland: W) upper chest X) inguinal canal Y) abdomen Z) brain", a: "UPPER CHEST", letter: "W"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "What is the most common globular protein in red blood cells?", a: "HEMOGLOBIN", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following is a heterogeneous mixture: W) 5.0% glucose solution X) rubbing alcohol Y) mixture of hydrogen and oxygen gases Z) concrete", a: "CONCRETE", letter: "Z"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Which of the following would be the most logical instrument to use when a small amount of suspended particles must be separated from a liquid: W) pH meter X) centrifuge Y) spectrometer Z) tweezers", a: "CENTRIFUGE", letter: "X"},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following best describes how stalagmites in caves are formed: W) mechanical weathering X) chemical weathering Y) melting Z) decaying", a: "CHEMICAL WEATHERING", letter: "X"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following is the chief constituent of limestone: W) quartz X) clay Y) sand Z) calcite", a: "CALCITE", letter: "Z"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "What is the name of the atomic process that provides the energy for a star to shine?", a: "FUSION", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "The zodiac is typically considered to be made of how many constellations?", a: "12", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Which of the following is NOT found in prokaryotes: W) DNA X) RNA Y) ribosomes Z) golgi", a: "GOLGI", letter: "Z"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Name all of the following 4 groups of organisms that are insects: flies; beetles; crayfish; moths", a: "FLIES; BEETLES; MOTHS", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Ultrasonic sound frequencies are typically considered to be: W) above 20 hertz X) below 20 hertz Y) above 20 kilohertz Z) above 2,000 hertz", a: "ABOVE 20 KILOHERTZ", letter: "Y"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "In color synthesis using visible light, what is the most common term for the colors produced by combining equal proportions of two primary colors?", a: "SECONDARY", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "The transfer of energy from the Sun across space is accomplished primarily by: W) conduction X) convection Y) radiation Z) radio waves", a: "RADIATION", letter: "Y"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "What layer of Earth’s atmosphere starts at about the stratopause and extends upwards to about 55 miles above the Earth?", a: "MESOSPHERE", letter: ""},

// ROUND 6
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Which of the following anatomical structures is missing in the hagfish: W) heart X) brain Y) notocord Z) jaw", a: "JAW", letter: "Z"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Name all of the following 4 organisms that are echinoderms: squid; snails; starfish; lobsters", a: "STARFISH", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following is the most common electronic device used for storing electric energy in a process commonly called charging: W) capacitor X) transformer Y) rectifier Z) semiconductor", a: "CAPACITOR", letter: "W"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "What modern solid-state electronic device is used as an amplifier in modern radios and, through its wide use as an electronic switch, is a basic component in modern logic circuits?", a: "TRANSISTOR", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Giant kelp found in oceans do NOT possess which of the following structures: W) holdfasts X) gas bladders Y) stipes Z) roots", a: "ROOTS", letter: "Z"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "What numerical albedo value is given to a surface that reflects 100% of incident light?", a: "1", letter: ""},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "People who are lactose intolerant are unable to digest the sugar present in which of the following: W) milk X) wheat Y) peanuts Z) eggs", a: "MILK", letter: "W"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Arrange the following 3 choices in INCREASING order of distance: 1 mile; 2 kilometers; 1,600 yards", a: "1,600 YARDS; 1 MILE; 2 KILOMETERS", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "What is the most common term used for the biological process of converting atmospheric nitrogen into a form readily available for use in organisms?", a: "NITROGEN FIXATION", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Which of the following groups of organisms is most commonly associated with the ability to fix nitrogen: W) plants X) animals Y) plants and animals Z) bacteria", a: "BACTERIA", letter: "Z"},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following is the inverse of electrical resistance: W) voltage X) conductivity Y) amperage Z) ohms", a: "CONDUCTIVITY", letter: "X"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Which of the following is the current carrier in a typical electrical conductor: W) free protons X) mobile electrons Y) stable atoms Z) hydrogen ions", a: "MOBILE ELECTRONS", letter: "X"},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which 2 of the following 4 choices represent the suspended load of a river that gives a slow-moving river a cloudy appearance: gravel; clay; silt; sand", a: "CLAY; SILT", letter: ""},
{cat: "EARTH SCIENCE", type: "Bonus", q: "The average depth of the ocean basin floor is: W) 1,000 to 2,000 meters X) 2,000 to 4,000 meters Y) 4,000 to 6,000 meters Z) 6,000 to 10,000 meters", a: "4,000 TO 6,000 METERS", letter: "Y"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Name all of the following 4 choices that are NOT SI units: meter; kilogram; degree Celsius; mole", a: "DEGREE CELSIUS", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Convert 5 meters per second to kilometers per hour:", a: "18", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Which of the following is a lipid: W) lipase X) myoglobin Y) trypsin Z) corn oil", a: "CORN OIL", letter: "Z"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Which of the following organisms contains the most chitin by percent of body weight: W) leopard X) ant Y) squid Z) whale", a: "ANT", letter: "X"},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Nitrogen, sulfur, and selenium are all: W) metals X) nonmetals Y) metalloids Z) noble gases", a: "NONMETALS", letter: "X"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Name all of the following 3 substances that are allotropes or different chemical forms of carbon: diamond; graphite; topaz", a: "DIAMOND; GRAPHITE", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following is a volcanic rock that is so lightweight that it can sometimes float on water: W) obsidian X) pitchstone Y) pumice Z) basalt", a: "PUMICE", letter: "Y"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "What 4 planets of our solar system have the highest mean density?", a: "MERCURY; VENUS; EARTH; MARS", letter: ""},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "What is the common name for the organic solvent which is the main ingredient in nail polish remover?", a: "ACETONE", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "What element makes up about 24% of the Sun’s mass?", a: "HELIUM", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "What parts of a flower make up the corolla?", a: "PETALS", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Name all of the following 4 plants that have male and female flowers on the same plant: apple tree; tomato; maple tree; pumpkin", a: "ALL", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "How many carbons are there in an ethanol molecule?", a: "2", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Which of the following is LEAST accurate regarding most solids: W) particles in a solid vibrate around fixed positions X) particles in a solid have no kinetic energy Y) most solids are crystalline Z) solids have definite melting points in their pure state", a: "PARTICLES IN A SOLID HAVE NO KINETIC ENERGY", letter: "X"},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following volcanic landforms is characterized by relatively quiet eruptions with little or no pyroclastic flows: W) stratovolcano X) cinder cone Y) shield Z) caldera", a: "SHIELD", letter: "Y"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Mudstone, or mudrock, is which of the following: W) fine-grained sedimentary rock X) coarse-grained sedimentary rock Y) fine-grained metamorphic rock Z) coarse-grained metamorphic rock", a: "FINE-GRAINED SEDIMENTARY ROCK", letter: "W"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "In the United States, what crop is primarily used for ethanol fuel production?", a: "CORN", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Name whether the following 3 substances are primarily derived from plants or animals, respectively: coal; cotton; lard", a: "COAL = PLANT; COTTON = PLANT; LARD = ANIMAL", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "How many chambers does the heart of a shark have?", a: "2", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Name all of the following 4 groups of organisms in which mitosis occurs: birds; reptiles; mollusks; bacteria", a: "BIRDS; REPTILES; MOLLUSKS", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "What is the density, in grams per cubic centimeter, of a sample of plastic that floats with 45% of its volume submerged in pure water?", a: "0.45", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Ignoring friction, what is the acceleration, in meters per second squared, when 1,000 newtons of force are applied to move a 200-kilogram crate across a level floor?", a: "5", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Marble is a metamorphic rock primarily composed of: W) quartz X) granite Y) dolomite Z) calcite", a: "CALCITE", letter: "Z"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "What unstable substance does the stratosphere contain that functions to protect life on Earth?", a: "OZONE", letter: ""},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "What is the name for the plastic-ware consisting of two overlapping round plastic or glass dishes used by microbiologists in which to grow bacteria?", a: "PETRI DISH", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following is typically used by a microbiologist for growing bacterial cultures in petri dishes: W) autoclave X) incubator Y) laminar flow hood Z) fume hood", a: "INCUBATOR", letter: "X"},

// ROUND 7
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following laws most directly limits the ability of a simple machine to an efficiency of 100% or lower: W) Hooke’s law X) law of equal proportions Y) the first law of motion Z) the law of conservation of energy", a: "THE LAW OF CONSERVATION OF ENERGY", letter: "Z"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "To the first decimal place, what is the ideal mechanical advantage of a lever with a resistance arm of 200 centimeters and an effort arm of 3.4 meters?", a: "1.7", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following characteristics is most commonly associated with a tsunami wave as opposed to a normal ocean wave in the open ocean: W) period of 5 seconds X) wavelength of 300 miles Y) speed of 50 miles per hour Z) motion of only the uppermost layer of water", a: "WAVELENGTH OF 300 MILES", letter: "X"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following is a true tidal wave: W) tsunami X) tidal bore Y) rip current Z) tidal range", a: "TIDAL BORE", letter: "X"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following does the prefix endo mean, as in the word endoscope: W) under X) dark Y) inside Z) invisible", a: "INSIDE", letter: "Y"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Arrange the following 3 choices in order of INCREASING speed: 3 feet per minute; 5 yards per minute; 30 yards per hour", a: "30 YARDS PER HOUR; 3 FEET PER MINUTE; 5 YARDS PER MINUTE", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Which of the following anatomical structures do sharks NOT possess: W) gill covers or opercula X) lateral lines Y) cartilaginous skeletons Z) livers", a: "GILL COVERS OR OPERCULA", letter: "W"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "What scientist is sometimes considered the father of genetics because of his extensive studies on the patterns of inheritance?", a: "GREGOR MENDEL", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "What is the mass of an electron: W) about the same as a proton X) about ½ as much as a proton Y) about 1/1,800th of a proton Z) electrons have no mass", a: "ABOUT 1/1,800TH OF A PROTON", letter: "Y"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "A 10,000-newton car is on the top floor of a parking garage 25 meters above the ground. Relative to the ground, what is the gravitational potential energy, in joules, of the car?", a: "250,000", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Streams running off the terminus of glaciers have a high bed load and easily erodible banks, typically forming which of the following types of stream patterns: W) meandering X) oxbow Y) braided Z) back swamp", a: "BRAIDED", letter: "Y"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following is similar to a delta but forms when a steep mountain stream spreads out from a mountain canyon onto a flat, broad valley: W) alluvial fan X) levee Y) playa Z) flood plain", a: "ALLUVIAL FAN", letter: "W"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following BEST describes the SI unit called the Newton: W) a unit of power X) a unit of force Y) a unit of work Z) a unit of energy", a: "A UNIT OF FORCE", letter: "X"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Rounded to the nearest whole number, how many meters per second is equal to 40 kilometers per hour?", a: "11", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "How many phalanges are in a human thumb?", a: "2", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Which of the following terms is most often used to describe a biochemical reaction where the forward reaction is at the same rate as the reverse reaction: W) isothermic X) isotropic Y) equilibrium Z) homeotropic", a: "EQUILIBRIUM", letter: "Y"},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Alkali metals all have the same: W) number of electrons in their outer shells X) atomic radii Y) electronegativities Z) melting points", a: "NUMBER OF ELECTRONS IN THEIR OUTER SHELLS", letter: "W"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Which of the following liquids at room temperature and 1 atmosphere would have the GREATEST surface tension: W) distilled water X) ethanol Y) methanol Z) acetone", a: "DISTILLED WATER", letter: "W"},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following most likely formed a U-shaped valley: W) glacial erosion X) mountain stream erosion Y) wind erosion Z) deforestation", a: "GLACIAL EROSION", letter: "W"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following gives glacial meltwater a quality which is commonly described as glacial milk: W) ice crystals in the water X) the abundance of trapped air Y) large amounts of suspended material Z) the abundance of cyanobacteria", a: "LARGE AMOUNTS OF SUSPENDED MATERIAL", letter: "Y"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following instruments consists of a weighted glass tube or bulb, which is floated in a liquid to measure the liquid’s relative density: W) hydrometer X) hypsometer Y) densitometer Z) sensometer", a: "HYDROMETER", letter: "W"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Identify each of the following 3 materials as derived from a plant or animal source, respectively: lanolin; silk; jute", a: "LANOLIN = ANIMAL; SILK = ANIMAL; JUTE = PLANT", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "In which of the following areas of the human body is the frontal bone found: W) pelvis X) spine Y) shoulder Z) head", a: "HEAD", letter: "Z"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "In which of the following areas of the human body is the ileum bone found: W) pelvis X) wrist Y) shoulder Z) head", a: "PELVIS", letter: "W"},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following chemical formulas gives an indication of the arrangement of atoms and bonds in a chemical compound: W) empirical X) molecular Y) structural Z) polyatomic", a: "STRUCTURAL", letter: "Y"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "How many total atoms are in any one molecule of Epsom salts, or MgSO4•7H2O", a: "27", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following is made of microcrystalline quartz and is very hard and compact: W) gypsum X) chalk Y) limestone Z) chert", a: "CHERT", letter: "Z"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following is NOT true of geodes: W) they occur in sedimentary and certain volcanic rocks X) they look like ordinary rocks from the outside Y) their exterior is typically made up of limestone Z) they are not found in the U.S.", a: "THEY ARE NOT FOUND IN THE U.S.", letter: "Z"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following is the study of bees: W) herpetology X) apiology Y) ichthyology Z) ornithology", a: "APIOLOGY", letter: "X"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following is CLOSEST to the height, in meters, of a person who is 4 feet and 11 inches tall: W) 1.2 X) 1.5 Y) 1.8 Z) 2.2", a: "1.5", letter: "X"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "In what organelle do parenchymal cells store most of a plant’s cellular fluid?", a: "VACUOLE", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Name all of the following 3 groups of plants that have no xylem: mosses; ferns; conifers", a: "MOSSES", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following is generally NOT true: W) the boiling point of water decreases with increased altitude on Earth X) the melting point of table salt is much higher than that of glucose Y) radon is radioactive Z) metals react with nonmetals to form new metals", a: "METALS REACT WITH NONMETALS TO FORM NEW METALS", letter: "Z"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "What is the percent efficiency, rounded to the nearest whole number, of a simple machine that requires 600 joules of energy input to achieve 400 joules of energy output?", a: "67", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following most likely made the trip from Europe to the New World possible for early sailors: W) the westerlies X) the trade winds Y) the doldrums Z) the jet stream", a: "THE TRADE WINDS", letter: "X"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following is a dark gray, low cloud associated with continuous falling rain: W) altocumulus X) stratocumulus Y) cumulus humilis Z) nimbostratus", a: "NIMBOSTRATUS", letter: "Z"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "What is the common term for the most accepted theory on how the universe came into being?", a: "BIG BANG", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "What letter is most often used by scientists as a symbol for light or the speed of light?", a: "C", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "What glands of the human body are most responsible for producing what is sometimes called the stress hormone cortisol?", a: "ADRENALS", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Name all of the following 3 choices that are common functions of feathers on birds: thermal insulation; sexual selection; flight", a: "ALL", letter: ""},

// ROUND 8
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following is NOT generally characteristic of oceanic-continental plate boundaries: W) high mountain systems X) wide continental shelves Y) ocean trenches Z) earthquake prone areas", a: "WIDE CONTINENTAL SHELVES", letter: "X"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following is an example of an island arc collision zone: W) Japan X) Oregon Y) Maine Z) Chile and Peru", a: "JAPAN", letter: "W"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following is CLOSEST to the volume of 4 liters in quarts: W) 3.8 X) 4.0 Y) 4.2 Z) 4.4", a: "4.2", letter: "Y"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Arrange the following 3 choices in order of INCREASING mass: largest moon of Saturn; Brown dwarf star; Earth", a: "LARGEST MOON OF SATURN; EARTH; BROWN DWARF STAR", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Which of the following terms do biologists most often use to describe animals that do not move by their own design or effort: W) saprophytic X) instar Y) motile Z) sessile", a: "SESSILE", letter: "Z"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "What is the base nucleotide to which adenine binds on its opposing strand in DNA?", a: "THYMINE", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Light typically travels in waves that are oriented in all planes traveling in a given direction. What is the term for light waves that are traveling in one plane?", a: "POLARIZED", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Name all of the following 4 choices that are electromagnetic radiation: radio waves; x-rays; cathode rays; visible light", a: "ALL", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Name all the planets that appear to have phases like our Moon to Earthbound observers?", a: "MERCURY; VENUS", letter: ""},
{cat: "EARTH SCIENCE", type: "Bonus", q: "The greatest annual variation in the intensity of solar radiation on Earth throughout the year is in which of the following locations: W) tropics X) north of the Arctic Circle Y) south of the Antarctic Circle Z) temperate, middle latitude zone", a: "TEMPERATE, MIDDLE LATITUDE ZONE", letter: "Z"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following is NOT a property of diamonds: W) extremely hard X) transparent Y) poor thermal conductor Z) good electrical insulator", a: "POOR THERMAL CONDUCTOR", letter: "Y"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Give the Roman numeral equivalent of 2009:", a: "MMIX", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "What anatomical structure in boney fish allows them to adjust their buoyancy and stay afloat without swimming?", a: "SWIMBLADDER", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "What is the most common name for the fluid in a spider that serves a similar function to blood in vertebrates?", a: "HAEMOLYMPH", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "In which of the following units would capacitance most likely be given: W) webers X) farads Y) teslas Z) ohms", a: "FARADS", letter: "X"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Name all of the following 3 choices that are DC voltage sources: 9-volt battery; lightning; static electricity", a: "ALL", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following best describes how volcanic glass or obsidian is formed: W) magma cools rapidly and crystals do not form X) magma cools slowly and 1 large crystal is formed Y) magma cools in direct contact with water Z) magma is heated, cooled, then reheated", a: "MAGMA COOLS RAPIDLY AND CRYSTALS DO NOT FORM", letter: "W"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "The dominant component of most magma is: W) carbon X) sulfur dioxide Y) silicon dioxide Z) nitrogen", a: "SILICON DIOXIDE", letter: "Y"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "From what element are most semiconductors primarily composed?", a: "SILICON", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following is CLOSEST to 56 miles per hour in kilometers per hour: W) 20 X) 50 Y) 90 Z) 120", a: "90", letter: "Y"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "What organelle with attached ribosomes is most directly responsible for the translation of proteins destined to be transported out of the cell?", a: "ENDOPLASMIC RETICULUM", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Name all of the following 4 functional groups that are found in all amino acids: carboxyl; ketone; amino; phosphate", a: "CARBOXYL; AMINO", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "What is the resultant force when a force of 50 newtons is opposed in an opposite direction by a 10-newton force?", a: "40", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "A dog-sled team runs at 15 kilometers per hour for 6 hours and gets stuck in a partially melted lake for 3 hours, where it make no progress. It then runs at 10 kilometers per hour for another 5 hours and crosses the finish line. What is the dog sled team’s average speed for the entire race, in kilometers per hour?", a: "10", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Banded iron formations that are present in mountain ranges around the world formed during the Achaean Era as a direct result of the presence of: W) nitrogen X) oxygen Y) hydrogen Z) methane", a: "OXYGEN", letter: "X"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following is a carbonate mineral: W) halite X) fluorite Y) feldspar Z) dolomite", a: "DOLOMITE", letter: "Z"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "What specific cell in your body becomes sickle-shaped if you are afflicted with sickle cell anemia?", a: "RED BLOOD CELL", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Name all of the following 4 laboratory tools that would require a user to read a meniscus: graduated pipet; pH paper; watch glass; Buchner funnel", a: "GRADUATED PIPET", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "What is the most common name of the plant pigments that give fruits and many plant parts their orange color?", a: "CAROTENOIDS", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Which of the following organisms has an archegonium: W) moss X) bird Y) frog Z) oak tree", a: "MOSS", letter: "W"},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "What is the most commonly used scientific name for the compound with the chemical formula C6H12O6, which is a product of photosynthesis?", a: "GLUCOSE", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Arrange the following 4 substances in order of DECREASING pH: normal human saliva; black coffee; bleach; stomach acid", a: "BLEACH; NORMAL HUMAN SALIVA; BLACK COFFEE; STOMACH ACID", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Stratovolcanoes are typically found in which of the following locations: W) continents and volcanic arcs X) the abyssal plain Y) along basaltic plateaus Z) above hot spots in Earth’s crust", a: "CONTINENTS AND VOLCANIC ARCS", letter: "W"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following is NOT true of the troposphere: W) the air is much dryer above the troposphere X) the troposphere is 78% nitrogen gas and 21% oxygen gas Y) the troposphere extends from the Earth’s surface up to an average of 27 miles Z) the troposphere ends where temperature no longer varies with height", a: "THE TROPOSPHERE EXTENDS FROM THE EARTH’S SURFACE UP TO AN AVERAGE OF 27 MILES", letter: "Y"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "From what constellation do the Geminids meteor shower appear to originate?", a: "GEMINI", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following astronomers devised a system of the orbits for the planets that is considered heliocentric and published in his book “On the Revolutions of the Heavenly Spheres”: W) Galileo X) Copernicus Y) Newton Z) Kepler", a: "COPERNICUS", letter: "X"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "How many pairs of wings do beetles typically have?", a: "2", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "How many cervical vertebrae are found in most mammals?", a: "7", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "How many wavelengths per second are equal to 5 kilohertz?", a: "5,000", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "What is the percent efficiency for a lever that has a work input of 2,000 joules and a work output of 1,600 joules?", a: "80", letter: ""},

// ROUND 9
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "A blimp or airship that uses helium as its lifting gas primarily controls its buoyancy by doing which of the following: W) adding or removing small amounts of hydrogen gas because it is lighter than helium X) heating or cooling the helium gas within the outside bladder of the blimp Y) intaking or venting air Z) producing or destroying helium gas", a: "INTAKING OR VENTING AIR", letter: "Y"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Arrange the following 4 choices from the one with the LOWEST mass to the HIGHEST mass: virus; mouse spleen; mosquito; water molecule", a: "WATER MOLECULE; VIRUS; MOSQUITO; MOUSE SPLEEN", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "What is the most common name for the junctions across which nerve cells carry chemical messages from cell to cell?", a: "SYNAPSE", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "What is the most common name of the part of a neuron that takes its name from the Greek word for tree, and functions to carry electrical messages from other nerve cells to the soma?", a: "DENDRITE", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "A fifty-fifty solution of distilled water and pure ethanol will appear: W) clear X) cloudy Y) purple Z) heterogeneous", a: "CLEAR", letter: "W"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Which of the following chemical names is NOT correctly matched with its chemical formula: W) H2SO4 and sulfuric acid X) HCl and hydrochloric acid Y) BeCl2 and boron dichloride Z) SO2 and sulfur dioxide", a: "BeCl2 AND BORON DICHLORIDE", letter: "Y"},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following is a feature made by a continental glacier and NOT made by an alpine glacier: W) cirque X) hanging valley Y) truncated spur Z) drumlin", a: "DRUMLIN", letter: "Z"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "What type of moraine forms along the valley walls of an alpine glacier?", a: "LATERAL", letter: ""},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "What is the physical state of a saturated fat and a polyunsaturated fat, respectively, at room temperature, if both have 18 carbons per molecule?", a: "SATURATED FAT = SOLID; UNSATURATED FAT = LIQUID", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following is closest to the maximum running speed of a human: W) 0.3 meters per second X) 30 meters per second Y) 18 kilometers per hour Z) 38 kilometers per hour", a: "38 KILOMETERS PER HOUR", letter: "Z"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "In which of the following cells would myelin most likely be found: W) oocyte X) red blood cell Y) neuron Z) skin cell", a: "NEURON", letter: "Y"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Name all of the following 4 choices of eukaryotic sub-cellular structures that do NOT have their own specific membrane: chloroplast; lysosome; centriole; golgi", a: "CENTRIOLE", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "How many times as much momentum does a truck have traveling at 40 kilometers per hour if it triples its mass?", a: "3", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Name all of the following 4 substances that will turn blue litmus paper red: citric acid; carbonated water; ammonia; sodium hydroxide", a: "CITRIC ACID; CARBONATED WATER", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "The hard coral of coral reefs are primarily made of: W) basalt X) calcium carbonate Y) silicates Z) halite", a: "CALCIUM CARBONATE", letter: "X"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "According to the Rock Cycle, once conglomerate sedimentary rocks are formed, the most direct pathway in the formation of sediments is by which of the following: W) weathering and erosion X) compaction and cementation Y) cooling and crystallization Z) heat and pressure", a: "WEATHERING AND EROSION", letter: "W"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "What fossil fuel is the greatest fuel source for electricity generation in the world?", a: "COAL", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "The acidity of a water sample with a pH of 5 is how many times as great as that of a sample with a pH of 6?", a: "10", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "What is the most important function of fiber tracheids in woody plants: W) energy storage X) structural support Y) sugary sap movement Z) absorption of nutrients from the soil", a: "STRUCTURAL SUPPORT", letter: "X"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Which of the following is the smallest object that a typical student compound light microscope is able to allow a person to see: W) mRNA X) ribosomes Y) E.coli Z) polio virus", a: "E.COLI", letter: "Y"},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "According to Charles’s gas law, the volume of a fixed amount of gas varies directly with what property?", a: "TEMPERATURE", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Which of the following processes is exothermic: W) solid water changes to water vapor X) solid water changes to liquid water Y) liquid water changes to solid water Z) liquid water changes to water vapor", a: "LIQUID WATER CHANGES TO SOLID WATER", letter: "Y"},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "An igneous rock in which individual mineral grains or crystals are visible to the naked eye most likely was formed by which of the following processes: W) rapid cooling X) slow cooling Y) quenching Z) metamorphosis", a: "SLOW COOLING", letter: "X"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "What type of boundary exists where plates are neither produced nor destroyed, an example of which is the San Andreas fault?", a: "TRANSFORM FAULT BOUNDARY", letter: ""},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "If a star has a mass of 10 solar masses, how many times as much mass does it have as the Sun?", a: "10", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "The majority of stars in the universe are thought to have surface temperatures of: W) about 20,000 K X) about 10,000 K Y) about 6,000 K Z) less than 3,500 K", a: "LESS THAN 3,500 K", letter: "Z"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Adipose tissue stores mostly: W) lipid X) protein Y) starch Z) glycogen", a: "LIPID", letter: "W"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Which of the following biological molecules make up the main part of the bilayer and hydrophobic region of the plasma cell membrane: W) oligosaccharides X) carbohydrates Y) phospholipids Z) proteins", a: "PHOSPHOLIPIDS", letter: "Y"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Using proper chemical formulas, finish balancing the following equation: N2 + 3H2 -> what?", a: "2NH3", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following forms of winter precipitation is most likely to cause downed power lines and broken tree limbs: W) freezing rain X) sleet Y) snow Z) hail", a: "FREEZING RAIN", letter: "W"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following is NOT one of the 10 major cloud types: W) cirrus X) cirrocumulus Y) cirrostratus Z) cirronimbus", a: "CIRRONIMBUS", letter: "Z"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "What is the name for the time zone immediately east of the Eastern Time Zone?", a: "ATLANTIC TIME ZONE", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Ignoring boundary adjustments, most individual time zones are how many degrees of longitude apart?", a: "15", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Keratins are considered structural proteins. This is because they are most often arranged in which of the following shapes: W) long, thin fibers X) spherical and smooth Y) short and irregular Z) small, irregular, and hydrophilic", a: "LONG THIN FIBERS", letter: "W"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Name all of the following 4 molecules that are storage forms of glucose: starch; wax; glycogen; maltose", a: "STARCH; GLYCOGEN", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "What is the name of the particle that carries the electromagnetic force?", a: "PHOTON", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following is indicated by the following forecast: “A front moves through New England Monday with a few showers. Chillier air moves in behind the front gradually changing to lake-effect snows, followed by clear skies on Tuesday”: W) cold front X) warm front Y) stationary front Z) inverted front", a: "COLD FRONT", letter: "W"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following is CLOSEST to the estimate of how many million years ago the first bacteria appeared on Earth: W) 65 X) 280 Y) 1,500 Z) 3,800", a: "3,800", letter: "Z"},

// ROUND 10
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "One degree of latitude at the Earth’s surface is equal to how many nautical miles?", a: "60", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Arrange the following 4 liquid measures from the one with the SMALLEST volume to the LARGEST: 1.5 gallons; 128 ounces; 1 deciliter; 2 liters", a: "1 DECILITER; 2 LITERS; 128 OUNCES; 1.5 GALLONS", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Cartilage belongs to which of the following animal tissues types: W) epithelial X) connective Y) nervous Z) muscle", a: "CONNECTIVE", letter: "X"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Name all of the following 3 chemicals that are NOT amino acids: glycine; methionine; adenine", a: "ADENINE", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following MUST change if constructive interference occurs between two light waves: W) compression X) frequency Y) amplitude Z) speed", a: "AMPLITUDE", letter: "Y"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Order the following 4 colors of light from the one with the LONGEST wavelength to the SHORTEST wavelength: orange; violet; red; yellow", a: "RED; ORANGE; YELLOW; VIOLET", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "In which of the following climates are the WIDEST ANNUAL temperature variations or temperature ranges most likely to occur: W) continental polar X) moist tropical Y) tropical savanna Z) mid-latitude moist continental", a: "MID-LATITUDE MOIST CONTINENTAL", letter: "Z"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following is NOT true of the ozone layer: W) beneficial stratospheric ozone is produced naturally and harmful tropospheric ozone is human made X) the ozone molecule has 3 oxygen atoms Y) in addition to chlorine, bromine is also responsible for combining with and breaking down the ozone molecule Z) holes in the ozone layer are produced by global warming", a: "HOLES IN THE OZONE LAYER ARE PRODUCED BY GLOBAL WARMING", letter: "Z"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Acid-base indicators are substances that change color with changing pH and are usually derived from: W) plants X) animals Y) chemical sedimentary rocks Z) alkaline Earth metal", a: "PLANTS", letter: "W"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Of all the essential minerals present in the human body, which one is the most abundant?", a: "CALCIUM", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "How many chromosomes does a normal human gamete have?", a: "23", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Which of the following is most directly responsible for the exchange of genes during meiosis: W) crossing over X) kinetochores division Y) cytokinesis Z) alleles", a: "CROSSING OVER", letter: "W"},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following is an electronic device that amplifies electronic signals and was used as a switching device in the first electronic computers: W) vacuum tubes X) crystals Y) potentiometers Z) rheostats", a: "VACUUM TUBES", letter: "W"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Name all of the following 3 choices that are typically considered scalar quantities: electric charge; acceleration; average speed", a: "ELECTRIC CHARGE; AVERAGE SPEED", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following is LEAST accurate: W) basalt is the fine-grained equivalent of gabbro X) any rock can be metamorphosed Y) the chemical composition of magma primarily determines its texture Z) a metamorphic rock produced from sandstone is quartzite", a: "THE CHEMICAL COMPOSITION OF MAGMA PRIMARILY DETERMINES ITS TEXTURE", letter: "Y"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "What term is used to describe the resistance of lava to flow as reflected by its gas content, temperature, and chemical composition?", a: "VISCOSITY", letter: ""},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following is LEAST accurate regarding acid rain: W) forests are not negatively impacted because they are naturally resistant to acidic pH’s X) lakes with limestone bedrock have some natural protection against acidification Y) lakes with pH’s of less than 5 are largely devoid of fish Z) more than half the acid deposition in eastern Canada originates from U.S. emissions", a: "FORESTS ARE NOT NEGATIVELY IMPACTED BECAUSE THEY ARE NATURALLY RESISTANT TO ACIDIC pH’S", letter: "W"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "During the proton-proton chain that occurs during the fusion process of a main sequence star, how many hydrogen atoms are typically needed to produce a helium atom?", a: "4", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "What base nucleotide is replaced by uracil in RNA?", a: "THYMINE", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "What two functional groups of amino acids join to form a peptide bond in a protein?", a: "CARBOXYL AND AMINO", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following is NOT true for a substance: W) pure substances always contain the same ratio of elements X) water and steam are 2 different forms of the same substance Y) all compounds are substances and all substances are compounds Z) a pure substance cannot be separated by physical means", a: "ALL COMPOUNDS ARE SUBSTANCES AND ALL SUBSTANCES ARE COMPOUNDS", letter: "Y"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Which of the following is NOT a spontaneous reaction under normal atmospheric pressure: W) rusting of a ship’s hull at sea X) liquid water changing to water ice at 25ºC Y) the combustion of propane in air Z) evaporation of water above 212ºF", a: "LIQUID WATER CHANGING TO WATER ICE AT 25ºC", letter: "X"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following is a water-purification process that uses pressure across a semi-permeable membrane: W) filtering with activated charcoal X) ultraviolet treatments Y) reverse osmosis Z) ozonation", a: "REVERSE OSMOSIS", letter: "Y"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "How many liters of water will completely fill a container measuring 100 centimeters by 1 meter by 80 centimeters?", a: "800", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "During which of the following months will the Sun rise exactly in the east to an observer at mid-northern latitudes: W) December X) March Y) June Z) September", a: "MARCH", letter: "X"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following is a type of volcanic eruption that does not build up into the typical cone shape normally associated with volcanoes, even though it erupts huge volumes of fluid lava: W) composite X) fissure Y) Krakatoan Z) Strombolian", a: "FISSURE", letter: "X"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Which of the following is the botanical term for the haploid generation in moss plants: W) gametophyte X) archegonia Y) style Z) ovule", a: "GAMETOPHYTE", letter: "W"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Name all of the following 3 organisms that belong to the phylum Cnidaria: jellyfish; sea anemones; corals", a: "JELLYFISH; CORALS", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following is a substance that does NOT conduct electricity when it is a solid but does conduct electricity when it is melted or in a molten state: W) lead X) copper Y) water Z) sodium chloride", a: "SODIUM CHLORIDE", letter: "Z"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Chemical bonding between which of the following pairs of atoms would MOST likely be ionic: W) copper and chlorine X) carbon and carbon Y) hydrogen and carbon Z) sulfur and oxygen", a: "COPPER AND CHLORINE", letter: "W"},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following is a phenomenon associated with extensive warming of the ocean in the tropical regions of the eastern Pacific: W) El Nino X) a Chinook Y) La Nina Z) the Ekman spiral", a: "EL NINO", letter: "W"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following is LEAST indicated by closely spaced isobars on a weather map: W) strong winds X) a steep gradient between high and low pressure areas Y) a frontal boundary Z) type of precipitation", a: "TYPE OF PRECIPITATION", letter: "Z"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "What precious metal is the catalyst in most automobile catalytic converters?", a: "PLATINUM", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "What is the most common name for the apparent circular movement of the celestial poles against the background of fixed stars that will eventually result in Polaris drifting away from the north celestial pole?", a: "PRECESSION", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "What staining method is used to generally divide bacteria into two groups?", a: "GRAM STAIN", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Name all of the following 4 cellular structures that are found in plant cells and NOT bacteria: mitochondria; chloroplasts; cell membranes; ribosomes", a: "MITOCHONDRIA; CHLOROPLASTS", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "How many covalent bonds are in a molecule of methane?", a: "4", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Giving your answer in the SI units for resistance, what is the resistance of an electric flashlight operating on a 9-volt battery that requires 0.5 amps to run?", a: "18 OHMS", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following is NOT an example of typical Jurassic vegetation: W) flowering plants X) ferns Y) conifers Z) ginkgoes", a: "FLOWERING PLANTS", letter: "W"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following is TRUE: W) all tropical depressions form into tropical storms X) the Intertropical Convergence Zone is mostly located near the equator Y) most hurricanes originate along the equator Z) all hurricanes have a counterclockwise motion", a: "THE INTERTROPICAL CONVERGENCE ZONE IS MOSTLY LOCATED NEAR THE EQUATOR", letter: "X"},

// ROUND 11
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Which of the following terms is MOST commonly used to refer to the copying of DNA during the cell cycle: W) duplication X) replication Y) translation Z) complementation", a: "REPLICATION", letter: "X"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "What is the most common term for a random change in the nucleotide base sequence in DNA?", a: "MUTATION", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following is a simple instrument often used to demonstrate electrostatic induction: W) electroscope X) voltmeter Y) electrometer Z) spectrometer", a: "ELECTROSCOPE", letter: "W"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "What is the most common term for the form of radio telecommunications that broadcasts electromagnetic information by varying the wave frequency?", a: "FREQUENCY MODULATION", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Meanders are typically associated with: W) turbulent rivers X) low-gradient streams Y) V-shaped valleys Z) alluvial fans", a: "LOW-GRADIENT STREAMS", letter: "X"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Of the 3 main parts of the continental margin, which one is considered the flooded part of the continent?", a: "CONTINENTAL SHELF", letter: ""},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following would be most useful for separating blood into its component parts: W) cross matching X) precipitation Y) centrifugation Z) atomization", a: "CENTRIFUGATION", letter: "Y"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following is closest to the diameter of a standard compact disc or DVD: W) 3 centimeters X) 12 centimeters Y) 20 millimeters Z) 1500 millimeters", a: "12 CENTIMETERS", letter: "X"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Which of the following is the most common long-term storage form of energy for vertebrate animals: W) nucleic acids X) proteins Y) starch Z) lipids", a: "LIPIDS", letter: "Z"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "What is the name for the structures in plants that regulate air entering the plant through stems and leaves?", a: "STOMATA", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following is LEAST accurate regarding the element helium: W) it is the second most abundant element in the universe X) it is constantly escaping from Earth’s atmosphere into space Y) it is toxic to humans even in very low concentrations Z) it is a noble gas", a: "IT IS TOXIC TO HUMANS EVEN IN VERY LOW CONCENTRATIONS", letter: "Y"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Which of the following substances when pure typically contains ONLY carbon atoms: W) isopropyl alcohol X) glass Y) graphite Z) natural gas", a: "GRAPHITE", letter: "Y"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "What parasitic disease is one of the most common infectious diseases in the world and got its name because it was thought to be caused by or associated with bad air?", a: "MALARIA", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following contains the FEWEST calories: W) 1 large, fresh apple X) 1 large, baked potato Y) 1 cup raw spinach Z) 1 tablespoon extra virgin olive oil", a: "1 CUP RAW SPINACH", letter: "Y"},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "The presence of which of the following most clearly indicates that much of the U.S. was covered by shallow seas for millions of years: W) limestone X) breccia Y) basalt Z) coal", a: "LIMESTONE", letter: "W"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "In which of the following locations would a preponderance of actively-produced pillow lavas be found: W) Mount Saint Helens X) mid-Atlantic ridge Y) Mount Vesuvius, Italy Z) Yellowstone Caldera", a: "MID-ATLANTIC RIDGE", letter: "X"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Which of the following is a general term widely used by scientists to indicate artificial growth of cells in the laboratory: W) culture X) monocell Y) attenuate Z) decoction", a: "CULTURE", letter: "W"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Which of the following is the most common term biologists use for the molecule that an enzyme will act on: W) substrate X) product Y) producer Z) catalyst", a: "SUBSTRATE", letter: "W"},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following is NOT true: W) the freezing point of pure water is 0ºC at sea level X) when pure water freezes, it reaches its maximum density at 0ºC Y) adding salt to ice will lower its melting point Z) when pure maple syrup is cooled below 0ºC, pure water ice separates out", a: "WHEN PURE WATER FREEZES, IT REACHES ITS MAXIMUM DENSITY AT 0ºC", letter: "X"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Name all of the following 4 processes where energy is released: water melts; water freezes; evaporation; condensation", a: "CONDENSATION; WATER FREEZES", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following is NOT true: W) global sea levels have generally risen over the past 18,000 years X) the Mississippi River Delta in Louisiana has one of the highest rates of wetland loss in the U.S. Y) tide stations measure local sea levels Z) most of Earth’s groundwater comes from glacial meltwater", a: "MOST OF EARTH’S GROUNDWATER COMES FROM GLACIAL MELTWATER", letter: "Z"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "The primary process in the mechanical weathering of rocks worldwide is: W) exfoliation X) abrasion Y) thermal expansion Z) thermal contraction", a: "ABRASION", letter: "X"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Chickenpox is a disease caused by a: W) bacteria X) fungus Y) virus Z) protozoan", a: "VIRUS", letter: "Y"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following is an autoimmune disease: W) Lupus X) spina bifida Y) scabies Z) yellow fever", a: "LUPUS", letter: "W"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Which of the following is a protein: W) glycerol X) trypsin Y) cholesterol Z) tyrosine", a: "TRYPSIN", letter: "X"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Name all of the following 4 cells of a human that are typically haploid: skin cell; mature ovum; sperm; lymphocyte", a: "MATURE OVUM; SPERM", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Giving the proper charges, what are the chemical formulas for the major ions present in a aqueous solution of sodium hydroxide, or NaOH?", a: "Na+ AND OH–", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Arrange the following 3 pure substances in order of INCREASING melting points at 1 atmosphere of pressure: iron; oxygen; water", a: "OXYGEN; WATER; IRON", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following is a greenhouse gas that primarily comes from landfills, coal mines, oil and natural gas operations, and agriculture: W) ozone X) sulfur dioxide Y) nitric oxide Z) methane", a: "METHANE", letter: "Z"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Mammoths and mastodons became extinct around the end of the: W) Cretaceous X) Jurassic Y) Triassic Z) Pleistocene", a: "PLEISTOCENE", letter: "Z"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "The Pleiades is an open cluster whose stars all formed from the same interstellar cloud. What basic force holds this cluster together?", a: "GRAVITY", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "If we were to use human developmental stages for the age of our Sun, in which of the following stages of life would our Sun be considered: W) infant X) teenager Y) middle age Z) elderly", a: "MIDDLE AGE", letter: "Y"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Tell whether the medusa and polyp stages of hydrozoans are haploid or diploid, respectively?", a: "BOTH ARE DIPLOID", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Name all of the following 4 choices that are most commonly associated with asexual reproduction in organisms: meiosis; budding; binary fission; fragmentation", a: "BUDDING; BINARY FISSION; FRAGMENTATION", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "As what color will a red object appear when illuminated by a blue light?", a: "BLACK", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "The impact crater located beneath the Yucatan Peninsula in Mexico is implicated in causing an extinction event that happened between which of the following two periods: W) Permian and Triassic X) Cretaceous and Tertiary Y) Cambrian and Ordovician Z) Devonian and Carboniferous", a: "CRETACEOUS AND TERTIARY", letter: "X"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "What is the name for the Era that began after the extinction event that occured at the end of the Cretaceous Period?", a: "CENOZOIC", letter: ""},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "What fraction of the celestial sphere can be seen from the Earth’s South Pole?", a: "½", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Name all of the following states of matter through which sound can travel: solid; liquid; gas; plasma", a: "ALL", letter: ""},

// ROUND 12
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "If the density of a metal alloy is 5,430 kilograms per cubic meter, what is its specific gravity, rounded to the second decimal place?", a: "5.43", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following best explains the relative lack of hydrogen in our atmosphere in spite of its abundance in the Universe: W) most of it is tied up in the water molecule X) most of it is consumed in photosynthesis Y) most of it escaped into space long ago because of its low mass Z) most of it was an unstable isotope that decayed into helium", a: "MOST OF IT ESCAPED INTO SPACE LONG AGO BECAUSE OF ITS LOW MASS", letter: "Y"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following locations contains relatively young coasts that formed as a consequence of continental rifting: W) southern coasts of the Aleutian Islands X) Gulf of California Y) Hawaii Z) northeastern Japan", a: "GULF OF CALIFORNIA", letter: "X"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following filters can withstand temperatures up to 1400ºC: W) paper cellulosic X) borosilicate glass Y) polyester Z) ceramic", a: "CERAMIC", letter: "Z"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Which of the following BEST describes muscle tone: W) maximum strength of a muscle X) length versus width of a muscle Y) average energy use or oxygen use of a fully contracted muscle Z) amount of tension or contraction of a resting muscle", a: "AMOUNT OF TENSION OR CONTRACTION OF A RESTING MUSCLE", letter: "Z"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Which of the following terms most commonly refers to nerves leaving the brain: W) posterior X) rostral Y) efferent Z) involuntary", a: "EFFERENT", letter: "Y"},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Randy was precise in his lab experiment but he was not accurate. Which of the following best describes his measurements: W) his data was close to the true value but not reproducible X) his data was close to the true value and reproducible Y) his data was not close to the true value but reproducible Z) his data was not close to the true value and reproducible", a: "HIS DATA WAS NOT CLOSE TO THE TRUE VALUE BUT REPRODUCIBLE", letter: "Y"},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "The Earth’s mantle is thought to be composed of which of the following: W) coal X) granite Y) slate Z) peridotite", a: "PERIDOTITE", letter: "Z"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Giving your answer in hours and minutes, how often will the entire tidal pattern on Earth be repeated?", a: "24 HOURS AND 50 MINUTES", letter: ""},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following best describes a coelacanth: W) living fossil fish X) extinct amphibian Y) extinct mammal Z) an air-breathing extinct fish", a: "LIVING FOSSIL FISH", letter: "W"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following 3 choices are reference scales commonly used in describing the hardness of materials: Rockwell; Austenite; Ferrule", a: "ROCKWELL", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Into which of the following does a typical fern spore most directly develop: W) sporophyte X) egg cell Y) gametophyte Z) sperm cell", a: "GAMETOPHYTE", letter: "Y"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Name all of the following 4 plants that are conifers: pine; hemlock; palm; maple", a: "PINE; HEMLOCK", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following most likely occurs when one molecule is oxidized: W) another molecule is reduced X) there is a release in work Y) the system becomes more ordered Z) the reaction is at equilibrium", a: "ANOTHER MOLECULE IS REDUCED", letter: "W"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Arrange the following 3 pure substances in order of INCREASING evaporation rates at 1 atmosphere of pressure and at room temperature: water; acetone; aluminum", a: "ALUMINUM; WATER; ACETONE", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following were NOT produced by the eruption of Mount Saint Helens in 1980: W) lahar flows X) pyroclastic flows Y) significant ashfall deposits Z) basic lava", a: "BASIC LAVA", letter: "Z"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "All of the volcanoes of Hawaii belong to which one of the 3 basic types?", a: "SHIELD", letter: ""},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following is a native American fruit that is typically grown in bogs and harvested in the fall: W) cherries X) blueberries Y) cranberries Z) huckleberries", a: "CRANBERRIES", letter: "Y"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following is the pigment responsible for the characteristic red color of the cranberry: W) red dye number 2 X) carotene Y) carmine red Z) anthocyanin", a: "ANTHOCYANIN", letter: "Z"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Which of the following is a theory of heredity postulated by Lamarck: W) characteristics acquired after birth are passed on to following generations X) nature selects for the best characteristic Y) only the fittest organisms survive through natural selection Z) genes determine the phenotype", a: "CHARACTERISTICS ACQUIRED AFTER BIRTH ARE PASSED ON TO FOLLOWING GENERATIONS", letter: "W"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "By words or numbers, name all of the following 3 choices that are found in the E. coli bacterium: 1) mitochondria; 2) chloroplasts; 3) ribosomes", a: "3) RIBOSOMES", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following molecules is considered the most polar: W) CH4 X) HF Y) F2 Z) CO2", a: "HF", letter: "X"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "In addition to oxygen and sodium, what other element is a major constituent of borax?", a: "BORON", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "A Beaufort number of 4 indicates: W) a moderate earthquake X) a moderate breeze Y) a strong tornado Z) a mineral similar in hardness to fluorite", a: "A MODERATE BREEZE", letter: "X"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "If cumulus mammatus clouds are heading in your direction, you may soon experience: W) clearing skies X) severe weather Y) high pressure conditions Z) snow", a: "SEVERE WEATHER", letter: "X"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "What human disease is caused by infection with the rhinovirus?", a: "COMMON COLD", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Name all of the following 4 diseases for which effective vaccines are currently available: chicken pox; malaria; diphtheria; HIV", a: "CHICKEN POX; DIPHTHERIA", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Which of the following is LEAST likely to be found in or on a root of a flowering plant: W) stomata X) epidermis Y) xylem Z) phloem", a: "STOMATA", letter: "W"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "What is the common name for the protective layers of cells that cover the tip of a growing root, allowing it to make its way through difficult soils?", a: "ROOT CAP", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "When aluminum filings are added to a beaker containing concentrated sulfuric acid, what gas is produced?", a: "HYDROGEN", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "In which of the 5 main layers of Earth’s atmosphere does the Space Shuttle orbit?", a: "THERMOSPHERE", letter: ""},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Order the following 4 life forms from the EARLIEST to appear on Earth to the most RECENT: crocodile; jawless fish; jawed fish; antelope", a: "JAWLESS FISH; JAWED FISH; CROCODILE; ANTELOPE", letter: ""},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following 4 star types is believed to be the most common in the universe: neutron; blue giant; red dwarf; pulsar", a: "RED DWARF", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Which one of the following 5 spectral classes of stars is the HOTTEST: A; F; G; K; O", a: "O", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "What sugar is found in the backbone of DNA?", a: "DEOXYRIBOSE", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Name all of the following 4 trees that produce true flowers: hemlock; palm; maple; pine", a: "PALM; MAPLE", letter: ""},

// ROUND 13
{cat: "EARTH SCIENCE", type: "Toss-up", q: "The upper limit of the zone of saturation is the: W) watershed X) water table Y) precipitation zone Z) Darcy zone", a: "WATER TABLE", letter: "X"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following ground-level forms of precipitation results when supercooled water droplets collide with ice pellets and they freeze together: W) sleet X) hail Y) snow Z) rain", a: "HAIL", letter: "X"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Most nuclear reactors in the U.S. use what element as their fuel for fission?", a: "URANIUM", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following is TRUE regarding cooking with water: W) rice cooking at a vigorous boil in an open pot is at a higher temperature than at a slow boil X) pressure cookers increase the boiling point of water so that food cooks faster Y) cooking times in Miami, Florida are longer than in Denver, Colorado Z) live steam is used in most electric rice cookers", a: "PRESSURE COOKERS INCREASE THE BOILING POINT OF WATER SO THAT FOOD COOKS FASTER", letter: "X"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Phylogenetic systems of classifying organisms into various groups are mostly based on: W) physical appearances X) numbers of genes Y) evolutionary history Z) environmental origins", a: "EVOLUTIONARY HISTORY", letter: "Y"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Which of the following are homologous structures: W) wing of a bat and the arm of a human X) leg of a cat and the wing of a fly Y) stinger of a bee and the fang of a snake Z) rattler of a rattle snake and the whistle of a song bird", a: "WING OF A BAT AND THE ARM OF A HUMAN", letter: "W"},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "What color light will be produced when combining equal proportions of green and blue light?", a: "CYAN", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Order the following 4 forms of electromagnetic radiation from the one with the SHORTEST wavelength to the LONGEST wavelength: ultraviolet; microwave; gamma; FM radio", a: "GAMMA; ULTRAVIOLET; MICROWAVE; FM RADIO", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "About what percent of the Northern Hemisphere is continental land mass: W) 20 X) 40 Y) 60 Z) 80", a: "40", letter: "X"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following atmospheric gases is found on Earth and on our two closest planetary neighbors, but is found in much higher concentrations in Earth’s atmosphere: W) helium X) carbon dioxide Y) argon Z) nitrogen", a: "NITROGEN", letter: "Z"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Measuring at 2 feet in length, the hellbender, commonly known as a snot otter or devil dog, found in many streams in the Appalachian and Ozark Mountains of the Eastern United States, are one of the larges species of: W) salamanders X) jawless fish Y) giant catfish Z) bright, red-colored frogs with horn-like ears", a: "SALAMANDERS", letter: "W"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following is most likely if a healthy hellbender population is found in a stream: W) they should be eradicated because they eat all the predatory fish X) they are venomous creatures and are a threat to people Y) their presence is an excellent indicator that the water quality of the stream is good Z) their presence is an excellent indicator that the stream is polluted with heavy metals and PCB’s", a: "THEIR PRESENCE IS AN EXCELLENT INDICATOR THAT THE WATER QUALITY OF THE STREAM IS GOOD", letter: "Y"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "What human gland releases thyroid-stimulating hormone and oxytocin into the blood?", a: "PITUITARY", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Ribosomes are made of: W) protein only X) nucleic acid only Y) nucleic acid and protein Z) nucleic acid and carbohydrate", a: "NUCLEIC ACID AND PROTEIN", letter: "Y"},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following is LEAST accurate of ionic solids such as NaCl: W) they have low melting points X) they are salts Y) they conduct electricity when dissolved in water Z) they dissolve completely in water", a: "THEY HAVE LOW MELTING POINTS", letter: "W"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Knowing that an extensive property of a system is a physical quality whose value DOES depend on the amount of the substance in a system, which of the following is an extensive property: W) temperature X) melting point Y) density Z) heat", a: "HEAT", letter: "Z"},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following celestial objects has the closest chemical makeup to the planet Jupiter: W) the Sun X) the planet Earth Y) the planet Mercury Z) a Kuiper-belt comet", a: "THE SUN", letter: "W"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following is NOT prevalent at mid-ocean ridges: W) strong earthquakes with deep foci X) black smokers Y) hydrothermal activity Z) rift valleys", a: "STRONG EARTHQUAKES WITH DEEP FOCI", letter: "W"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following is a highly contagious disease and is easily spread from person to person by simply coughing or sneezing: W) HIV X) Lyme disease Y) chickenpox Z) cellulitis", a: "CHICKENPOX", letter: "Y"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Sickle Cell anemia, has the advantage of allowing a person with the disorder to effectively resist what parasitic infectious disease?", a: "MALARIA", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Which of the following animals are believed to be the closest living relatives to the dinosaurs: W) salamanders X) snakes Y) ostriches Z) crocodiles", a: "CROCODILES", letter: "Z"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Order the following 4 taxonomical groups from the one with the MOST organisms to the LEAST: order; family; phylum; kingdom", a: "KINGDOM; PHYLUM; ORDER; FAMILY", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "The behavior of light has lead scientists to generally consider light as behaving as: W) a particle only X) a wave only Y) the most basic energy source Z) particles and waves", a: "PARTICLES AND WAVES", letter: "Z"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Which of the following BEST explains why the halogens are found in nature as compounds or ions: W) they have an excess of neutrons and are unstable in pure form X) they have 1 electron in their outer shell Y) they need only one electron to fill their outermost shell so they are highly reactive Z) they are non-metals with unfilled energy shells", a: "THEY NEED ONLY ONE ELECTRON TO FILL THEIR OUTERMOST SHELL SO THEY ARE HIGHLY REACTIVE", letter: "Y"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Name all of the following 3 substances that are considered by scientists as antiseptics: 5% bleach; 70% ethanol; tincture of iodine", a: "70% ETHANOL; TINCTURE OF IODINE", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following foods contains the MOST grams of carbohydrates: W) 3 ounces fried beef liver X) 1 cup lard Y) 1 cup white granulated sugar Z) 1, 8-ounce baked potato, with skin", a: "1 CUP WHITE GRANULATED SUGAR", letter: "Y"},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following is NOT true of humidity: W) relative humidity is a description of the water vapor content in air X) humans feel uncomfortable when the relative humidity is high because cooling from sweating is less effective Y) dew points normally occur when the relative humidity of an air mass is 100% Z) the dew point is measured in percent along with the relative humidity", a: "THE DEW POINT IS MEASURED IN PERCENT ALONG WITH THE RELATIVE HUMIDITY", letter: "Z"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "At 30ºC a parcel of air can contain 30 grams of water vapor per cubic meter of air. What is the relative humidity if the parcel actually contains 9 grams of water vapor per cubic meter at this temperature?", a: "30", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "In which of the following environments would a thermophilic bacteria most likely evolve: W) Antarctic X) hot spring Y) desert Z) thermokarst", a: "HOT SPRING", letter: "X"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Name all of the following 4 plants that are gymnosperms: fern; ginkgo tree; pine tree; giant sequoia tree", a: "GINKGO TREE; PINE TREE; GIANT SEQUOIA TREE", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following is NOT a hazard that would be listed on the Material Safety Data Sheet for concentrated sulfuric acid: W) corrosive X) poison Y) use with adequate ventilation Z) flammable", a: "FLAMMABLE", letter: "Z"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Giving your answer in degrees, what is the declination for the north celestial pole?", a: "90", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "If right ascension is measured in hours, with 24 hours in a full circle, how many degrees of arc are in 1 hour of right ascension?", a: "15", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following 4 choices does NOT belong with the others: sleet; anvil cloud; hail; lightning", a: "SLEET", letter: ""},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Name all of the following 3 choices that are excellent index fossils because they were distributed over a wide geographical area but only for a relatively short period of time: trilobites; ammonites; copepods", a: "TRILOBITES; AMMONITES", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Of the 3 basic types of muscle in humans, which are considered voluntary?", a: "SKELETAL", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "At the beginning of metaphase in mitosis, how many chromatids are in each chromosome?", a: "2", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "If the distance between 2 objects is doubled and everything else remained the same, by what factor would the gravitational attraction between the two bodies decrease?", a: "4", letter: ""},

// ROUND 14
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following is NOT true: W) all fires burn with a yellow flame X) snowflakes and raindrops often contain bacteria Y) a general rule for solubility is that ‘like dissolves like’ Z) a super-cooled liquid is a liquid at a temperature below its normal freezing point", a: "ALL FIRES BURN WITH A YELLOW FLAME", letter: "W"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following BEST describes the range of sizes of most animal cells: W) 0.2 to 2.0 micrometers X) 2.0 to 4.0 micrometers Y) 5.0 to 20.0 micrometers Z) 12.0 to 40.0 micrometers", a: "5.0 TO 20.0 MICROMETERS", letter: "Y"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Which of the following is most advantageous to plants that depend on insects for pollination: W) absence of rhizomes X) sticky pollen Y) small green flowers Z) numerous stomata", a: "STICKY POLLEN", letter: "X"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Name all of the following biological molecules that are considered polymers: glucose; cellulose; DNA; RNA", a: "CELLULOSE; DNA; RNA", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following materials in pure form would register the LOWEST amount of ohms for a given electric current at 20ºC if all other variables are constant: W) silver X) gold Y) tin Z) lead", a: "SILVER", letter: "W"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Which of the following optical devices produces a real image: W) plane mirror X) convex mirror Y) concave lens Z) convex lens", a: "CONVEX LENS", letter: "Z"},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "A semidiurnal tidal pattern is more typical of which of the following locations: W) the East Coast of the U.S. X) the West Coast of the U.S. Y) the Gulf of Mexico Z) the North Pole", a: "THE EAST COAST OF THE U.S.", letter: "W"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following is the most notable product of the hydrolysis of feldspar: W) chalk X) sandstone Y) clay minerals Z) halite", a: "CLAY MINERALS", letter: "Y"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following is one of the most likely causes of algal blooms in waterways along the Chesapeake Bay: W) fertilizers X) natural pesticides Y) nitrogen-fixing bacteria Z) plastics pollution", a: "FERTILIZERS", letter: "W"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Giving your answer as winter, spring, summer, or fall, in what season will “dead zones” be most prevalent in the Chesapeake Bay?", a: "SUMMER", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Pampas, steppes, and savannas are all different types of: W) deserts X) tropical forests Y) tropical shrublands Z) grasslands", a: "GRASSLANDS", letter: "Z"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Which of the following biomes takes up more square area of the world than any other biome: W) rainforest X) savanna Y) taiga Z) tundra", a: "TAIGA", letter: "Y"},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Hydrogen bonding is NOT important in the physical and chemical properties of: W) liquid water X) water ice Y) DNA Z) methane gas", a: "METHANE GAS", letter: "Z"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Arrange the following 3 diatomic molecules in order of INCREASING number of bonds between atoms: oxygen; fluorine; nitrogen", a: "FLUORINE; OXYGEN; NITROGEN", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following is NOT a key step in the rock cycle: W) cementation X) melting Y) cooling Z) evaporation", a: "EVAPORATION", letter: "Z"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Most of Earth’s deserts in the northern hemisphere are located near which of the following latitudes: W) 0º X) 30º Y) 70º Z) 90º", a: "30º", letter: "X"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following is typically used to sterilize laboratory glassware: W) hot plate X) freeze dryer Y) autoclave Z) fume hood", a: "AUTOCLAVE", letter: "Y"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following is NOT true of the Big Dipper: W) it is a well known constellation that can be seen from mid-northern latitudes X) it appears on the opposite side of the North Star from Cassiopeia Y) it is sometimes called the Plough Z) assuming clear skies, it can be seen throughout the night every night of the year from mid-northern latitudes", a: "IT IS A WELL KNOWN CONSTELLATION THAT CAN BE SEEN FROM MID-NORTHERN LATITUDES", letter: "W"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Which of the following is the most likely highest power for an objective lens on a typical student compound light microscope: W) 25-times X) 100-times Y) 500-times Z) 1500-times", a: "100-TIMES", letter: "X"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Order the following 4 parts of the human intestine from the FIRST to receive food from the stomach to the LAST: colon; duodenum; ileum; jejunum", a: "DUODENUM; JEJUNUM; ILEUM; COLON", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following is NOT true of pH: W) the terms basic or alkaline describe a solution with pH greater than 7 X) the highest value on the pH scale is 14 Y) strong acids dissociate almost completely in water Z) a pH meter operates by measuring small differences in the density of different fluids", a: "A PH METER OPERATES BY MEASURING SMALL DIFFERENCES IN THE DENSITY OF DIFFERENT FLUIDS", letter: "Z"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "A decrease of 1 unit on the pH scale represents which of the following: W) a 10-fold increase in the hydrogen ion concentration X) a 10-fold decrease in the hydrogen ion concentration Y) a 100-fold increase in the hydrogen ion concentration Z) a 100-fold decrease in the hydrogen ion concentration", a: "A 10-FOLD INCREASE IN THE HYDROGEN ION CONCENTRATION", letter: "W"},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Earth’s atmosphere contains several different layers that are most often defined according to: W) pressure X) moisture Y) wind velocity Z) temperature", a: "TEMPERATURE", letter: "Z"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Name all of the following 3 choices that influence wind direction on Earth: Coriolis effect; centripetal force; pressure gradients", a: "ALL", letter: ""},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "In 2005, into what celestial object did the Deep Impact probe crash into?", a: "COMET", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following terms is used most often by astronomers for the total energy emitted per unit time from a star: W) apparent magnitude X) watts Y) luminosity Z) stellar unit", a: "LUMINOSITY", letter: "Y"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "The presence of which of the following is the most important characteristic that allows xylem to function in plants: W) plastids and chloroplasts X) strong thick walls Y) large fluid-filled vacuoles Z) nuclei and endoplasmic reticulum", a: "STRONG THICK WALLS", letter: "X"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Name all of the following 4 structures that are composed mostly of keratin: bird’s beak; snake teeth; human fingernail; mammalian fur", a: "BIRD’S BEAK; HUMAN FINGERNAIL; MAMMALIAN FUR", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Francium has the lowest electronegativity of the elements. This would indicate that francium is in what corner of the periodic chart: W) upper left X) lower left Y) upper right Z) lower right", a: "LOWER LEFT", letter: "X"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Which of the following compounds is LEAST soluble in water and is frequently used as a radiocontrast agent in imaging of the GI tract: W) sodium chloride X) potassium chloride Y) barium sulfate Z) sodium hydroxide", a: "BARIUM SULFATE", letter: "Y"},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "At any one time, there are always how many major tidal bulges on Earth?", a: "2", letter: ""},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which 2 of the following 4 choices are primarily responsible for the creation of two major tidal bulges on the Earth: gravity; wind; inertia; sunlight", a: "GRAVITY; INERTIA", letter: ""},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "What uranium isotope is most common on Earth?", a: "URANIUM-238", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "What is the common name for the plant from which the prized spice saffron is derived?", a: "CROCUS", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "What natural plant hormone is most directly involved in controlling phototropism?", a: "AUXIN", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Name all of the following 3 types of molecules that are generally soluble in water: simple sugars; mRNA; lipids", a: "SIMPLE SUGARS; mRNA", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Knowing that carbon is in group 4 and period 2 on the Periodic Table, give the electron configuration of the carbon atom:", a: "1s2 2s2 2p2", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Arrange the following 4 materials in DECREASING order of thermal conductivity: granite; rubber; gold; lead", a: "GOLD; LEAD; GRANITE; RUBBER", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "What is the MOST common name for the last stellar stage in the life of our Sun?", a: "WHITE DWARF", letter: ""},

// ROUND 15
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following is TRUE: W) all yeasts are nonpathogenic in humans X) all humans have the same number of chromosomes Y) all bats carry rabies Z) all DNA contains phosphorous", a: "ALL DNA CONTAINS PHOSPHOROUS", letter: "Z"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "To anneal a metal, what do you generally treat it with?", a: "HEAT", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Lipids will dissolve best in which of the following: W) 3% salt water X) milk Y) distilled water Z) chloroform", a: "CHLOROFORM", letter: "Z"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Which of the following statements is NOT true: W) all living things require energy except in some states of dormancy X) energy is transformed from one state to another in living things Y) the laws of thermodynamics do not apply to living things Z) enzymes allow certain reactions to occur at faster rates than without them", a: "THE LAWS OF THERMODYNAMICS DO NOT APPLY TO LIVING THINGS", letter: "Y"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following is NOT true of glycerol: W) it has 3 carbons X) it is sometimes used as a sweetener in human foods Y) it has no caloric value in humans Z) it is considered a sugar alcohol", a: "IT HAS NO CALORIC VALUE IN HUMANS", letter: "Y"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following stars typically has the GREATEST density: W) black dwarf X) neutron star Y) Main Sequence star Z) Blue Giant", a: "NEUTRON STAR", letter: "X"},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following coasts in North America contains the most pronounced fjords: W) the west coast from Puget Sound to Alaska X) the west coast from Oregon to Mexico Y) the east coast from Maine to Florida Z) the entire Gulf Coast", a: "THE WEST COAST FROM PUGET SOUND TO ALASKA", letter: "W"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "What is the specific name for accumulated snow or ice that survives one melt season on a glacier?", a: "FIRN", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following most closely relates to the first law of thermodynamics: W) conservation of energy X) transformation of mass into energy Y) energy moving from a cold to a hot object Z) kinetic energy of molecules and atoms", a: "CONSERVATION OF ENERGY", letter: "W"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "The specific heat of water is about 10-times that of copper. By words or numbers, name all of the following 3 statements that are TRUE: 1) 1 gram of water requires more energy than 1 gram of copper to raise its temperature by 1ºC 2) water will cool down in the same environment much faster than a sample of copper of the same mass 3) 1 gram of water has 10-times as much average translational kinetic energy than 1 gram of copper at the same temperature", a: "1", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "During which of the following embryonic stages of a human are all 3 germ layers formed: W) zygote X) blastula Y) gastrula Z) morula", a: "GASTRULA", letter: "Y"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Which of the following do all chordates possess at some time in their lives: W) gill slits X) radula Y) book lungs Z) exoskeleton", a: "GILL SLITS", letter: "W"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following sound frequencies would generally NOT be heard by humans: W) 20 hertz X) 200 hertz Y) 2 kilohertz Z) 20 kilohertz", a: "20 KILOHERTZ", letter: "Z"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following is the greatest contributor to ambient carbon monoxide concentrations in the U.S.: W) industrial processes X) electric utilities Y) transportation Z) farm animals", a: "TRANSPORTATION", letter: "Y"},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following is NOT true about earthquakes: W) the focus of an earthquake is the point from which energy is released X) the epicenter is the point on Earth’s surface directly above the focus Y) lithospheric plate interactions commonly cause both earthquakes and volcanoes Z) primary seismic waves cause the most damage to buildings during an earthquake", a: "PRIMARY SEISMIC WAVES CAUSE THE MOST DAMAGE TO BUILDINGS DURING AN EARTHQUAKE", letter: "Z"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Arrange the following 3 types of seismic waves from the FIRST to arrive at a seismic recording station to the LAST from a given earthquake: S-wave; L-wave; P-wave", a: "P-WAVE; S-WAVE; L-WAVE", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Distillation will NOT work very well under which of the following situations: W) the components in the mixture have the same boiling points X) the mixture consists of a solid and a liquid Y) the mixtures is colored Z) the mixture is not colored", a: "THE COMPONENTS IN THE MIXTURE HAVE THE SAME BOILING POINTS", letter: "W"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Acetylene has a triple bond between its two carbons. Which of the following shapes does it have: W) bent X) tetrahedral Y) linear Z) see-saw", a: "LINEAR", letter: "Y"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "In certain diseases, red blood cells are damaged and destroyed in massive numbers. What organ will often enlarge under these circumstances and be central in the removal of the abnormal red blood cells and their breakdown products?", a: "SPLEEN", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Name all of the following 4 molecules that serve as neurotransmitters in vertebrates: adrenaline; dopamine; serotonin; sphingosine", a: "ADRENALINE; DOPAMINE; SEROTONIN", letter: ""},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Instead of lenses, what do refractor telescope use to collect light from celestial objects?", a: "MIRRORS", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "What is the most common term for the final stage of a star with between 1 and 3 solar masses?", a: "WHITE DWARF", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following is NOT true about the Appalachian Mountain Range: W) it is older than the Himalayan range X) it has no active volcanoes Y) the southeastern portion is undergoing accelerated mountain building Z) it occurs along an ancient plate boundary", a: "THE SOUTHEASTERN PORTION IS UNDERGOING ACCELERATED MOUNTAIN BUILDING", letter: "Y"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following is the name for the mineral with the chemical composition Fe3O4: W) magnetite X) pyrite Y) olivine Z) biotite mica", a: "MAGNETITE", letter: "W"},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following is TRUE: W) unlike charges repel X) lithium is an alkaline earth metal Y) magnetic poles always come in pairs Z) some isotopes of helium have 1 proton", a: "MAGNETIC POLES ALWAYS COME IN PAIRS", letter: "Y"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "What is the most common term used to describe a hydrocarbon chain that has all single bonds between carbons?", a: "SATURATED", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Which of the following does NOT occur in mitosis: W) synapsis of chromosomes X) chromosomes line up at metaphase Y) nuclear membrane dissolves Z) sister chromatids separate", a: "SYNAPSIS OF CHROMOSOMES", letter: "W"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following does one arcsecond equal: W) 60 arcminutes X) 60 arcs Y) 1/60th of an arcminute Z) 1/360th of an arcminute", a: "1/60TH OF AN ARCMINUTE", letter: "Y"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "If a superior planet is at opposition, it can be seen: W) only at sunset X) just before sunrise Y) throughout the night Z) not at all", a: "THROUGHOUT THE NIGHT", letter: "Y"},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "The MOST catastrophic mass extinction event in Earth’s history occurred about how many million years ago: W) 65 X) 250 Y) 2,800 Z) 4,800", a: "250", letter: "X"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "What is the name for the largest extinction event when nearly all life on Earth came to an end?", a: "PERMIAN EXTINCTION", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following best describes the following reaction: 2Mg + O2 -> 2MgO W) combination X) decomposition Y) single replacement Z) combustion", a: "COMBINATION", letter: "W"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Name all of the following 3 substances that will likely form a weak electrolyte when dissolved in pure water: acetic acid; magnesium chloride; sodium hydroxide", a: "ACETIC ACID", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "If a normal human lymphocyte underwent mitosis but NOT cytokinesis, how many chromosomes would the cell have?", a: "92", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "The structure of proteins is classified from primary through quaternary levels. Which level is determined by the sequence of its amino acids?", a: "PRIMARY", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Name all of the following 4 choices that are organic acids: citric acid; hydrochloric acid; nitric acid; hydrogen sulfide", a: "CITRIC ACID", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Name all of the following 3 physical properties of a block of iron that change when the temperature of an object is raised: electrical conductance; volume; density", a: "ALL", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "The smelting of pure iron ore is done to remove what atoms which are bonded to the iron atom?", a: "OXYGEN", letter: ""},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Also known as Arctic sea smoke, what is the meteorological term for what often forms over open water in frigid temperatures as a result of vapor condensation?", a: "FOG", letter: ""},

// ROUND 16
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Which of the following is the most common term biologists use to indicate that an enzyme has lost its normal 3-dimensional shape: W) virulent X) catalyzed Y) denatured Z) degenerated", a: "DENATURED", letter: "Y"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "By words or numbers, name all of the following 3 physical or chemical changes that will typically denature a protein: 1) large changes in pH; 2) rapid cooling to 4ºC; 3) heating to over 45ºC", a: "1 AND 3", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following is the BEST description of the thermodynamic term entropy: W) a measure of the disorder of a system X) the amount of heat in a system Y) all energy is conserved Z) heat moving from a warm system and generating work", a: "A MEASURE OF THE DISORDER OF A SYSTEM", letter: "W"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Which of the following is an example of the Doppler effect: W) the higher a sound pitch the slower it travels through a dense medium X) light emitted from a galaxy that is moving away from Earth is shifted to the red wavelengths Y) sound is louder the closer it is to an observer Z) light intensity falls off with the cube of the distance from an observer", a: "LIGHT EMITTED FROM A GALAXY THAT IS MOVING AWAY FROM EARTH IS SHIFTED TO THE RED WAVELENGTHS", letter: "X"},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following did Alfred Wegener study to come up with the theory of continental drift: W) remnant magnetism in rock X) the shape of landmasses and the distribution of fossils Y) altimetry data Z) sea floor topography", a: "THE SHAPE OF LANDMASSES AND THE DISTRIBUTION OF FOSSILS", letter: "X"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "The interpretation of which of the following gave strong and convincing support to the concept of sea-floor spreading: W) subsurface crystallography studies X) color comparisons of basaltic rock Y) fossil studies of benthic organisms Z) magnetic surveys of the seafloor", a: "MAGNETIC SURVEYS OF THE SEAFLOOR", letter: "Z"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "For people viewing the night sky from mid-northern latitudes, which of the following constellations would never set below the horizon during the night: W) Centaurus X) Orion Y) Pegasus Z) Ursa Major", a: "URSA MAJOR", letter: "Z"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Name all of the following 4 choices that are characteristic of coke used in blast furnaces: porous; shiny; grey; soft", a: "POROUS; GREY", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Into what organelle does the nuclear membrane get absorbed at the start of prophase?", a: "ENDOPLASMIC RETICULUM", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Which of the following is the best explanation as to why germs that infect a certain family of animals will often NOT be able to infect a different family of animals: W) different metabolic pathways exist in different animals X) germs gain entry into cells by binding to receptors which are often specific to certain groups of organisms Y) the immune systems of different animals prevents infection of unusual diseases Z) germs reproduce only when genes in a cell allow them", a: "GERMS GAIN ENTRY INTO CELLS BY BINDING TO RECEPTORS WHICH ARE OFTEN SPECIFIC TO CERTAIN GROUPS OF ORGANISMS", letter: "X"},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following BEST describes what atomic particle was the last to be discovered and why: W) the electron because it has very small mass X) the proton because it resides in the nucleus Y) the proton because it does not have any angular momentum Z) the neutron because it has no charge", a: "THE NEUTRON BECAUSE IT HAS NO CHARGE", letter: "Z"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Assuming that sodium and chlorine have atomic masses of 23 and 35, respectively, what is the molarity of a 5-liter aqueous solution containing 292 grams of sodium chloride?", a: "1", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following is NOT a key step in the nitrogen cycle: W) nitrification X) assimilation Y) ammonification Z) evaporation", a: "EVAPORATION", letter: "Z"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "When lengthy and lasting jet contrails predominate in the sky, which of the following is the most likely forecast: W) showers within 24 hours X) fair weather with increasing cirrus or cirrostratus clouds Y) violent thunderstorms within 24 hours Z) overcast with slow clearing", a: "FAIR WEATHER WITH INCREASING CIRRUS OR CIRROSTRATUS CLOUDS", letter: "X"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following is the best basic guide for recognizing a theory as scientific: W) it must have a hypothesis that will be proven true X) it must be subject to some sort of testing or experimentation Y) it must be new and able to be proved true in all instances Z) the subject with which it deals must be able to be directly observed", a: "IT MUST BE SUBJECT TO SOME SORT OF TESTING OR EXPERIMENTATION", letter: "X"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following is NOT true regarding B-vitamins: W) they are fat soluble X) there are more than 5 different B-vitamins Y) niacin is a B-vitamin Z) vitamin B-12 is found in meat, milk and eggs", a: "THEY ARE FAT SOLUBLE", letter: "W"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "What human blood type has antibodies to only group A antigens?", a: "TYPE B", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Which of the following is NOT true of genes: W) they are a passed from generation to generation through chromosomes X) they can come in dominant or recessive forms Y) genes often lead to the production of a protein Z) most of the DNA sequences in chromosomes are genes", a: "MOST OF THE DNA SEQUENCES IN CHROMOSOMES ARE GENES", letter: "Z"},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "A botanist observes pollen grains suspended in water jittering about in a random fashion. Another scientist observes similar random motion of coal dust on the surface of another liquid. These are commonly considered an examples of: W) speculative motion X) Bose condensation Y) Brownian motion Z) osmosis", a: "BROWNIAN MOTION", letter: "Y"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "With which of the following is Brownian motion most directly related: W) thermal energy X) conservation of mass Y) Dalton’s law Z) chemical ionic bonds", a: "THERMAL ENERGY", letter: "W"},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "The darker portion of the Moon that faces the Earth in a crescent phase often appears somewhat lighted with a faint grayish glow. Which of the following BEST describes why this happens: W) sunlight reflected off the Earth’s surface onto the Moon X) afterglow of the Moon’s lighted surface Y) an optical illusion Z) sunlight reflected off interplanetary dust", a: "SUNLIGHT REFLECTED OFF THE EARTH’S SURFACE ONTO THE MOON", letter: "W"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following best describes what occurs to the solar wind as it approaches close to the planet Earth: W) it is absorbed by the troposphere and significantly heats the upper atmosphere X) it forms cosmic rays that create the Van Allen belts Y) it is largely deflected by the Earth’s magnetosphere Z) it causes a shock wave to form, creating what is called a termination shock in the Earth’s ionosphere", a: "IT IS LARGELY DEFLECTED BY THE EARTH’S MAGNETOSPHERE", letter: "Y"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following is the earliest stage in the birth of a star: W) globular cluster X) planetary nebula Y) Blue Giant Z) nebula", a: "NEBULA", letter: "Z"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Name all of the following 3 energy resources that are typically considered renewable: tidal power; geothermal energy; coal", a: "TIDAL POWER; GEOTHERMAL ENERGY", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Which of the following is a set of reactions that do NOT require light and where carbon dioxide is used to make 3 carbon sugar phosphate molecules that are later used to make 6 carbon sugars: W) photosystem-two X) Calvin cycle Y) citric acid cycle Z) electron transport", a: "CALVIN CYCLE", letter: "X"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Which of the following instruments did Louis Pasteur use in dispelling the theory of spontaneous generation: W) swan necked flasks with boiled and unboiled broth X) open and closed jars with rotting meat Y) flasks of amino acids and other organic molecules exposed to electric charges Z) bacterial cultures inside sterile tubes", a: "SWAN NECKED FLASKS WITH BOILED AND UNBOILED BROTH", letter: "W"},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following is TRUE of a gas contained in a tall, sealed cylindrical container at 1 atmosphere of pressure and 25ºC: W) the gas exerts the same pressure on all the walls of the container X) the gas exerts a higher pressure on the top of the container Y) the gas exerts a higher pressure on the bottom of the container Z) the gas exerts a higher pressure on the sides of the container", a: "THE GAS EXERTS THE SAME PRESSURE ON ALL THE WALLS OF THE CONTAINER", letter: "W"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Which 2 of the following 4 choices represent standard conditions when working with gases: 1 atmosphere; 273 kelvin; 25ºC; 760 atmospheres", a: "1 ATMOSPHERE; 25ºC", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "The prevailing westerlies converge and are caused to rise at which of the following latitudes: W) 0º X) 30º Y) 60º Z) 90º", a: "60º", letter: "Y"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "The horse latitudes are zones primarily characterized by: W) fierce polar winds X) very light winds Y) rising air masses Z) strong tropical downbursts", a: "VERY LIGHT WINDS", letter: "X"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following is a crystalline material found in arctic regions and within relatively shallow marine sediments that is sometimes called “burning ice” and may one day be used as a vast energy source: W) methane gas hydrate X) liquid hydrogen Y) sublimated helium Z) coal gas", a: "METHANE GAS HYDRATE", letter: "W"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Name all of the following 4 choices that are common resources for biodiesel fuel: palm oil; switch grass; sunflower seeds; soybeans", a: "PALM OIL; SUNFLOWER SEEDS; SOYBEANS", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "What substance is most directly formed when oxygen accepts electrons at the end of the electron transport system of oxidative phosphorylation?", a: "WATER", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Name all of the following 3 metabolic processes in vertebrate cells that release carbon dioxide as a byproduct: glycolysis; citric acid cycle; oxidative phosphorylation", a: "CITRIC ACID CYCLE", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "What basic force of the universe most directly functions to keep the nucleus of an atom together?", a: "STRONG FORCE", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "On the geological time scale, the Pleistocene Epoch is followed by what epoch?", a: "HOLOCENE", letter: ""},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "What is the most common term for the principal, rule or effect, that explains what is referred to by astronomers as blue shift?", a: "DOPPLER EFFECT", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "From the EARLIEST to the LATEST, what are the 4 strokes or stages in a typical 4-stroke internal combustion engine?", a: "INTAKE; COMPRESSION; POWER; EXHAUST", letter: ""},

// ROUND 17
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "J. J. Thomson primarily used what instrument to discover electrons: W) cathode ray tube X) torsion balance Y) interferometer Z) mass spectrometer", a: "CATHODE RAY TUBE", letter: "W"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "In the early 20th century, physicists were unknowingly fissioning uranium by which of the following methods: W) bombardment with neutrons X) combining heavy isotopes of plutonium Y) exposing uranium to high temperatures Z) exposing heavy elements to immense pressure using explosive devices in heavy-walled containment vessels", a: "BOMBARDMENT WITH NEUTRONS", letter: "W"},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "It is the fate of all lakes and ponds on Earth to eventually become dry lands, bogs, marshes, or fens, through a process called: W) fossilization X) eutrophication Y) mineralization Z) oligotrophy", a: "EUTROPHICATION", letter: "X"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which one of the following 4 terms does not belong with the others: zone of accumulation; zone of wastage; snow line; frontal wedging", a: "FRONTAL WEDGING", letter: ""},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following was determined in 2007 to be the cause of hundreds of pet deaths because of pet food contamination: W) aspartame X) stevia Y) melamine Z) carrageenan", a: "MELAMINE", letter: "Y"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Melamine is sometimes illegally added to food products in order to increase the apparent content of: W) protein X) carbohydrate Y) enzymes Z) B vitamins", a: "PROTEIN", letter: "W"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Which of the following techniques was used by Meselson and Stahl to separate samples of DNA that contained different amounts of DNA labeled with a heavy isotope and a light isotope of nitrogen in their experiments on DNA replication: W) reverse osmosis X) dialysis Y) centrifugation Z) liquid chromatography", a: "CENTRIFUGATION", letter: "Y"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Name all of the following 4 proteins that are soluble in water: collagen; hemoglobin; insulin; DNA polymerase", a: "HEMOGLOBIN; INSULIN; DNA POLYMERASE", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "What is the maximum number of covalent bonds between any 2 carbon atoms?", a: "3", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following is a semi-permanent high pressure system that sits over the Atlantic Ocean during summer: W) South Atlantic High X) Floridian High Y) North American High Z) Bermuda High", a: "BERMUDA HIGH", letter: "Z"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following BEST describes the air circulation pattern above the Bermuda or Azores high in the northern hemisphere in August: W) air spiraling into the center in a clockwise direction X) air spiraling out from the center in a clockwise direction Y) air spiraling into the center in a counter-clockwise direction Z) air spiraling out from the center in a counter-clockwise direction", a: "AIR SPIRALING OUT FROM THE CENTER IN A CLOCKWISE DIRECTION", letter: "X"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Giving your answer as A, B, C, or D, what is a fat-soluble vitamin that is a central component for healthy vision and is important in the transduction of light to the retina, sometimes referred to as “night-vision”?", a: "A", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "The glycemic index is an index that is used to directly predict the rate at which ingested food in the human diet will increase which of the following levels in the blood: W) sugar X) lipid Y) oxygen Z) carbon dioxide", a: "SUGAR", letter: "W"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "In which of the following stages in the life of an average dividing cell would it spend most of its time: W) mitosis X) interphase Y) cytokinesis Z) karyokinesis", a: "INTERPHASE", letter: "X"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Which of the following BEST describes the chemical makeup of a human chromosome: W) 100% DNA X) about 99% DNA and 1% protein Y) about 50% DNA and 50% protein Z) about 1% DNA and 99% protein", a: "ABOUT 50% DNA AND 50% PROTEIN", letter: "Y"},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following is most accurate regarding the force of gravity: W) it is caused by the weight of an object X) it is cannot travel through a vacuum Y) it theoretically acts over unlimited distances Z) it is caused by the strong nuclear force within atoms", a: "IT THEORETICALLY ACTS OVER UNLIMITED DISTANCES", letter: "Y"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Which of the following BEST explains whether a U.S. quarter will accelerate down an inclined plane faster than a silver ring of the same diameter, assuming both roll without slipping: W) the ring accelerates faster because it has less inertia X) the ring will accelerate slower because all its mass in the outer rim Y) the quarter will accelerate faster because it has more mass Z) the quarter will accelerate at the same rate as the ring since both have the same diameter", a: "THE RING WILL ACCELERATE SLOWER BECAUSE ALL ITS MASS IN THE OUTER RIM", letter: "X"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Rounded to the nearest whole number, how many degrees is the Moon inclined with respect to the orbit of the Earth about the Sun?", a: "5", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "In the Hertzsprung-Russell diagram, where would Blue Giants be found: W) upper left X) upper right Y) lower left Z) lower right", a: "UPPER LEFT", letter: "W"},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following are the first clearly identifiable fossils from the Precambrian Era which can still be found living along beaches of Shark Bay in western Australia: W) echinoderms X) trilobites Y) sharks Z) stromatolites", a: "STROMATOLITES", letter: "Z"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "The law of superposition is used by geologists to predict which of the following properties of a rock: W) its relative age X) its absolute age Y) its radiometric age Z) its chemical composition", a: "ITS RELATIVE AGE", letter: "W"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Which of the following will most likely occur for a bacteria that is an obligate or strict anaerobe when grown in a test tube of nutrient agar that remains undisturbed: W) all the bacteria immediately die X) the bacteria only grow against the walls of the test tube Y) the bacteria only grow at the top of the test tube Z) the bacteria only grow at the bottom of the test tube", a: "THE BACTERIA ONLY GROW AT THE BOTTOM OF THE TEST TUBE", letter: "Z"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Which of the following molecules primarily functions to carry electrons from one place to another inside a cell: W) NAD+ X) ATP Y) UTP Z) pyruvic acid", a: "NAD+", letter: "W"},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following is a strong acid since it ionizes almost completely in water: W) NaCl X) LiOH Y) H2CO3 Z) H2SO4", a: "H2SO4", letter: "Z"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "What astronomical unit for distance is derived from the parallax of one second of arc?", a: "PARSEC", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "How many light-seconds are in a light-year: W) 300,000 X) 360,000 Y) 1,314,000 Z) 31,557,600", a: "31,557,600", letter: "Z"},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "The greenhouse effect is produced primarily by the re-emission of which of the following by the atmosphere: W) visible light X) UV light Y) infrared radiation Z) sensible heat", a: "INFRARED RADIATION", letter: "Y"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following is a human-made gas that, if released into the atmosphere, can directly act to destroy ozone in the stratosphere: W) chlorofluorocarbon X) carbon dioxide Y) methane Z) hydrogen cyanide", a: "CHLOROFLUOROCARBON", letter: "W"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "From what embryonic germ layer are skeletal bones primarily derived?", a: "MESODERM", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Progressing from the outside to the inside, what are the 3 basic embryonic germ layers in vertebrates?", a: "ECTODERM; MESODERM; ENDODERM", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Leona swims directly across a river at 4 kilometers per hour and the river has a current of 5 kilometers per hour. To the nearest whole number, what is Leona’s total velocity, in kilometers per hour?", a: "6", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Which 2 of the following 4 atomic properties primarily account for the magnetic behavior of an iron magnet: electron spin; neutron number; atomic charge; electron orbit", a: "ELECTRON SPIN; ELECTRON ORBIT", letter: ""},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Giving your answer as north, south, east, or west, surface winds normally blow FROM what direction at 70º to 80º north latitude?", a: "EAST", letter: ""},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Arrange the following 4 choices in order of INCREASING specific gravity: quartz; hematite; gypsum; silver", a: "GYPSUM; QUARTZ; HEMATITE; SILVER", letter: ""},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "What stellar cataclysm resulted in the formation of the Crab nebula?", a: "SUPERNOVA", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Name all of the following 4 elements that are produced in supernova and NOT by stars with masses similar to the Sun: helium; carbon; oxygen; copper", a: "COPPER", letter: ""},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Name all of the following 4 elements that are found in DNA and NOT proteins: sulfur; nitrogen; oxygen; phosphorus", a: "PHOSPHORUS", letter: ""},
{cat: "LIFE SCIENCE", type: "Bonus", q: "What radioactive isotope did Hershey and Chase use to label the capsid protein of bacteriophage in the pivotal experiment supporting the theory that genetic information was carried in the DNA?", a: "SULFUR 35", letter: ""},

// ROUND 18
{cat: "EARTH SCIENCE", type: "Toss-up", q: "The Sun’s tide-generating force is about: W) one-half that of the Moon X) twice that of the Moon Y) one-fourth that of the Moon Z) 4-times that of the Moon", a: "ONE-HALF THAT OF THE MOON", letter: "W"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Name all of the following 4 types of pelagic or marine sediments that are composed of more than 30% of the skeletal remains of microscopic organisms: calcareous ooze; terrigenous sediments; red clay; siliceous ooze", a: "CALCAREOUS OOZE; SILICEOUS OOZE", letter: ""},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Leucine and isoleucine are both: W) essential amino acids X) fatty acids Y) complex carbohydrates Z) essential minerals", a: "ESSENTIAL AMINO ACIDS", letter: "W"},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following would contain the most dietary vitamin D: W) 1 egg yolk X) 1 table spoon cod liver oil Y) 1 ounce Swiss cheese Z) 1 cup vitamin D-fortified whole milk", a: "1 TABLE SPOON COD LIVER OIL", letter: "X"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Which of the following organelles would be most abundant in cells that are producing large amounts of ATP through oxidative metabolism: W) smooth ER X) rough ER Y) mitochondria Z) lysosomes", a: "MITOCHONDRIA", letter: "Y"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "What is the oxidizing agent in the citric acid cycle that is derived in part from the vitamin niacin?", a: "NAD+", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "Which of the following best explains the benefit of adding a solution of ethylene glycol, or antifreeze, to the radiator of a car: W) lowers the freezing point and raises the boiling point X) raises the freezing point and raises the boiling point Y) lowers the freezing point and lowers the boiling point Z) raises the freezing point and lowers the boiling point", a: "LOWERS THE FREEZING POINT AND RAISES THE BOILING POINT", letter: "W"},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Metallic bonding accounts for all but which of the following physical characteristics of metals: W) strength X) ductility Y) high electrical conductivity Z) poor thermal conductivity", a: "POOR THERMAL CONDUCTIVITY", letter: "Z"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "Rounding your answer to the first decimal place, if at its closest approach to the Earth, a satellite in a circular orbit about the Sun is 0.3 astronomical units from Earth, how many astronomical units is the satellite from the Sun?", a: "0.7", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following is a type of star that is extremely useful in measuring large distances across the universe and led to the discovery that the universe is much bigger than just our Milky Way galaxy: W) eclipsing binaries X) Wolf-Rayets Y) Cepheid variables Z) neutrons", a: "CEPHEID VARIABLES", letter: "Y"},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Sometimes compared to a slow-moving glob of toothpaste extruding from a tube of toothpaste, which of the following has formed several times within the crater Mount Saint Helens since its 1980 eruption: W) lava domes X) cinder cones Y) flood basalts Z) spatter cones", a: "LAVA DOMES", letter: "X"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Knowing that the growth of lava domes is generally nonexplosive and they often grow for many months to years, which of the following best describes their magmas: W) low viscosity and low gas content X) low viscosity and high gas content Y) high viscosity and low gas content Z) high viscosity and high gas content", a: "HIGH VISCOSITY AND LOW GAS CONTENT", letter: "Y"},
{cat: "LIFE SCIENCE", type: "Toss-up", q: "Which of the following is the most common energy intermediate that couples exergonic and endergonic reactions in living cells: W) fat X) cellulose Y) glucose Z) ATP", a: "ATP", letter: "Z"},
{cat: "LIFE SCIENCE", type: "Bonus", q: "Name all of the following 4 cells that are typically diploid: zygote; lymphocyte; red blood cell; mature ovum", a: "ZYGOTE; LYMPHOCYTE", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Toss-up", q: "How many times as much kinetic energy does a falling rock have if it triples its velocity?", a: "9", letter: ""},
{cat: "PHYSICAL SCIENCE", type: "Bonus", q: "Which of the following has the GREATEST kinetic energy for an object moving in a straight path: W) a mass of 2 kg with a velocity of 10 meters per second X) a mass of 4 kg with a velocity of 8 meters per second Y) a mass of 6 kg with a velocity of 6 meters per second Z) a mass of 8 kg with a velocity of 4 meters per second", a: "A MASS OF 4 KG WITH A VELOCITY OF 8 METERS PER SECOND", letter: "X"},
{cat: "EARTH SCIENCE", type: "Toss-up", q: "Which of the following best describes what meteorologists call a mesoscale convective complex: W) an Alberta clipper X) a low-precipitation supercell tornado Y) a large cluster of thunderstorms Z) a widespread area of cool, clear conditions", a: "A LARGE CLUSTER OF THUNDERSTORMS", letter: "Y"},
{cat: "EARTH SCIENCE", type: "Bonus", q: "Which of the following is the name for the fault in which displacement of the hanging wall is downward with respect to the footwall: W) normal X) reverse Y) strike-slip Z) thrust", a: "NORMAL", letter: "W"},
{cat: "GENERAL SCIENCE", type: "Toss-up", q: "What substance is the most common moderator used in nuclear reactors world-wide?", a: "WATER", letter: ""},
{cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following best describes how water typically functions as a moderator in nuclear reactors: W) to increase the distance among uranium atoms that are fissioned X) to cool the reactor core Y) to slow fast neutrons and ensure a sustained chain reaction Z) to provide protons for the initiation of fission", a: "TO SLOW FAST NEUTRONS AND ENSURE A SUSTAINED CHAIN REACTION", letter: "Y"},
[
  // ROUND ROBIN 1
  {cat: "BIOLOGY", type: "Toss-up", q: "Living organisms are often divided into five Kingdoms. In which of the 5 Kingdoms would E. coli be classified?", a: "MONERA", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Bonus", q: "What is the binomial scientific genus and species name for humans?", a: "HOMO SAPIENS", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "The Triassic, Jurassic, and Cretaceous are all periods in what era?", a: "MESOZOIC", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "Which of the following is the correct term for a large crack in ice: W) crevice X) chasm Y) canyon Z) crevasse", a: "CREVASSE", letter: "Z", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Toss-up", q: "What is the density given as specific gravity, of a one centimeter cube of a metal that weighs 5 grams: W) .5 X) 5 Y) 2 Z) .2", a: "5", letter: "X", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "Which of the following has the greatest density: W) 10 kilogram of pure water X) 10 kilogram of aluminum Y) 2 kilogram of silver Z) 1 kilogram of gold", a: "1 KILOGRAM OF GOLD", letter: "Z", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "Rickets, which was a common disease in the early twentieth century, is caused by a deficiency in what vitamin: W) riboflavin X) vitamin B12 Y) vitamin K Z) vitamin D", a: "VITAMIN D", letter: "Z", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "Exposure to sunlight converts cholesterol found in human skin into what vitamin?", a: "VITAMIN D", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "Which of the following is present only where benthic organisms reside: W) phytoplankton X) zooplankton Y) diatoms Z) deep sea vents", a: "DEEP SEA VENTS", letter: "Z", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "What is the name of the rapid rise of coastal water that accompanies the arrival of a cyclone?", a: "TIDAL SURGE", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Toss-up", q: "Which of the following metals is attracted to a magnet? W) gold X) silver Y) iron Z) aluminum", a: "IRON", letter: "Y", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "The reaction of hydrocarbons found in such things as wood and paper with oxygen to produce carbon dioxide, water and heat is called: W) fission X) fusion Y) endothermic Z) combustion", a: "COMBUSTION", letter: "Z", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "Metamorphism transforms limestone into a metamorphic rock called: W) quartzite X) marble Y) hornfel Z) granite", a: "MARBLE", letter: "X", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "What are the icicle-shaped deposits of limestone hanging from the roof of a cave called?", a: "STALACTITES", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Toss-up", q: "Which of the following is the region of the body where the stapes bone is located: W) ankle X) ear Y) wrist Z) knee", a: "EAR", letter: "X", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "Sharks belong the class Chondricthyes because they have a skeleton made of what substance?", a: "CARTILAGE", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "Engineers in the USA often report pressure in PSI’s. What does the abbreviation PSI stand for?", a: "POUNDS per SQUARE INCH", letter: "", qformat: "Short Answer"},
  
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "Which planet does not have an element named after it? W) Uranus X) Mars Y) Mercury Z) Pluto", a: "MARS", letter: "X", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "On the Centigrade temperature scale give the whole number value that is the closest to absolute zero.", a: "MINUS 273", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following is NOT seen by reflection of sun light: W) the moon X) Mercury Y) Mars Z) the north star", a: "THE NORTH STAR", letter: "Z", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Toss-up", q: "Metals that can be hammered into thin sheets are called: W) malleable X) ductile Y) molten Z) pure", a: "MALLEABLE", letter: "W", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "A white-colored object illuminated by a blue light will appear as what color to the human eye?", a: "BLUE", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Toss-up", q: "Which of the following is an intracellular parasite: W) malaria X) sleeping sickness Y) tapeworm Z) shigella", a: "MALARIA", letter: "W", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "In mammals, what teeth are evolved primarily to function in gripping and tearing W) incissors X) canines Y) molars Z) wisdom", a: "CANINES", letter: "X", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "Each day, most coastal beaches encounter: W) one high tide and one low tide X) two high tides and one low tide Y) two high tides and two low tides Z) three high tides and three low tides", a: "TWO HIGH TIDES AND TWO LOW TIDES", letter: "Y", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "Which of the following is a metamorphic rock: W) sandstone X) granite Y) quartz Z) marble", a: "MARBLE", letter: "Z", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "At its greatest possible brightness, which is the brightest planet in the night sky?", a: "VENUS", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "The largest of the suns planets are: W) Venus and Mars X) Jupiter and Saturn Y) Neptune and Pluto Z) Mercury and Uranus", a: "JUPITER AND SATURN", letter: "X", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "By our current estimations, the Earth is approximately how many billions of years old: W) 8.4 X) 6.2 Y) 4.6 Z) 2.4", a: "4.6", letter: "Y", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "The Earth's mantle is approximately how many miles thick: W) 1000 X) 1200 Y) 1500 Z) 1800", a: "1800", letter: "Z", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Toss-up", q: "Which of these organisms in not a kind of worm? W) planerian X) fluke Y) leech Z) centipede", a: "CENTIPEDE", letter: "Z", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "What is the common specific name for the bond that joins two amino acids to form a growing protein:", a: "PEPTIDE BOND", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Toss-up", q: "What is the common scientific term for the ratio of the density of a material to that of water at 4°c", a: "SPECIFIC GRAVITY", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Bonus", q: "Starch is made of what simple sugar? W) fructose X) mannose Y) glucose Z) ribose", a: "GLUCOSE", letter: "Y", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "A large mass of ice, formed on land by the compaction and recrystallization of snow, that is moving downhill or outward under the force of gravity is called:", a: "A GLACIER", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "A flat-topped plateau bordered on all sides by cliffs is called a: W) hillock X) butte Y) drumlin Z) karst", a: "BUTTE", letter: "X", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "How many microgams are in a single milligram?", a: "1000", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "The moon moves around the earth traveling primarily: W) east to west X) north to south Y) west to east Z) south to north", a: "WEST TO EAST", letter: "Y", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "The Tropic of Cancer lies at which of the following latitudes: W) 23 ½° North X) 23 ½° South Y) 26 ½° North Z) 26 ½° South", a: "23 ½° NORTH", letter: "W", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "Magma that reached the Earth’s surface is called what?", a: "LAVA", letter: "", qformat: "Short Answer"},

  // ROUND ROBIN 2 (Includes exact duplicates as provided in your prompt)
  {cat: "BIOLOGY", type: "Toss-up", q: "During the life-cycle of amphibians, which is not a means through which respiration can occur? W) lungs X) air bladder Y) gills Z) skin", a: "AIR BLADDER", letter: "X", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "In many arthropods, the segments of the body are grouped into 3 distinct parts. Name all three parts:", a: "HEAD, THORAX, AND ABDOMEN", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Toss-up", q: "The electrical potential or power of a battery is an expression of its: W) amperage X) resistance Y) conductivity Z) voltage", a: "VOLTAGE", letter: "Z", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "A typical pair of scissors would be considered: W) a class one lever X) a class 2 lever Y) a class 3 lever Z) a form of inclined plane", a: "A CLASS ONE LEVER", letter: "W", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "How many milliliters are in a liter?", a: "1000", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "The Moon orbits the earth about once every: W) year X) day Y) month Z) century", a: "MONTH", letter: "Y", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "About what percentage of the Earth surface is covered by water? W) 33% X) 41% Y) 56% Z) 71%", a: "71%", letter: "Z", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "Name the equinoxes when day and night are of equal length around the world:", a: "AUTUMNAL AND VERNAL EQUINOXES", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Toss-up", q: "Which of the following metals is attracted to a magnet? W) gold X) silver Y) iron Z) aluminum", a: "IRON", letter: "Y", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "The reaction of hydrocarbons found in such things as wood and paper with oxygen to produce carbon dioxide, water and heat is called: W) fission X) fusion Y) endothermic Z) combustion", a: "COMBUSTION", letter: "Z", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "Metamorphism transforms limestone into a metamorphic rock called: W) quartzite X) marble Y) hornfel Z) granite", a: "MARBLE", letter: "X", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "What are the icicle-shaped deposits of limestone hanging from the roof of a cave called:", a: "STALACTITES", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Toss-up", q: "Which of the following is the region of the body where the stapes bone is located: W) ankle X) ear Y) wrist Z) knee", a: "EAR", letter: "X", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "Sharks belong the class Chondricthyes because they have a skeleton made of what substance?", a: "CARTILAGE", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "Engineers in the USA often report pressure in PSI’s. What does the abbreviation PSI stand for?", a: "POUNDS per SQUARE INCH", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "Which planet does not have an element named after it? W) Uranus X) Mars Y) Mercury Z) Pluto", a: "MARS", letter: "X", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "On the Centigrade temperature scale give the whole number value that is the closest to absolute zero.", a: "MINUS 273", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following is NOT seen by reflection of sun light: W) the moon X) Mercury Y) Mars Z) the north star", a: "THE NORTH STAR", letter: "Z", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Toss-up", q: "Metals that can be hammered into thin sheets are called: W) malleable X) ductile Y) molten Z) pure", a: "MALLEABLE", letter: "W", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "A white-colored object illuminated by a blue light will appear as what color to the human eye?", a: "BLUE", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Toss-up", q: "Which of the following is an intracellular parasite: W) malaria X) sleeping sickness Y) tapeworm Z) shigella", a: "MALARIA", letter: "W", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "In mammals, what teeth are evolved primarily to function in gripping and tearing W) incissors X) canines Y) molars Z) wisdom", a: "CANINES", letter: "X", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "Each day, most coastal beaches encounter: W) one high tide and one low tide X) two high tides and one low tide Y) two high tides and two low tides Z) three high tides and three low tides", a: "TWO HIGH TIDES AND TWO LOW TIDES", letter: "Y", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "Which of the following is a metamorphic rock: W) sandstone X) granite Y) quartz Z) marble", a: "MARBLE", letter: "Z", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "At its greatest possible brightness, which is the brightest planet in the night sky?", a: "VENUS", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "The largest of the suns planets are: W) Venus and Mars X) Jupiter and Saturn Y) Neptune and Pluto Z) Mercury and Uranus", a: "JUPITER AND SATURN", letter: "X", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "By our current estimations, the Earth is approximately how many billions of years old: W) 8.4 X) 6.2 Y) 4.6 Z) 2.4", a: "4.6", letter: "Y", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "The Earth's mantle is approximately how many miles thick: W) 1000 X) 1200 Y) 1500 Z) 1800", a: "1800", letter: "Z", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Toss-up", q: "Which of these organisms in not a kind of worm? W) planerian X) fluke Y) leech Z) centipede", a: "CENTIPEDE", letter: "Z", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "What is the common specific name for the bond that joins two amino acids to form a growing protein:", a: "PEPTIDE BOND", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Toss-up", q: "What is the common scientific term for the ratio of the density of a material to that of water at 4°c", a: "SPECIFIC GRAVITY", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Bonus", q: "Starch is made of what simple sugar? W) fructose X) mannose Y) glucose Z) ribose", a: "GLUCOSE", letter: "Y", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "A large mass of ice, formed on land by the compaction and recrystallization of snow, that is moving downhill or outward under the force of gravity is called:", a: "A GLACIER", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "A flat-topped plateau bordered on all sides by cliffs is called a: W) hillock X) butte Y) drumlin Z) karst", a: "BUTTE", letter: "X", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "How many microgams are in a single milligram?", a: "1000", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "The moon moves around the earth traveling primarily: W) east to west X) north to south Y) west to east Z) south to north", a: "WEST TO EAST", letter: "Y", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "The Tropic of Cancer lies at which of the following latitudes: W) 23 ½° North X) 23 ½° South Y) 26 ½° North Z) 26 ½° South", a: "23 ½° NORTH", letter: "W", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "Magma that reached the Earth’s surface is called what?", a: "LAVA", letter: "", qformat: "Short Answer"},

  // ROUND ROBIN 3
  {cat: "BIOLOGY", type: "Toss-up", q: "Vestigial (pronounced VES-ti-gee-al) structures: W) have no known function in their present owners X) function in an analogous fashion in all species Y) evolve homologously until functional Z) control nervous system functions", a: "HAVE NO KNOWN FUNCTION IN THEIR PRESENT OWNERS", letter: "W", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "Mallus ioeusis and Mallus sylvestris are the genera and species of what common tree?", a: "APPLE", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Toss-up", q: "What is the decibel scale most often used to measure? W) size of bells X) magnitude of hurricanes Y) loudness of a sound Z) brightness of lights", a: "LOUDNESS OF A SOUND", letter: "Y", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "What is the name of the lowest energy subshell of an atom where electrons are found: W) s X) p Y) d Z) a", a: "S", letter: "W", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "Which of the following are the highest of the clouds in the troposphere and are composed entirely of ice crystals: W) stratus X) cirrus Y) cumulus Z) altocumulus", a: "CIRRUS", letter: "X", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "In the Northern Hemisphere, when is the Earth the greatest distance from the sun: W) winter X) spring Y) summer Z) fall", a: "SUMMER", letter: "Y", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Toss-up", q: "Which of the following units is used to measure electric current: W) voltage X) ohms Y) amperes Z) watts", a: "AMPERES", letter: "Y", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "What is the current, in amperes, running through a 200-watt light bulb running on a 100 volt power source.", a: "2 AMPERE", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "What is the scientific term often used by astronomers and geoscientists that refers to the point directly overhead?", a: "ZENITH", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "The light year is a useful unit of measure for the distance between: W) planets X) stars Y) atoms Z) asteroids", a: "STARS", letter: "X", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Toss-up", q: "Which of the following parts of a plant produces pollen: W) petal X) stamen Y) pistil Z) sepal", a: "STAMEN", letter: "X", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "Plant cells differ from animal cells in that only plant cells possess: W) a nucleus X) mitochondria Y) a cell wall Z) lysosomes", a: "A CELL WALL", letter: "Y", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "When, in the geological time scale, did dinosaurs roam the Earth in large numbers: W) Jurassic X) Triassic Y) Cretaceous Z) Tertiary", a: "JURASSIC", letter: "W", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "Meteor showers are composed of: W) large pieces of falling rocks X) dust and other debris from comets Y) falling stars Z) solar flares", a: "DUST AND OTHER DEBRIS FROM COMETS", letter: "X", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "Rounded to the nearest whole number, how many centimeters are in 2 inches ?", a: "5", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following is NOT true of comets: W) they have highly elliptical orbits around the sun X) they leave a trail of particles that reflect sun light Y) they are made of rocks and condensed gases Z) they can only be seen when they pass through the atmosphere", a: "THEY CAN ONLY BE SEEN WHEN THEY PASS THROUGH THE ATMOSPHERE", letter: "Z", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "What is the name for the apparent force that causes hurricanes to be deflected to the right in the Northern hemisphere and to the left in the Southern hemisphere?", a: "THE CORIOLIS EFFECT", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "The supercontinent Pangea started to break apart into our present day continents approximately how many million years ago: W) 100 X) 200 Y) 300 Z) 400", a: "200", letter: "X", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Toss-up", q: "Which of the following is the least dense at standard temperature and pressure: W) 10 kilogram of pure water X) 10 kilogram of aluminum Y) 2 kilogram of silver Z) 1 kilogram of gold", a: "10 KILOGRAM OF PURE WATER", letter: "W", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "How many electron does the s subshell of an atom hold?", a: "2", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Toss-up", q: "Which of the following is the scientific name for the knee cap: W) fibula X) malleus Y) patella Z) scapula", a: "PATELLA", letter: "Y", qformat: "Multiple Choice"},
  
  {cat: "BIOLOGY", type: "Bonus", q: "Organize the following 3 tooth layers from the outermost to the innermost of a tooth: dentin, enamel, pulp", a: "ENAMEL, DENTIN, PULP", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "How much does one cubic centimeter of water weigh at standard temperature and pressure?", a: "1 GRAM", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "Craters on the moon is evidence of : W) lakes that once existed X) visits from other life forms Y) asteroid impacts Z) plate tectonics", a: "ASTEROID IMPACTS", letter: "Y", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Toss-up", q: "The particles in an atom that determine which element it is are the: W) nuclei X) electrons Y) neutrons Z) protons", a: "PROTONS", letter: "Z", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "All metals: W) melt at high temperatures X) conduct heat and electricity Y) contain iron Z) react with air and water", a: "CONDUCT HEAT AND ELECTRICITY", letter: "X", qformat: "Multiple Choice"},
  
  {cat: "BIOLOGY", type: "Toss-up", q: "Which of the following parts of a cell is most directly responsible for synthesizing proteins: W) ribosomes X) endoplasmic reticulum Y) vacuoles Z) lysosomee", a: "RIBOSOMES", letter: "W", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "This structure that develops in the wall of the uterus functions in the pregnant mammals to transfer nourishment and oxygen and remove wastes from the developing offspring.", a: "PLACENTA", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "Which equinox marks the beginning of spring in the Northern Hemisphere?", a: "VERNAL EQUINOX", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "Steep-sided volcanoes such as Mounts Rainier, Hood, and Fuji, are examples of what kind of volcanoes: W) stratovolcanoes X) tephra cone volcanoes Y) shield volcanoes Z) tower volcanoes", a: "STRATOVOLCANOES", letter: "W", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "The Sahara Desert in Africa is what type of desert? W) subtropical X) continental Y) rain shadow Z) coastal", a: "SUBTROPICAL", letter: "W", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "What are the 4 physical states of matter?", a: "SOLID, LIQUID, GAS, PLASMA", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Toss-up", q: "Which of the following is the scientific name for the thigh bone: W) tibia X) femur Y) fibula Z) humerus", a: "FEMUR", letter: "X", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "When a nerve message reaches the end of an axon it sends a message or impulse across the space between the nerves to continue its message to the next nerve. What is the space across which the message is sent usually called?", a: "SYNAPSE", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Toss-up", q: "When a car turns a corner on dry pavement, the wheels do not slide sideways and the car completes the turn due to what interaction between the tires and the pavement? W) friction X) torque Y) drag Z) acceleration", a: "FRICTION", letter: "W", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "Complex carbohydrates are called: W) polypeptides X) polynuclides Y) polypropylenes Z) polysaccharides", a: "POLYSACCHARIDES", letter: "Z", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "With a Mohs’ hardness of 1, what is the softest mineral known?", a: "TALC", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "The first scientist to propose the hypothesis of the past existence of the supercontinent Pangea was: W) James Hutton X) John Filmore Hayford Y) Charles Darwin Z) Alfred Wegener", a: "ALFRED WEGENER", letter: "Z", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "What vitamin is the most directly associated with the disease scurvy?", a: "VITAMIN C", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following is the best estimate of what a gallon of water weighs in kilograms? W) 2 kilograms X) 4 kilograms Y) 6 kilograms Z) 8 kilograms", a: "4 KILOGRAMS", letter: "X", qformat: "Multiple Choice"},

  // ROUND ROBIN 4
  {cat: "PHYSICS", type: "Toss-up", q: "A child’s seesaw would be considered: W) a complex machine X) a form of inclined plane Y) a compound lever Z) a class 1 lever", a: "A CLASS ONE LEVER", letter: "Z", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "A 100-watt light bulb is lighted by a 100 volt power source. What is the current, in amperes, running through the bulb?", a: "1 AMPERE", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Toss-up", q: "Which of the following is the scientific name for the part of the human brain where higher brain operations occur such as thinking, imagination, mathematical reasoning and language: W) cerebral cortex X) cerebellum Y) medulla oblongata Z) hypothalamus", a: "CEREBRAL CORTEX", letter: "W", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "What is the common botanical term for the response a cell or plant has towards or away from a stimulus?", a: "TAXIS", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "What layer of the Sun’s atmosphere is immediately interior to the corona?", a: "THE CHROMOSPHERE", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "How many angstroms are in 1 micron?", a: "10,000", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Toss-up", q: "What is the joint that is formed by the articulation of the tibia, fibula, and femur? W) wrist X) knee Y) elbow Z) ankle", a: "KNEE", letter: "X", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "The exchange of gases between blood and the tissue occurs normally in: W) venules X) arterioles Y) veins Z) capillaries", a: "CAPILLARIES", letter: "Z", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "During which month does the vernal equinox occur?", a: "MARCH", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "The temperature at which the relative humidity reaches 100% and condensation starts is called the:", a: "DEW POINT", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "Sigmund Freud proposed the idea that the subconscious mind exited in three separate divisions two of which he called the ego and the superego. What was the third?", a: "THE ID", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "Galaxies are: W) clouds of gases around stars X) clusters of billion of stars Y) rare in the universe Z) always spherical in shape", a: "CLUSTERS OF BILLION OF STARS", letter: "X", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Toss-up", q: "The amount of heat needed to increase the temperature of 1.00 gram of water from 14.5°C to 15.5°C is defined as what unit of measurement?", a: "CALORIE", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Bonus", q: "What is the chemical formula for hydrogen peroxide?", a: "H2O2", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "Which of the following minerals best illustrates the property of cleavage: W) quartz X) diamond Y) topaz Z) mica", a: "MICA", letter: "Z", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "Based on how it was formed, slate is classified as what type of rock: W) igneous X) sedimentary Y) metamorphic Z) volcanic", a: "METAMORPHIC", letter: "Y", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Toss-up", q: "The mass of a quantity of matter divided by its volume provides which specific property? W) weight X) specific gravity Y) density Z) malleability", a: "DENSITY", letter: "Y", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "Assuming friction is negligible, if a lever has a mechanical advantage of 5, how much effort in newtons is needed to lift a 10 newton load?", a: "2 NEWTONS", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Toss-up", q: "In 1665, what person, using a microscope he built, observed perforations in plant stems, which he called cells: W) Robert Hooke X) Anton Van Leewenhoek Y) Carolus Linnaeus Z) Theodor Schwann", a: "ROBERT HOOKE", letter: "W", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "What are the four main human blood types?", a: "O, A, B, AND AB", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "What is the name of the phenomenon that causes an accumulation of heat in the lower atmosphere because of the absorption of long wavelength radiation from the Earth's surface?", a: "GREENHOUSE EFFECT", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "A meteor that reaches the surface of the Earth is more accurately called a:", a: "METEORITE", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Toss-up", q: "Which of the following is the region of the body where the thyroid gland is located: W) neck X) abdomen Y) brain Z) arm pit", a: "NECK", letter: "W", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "Encephalitis is an inflammation of what organ?", a: "BRAIN", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "Ring, Helix, Dumbbell and Veil are all names of what specific type of heavenly bodies?", a: "NEBULA", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "Rounded to the nearest whole number, what is the temperature in Fahrenheit of a substance at 100°C ?", a: "212°", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "Which equinox marks the moment when fall begins in the Northern Hemisphere?", a: "AUTUMNAL EQUINOX", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "Underwater volcanoes that have a flat top are called: W) seamounts X) island arcs Y) abyssal mountains Z) guyots", a: "GUYOTS", letter: "Z", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "What term do physicists and engineers use most commonly to describe a change in the velocity of an object?", a: "ACCELERATION", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "Which list is out of order of closest to furthest distance from the sun: W) Mercury, Venus, Earth X) Jupiter, Saturn, Neptune Y) Venus, Mars, Earth Z) Mercury, Jupiter, Pluto", a: "VENUS, MARS, EARTH", letter: "Y", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Toss-up", q: "A color made from the addition of two primary colors is called a:", a: "SECONDARY COLOR", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Bonus", q: "At 100 degrees Fahrenheit, which of the following substances would feel hottest to touch? W) wood X) water Y) sand Z) gold", a: "GOLD", letter: "Z", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "In a compound light microscope, the lens closest to the specimen is usually called the", a: "OBJECTIVE", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "What is the nearest star to Earth in the Milky Way?", a: "THE SUN", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Toss-up", q: "What property of waves allows them to bend around the edges of obstacle: W) reflection X) diffraction Y) deflection Z) dispersion", a: "DIFFRACTION", letter: "X", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "For a toaster that draws 12 amps on a 120 volt line, what is the resistance of the toaster?", a: "10 OHMS", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Toss-up", q: "Which of the following is not a case of symbiosis: W) parasitism X) commensalism Y) mutualism Z) formatism", a: "FORMATISM", letter: "Z", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "What is the name of the protein which is primarily responsible for the varying shades of color in human skin and increases in production after exposure to sunlight.", a: "MELANIN", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "What is the name of a mixture of molten rock, suspended mineral grains, and dissolved gases that forms within the crust or mantle of the Earth when temperatures are sufficiently high:", a: "MAGMA", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "In what geological period did the first organisms with shells first become abundant: W) Precambrian X) Cambrian Y) Devonian Z) Permian", a: "CAMBRIAN", letter: "X", qformat: "Multiple Choice"},

  // ROUND ROBIN 5
  {cat: "PHYSICS", type: "Toss-up", q: "When an airplane’s ailerons move in opposite directions they usually cause a plane to: W) pitch X) yaw Y) roll Z) stall", a: "ROLL", letter: "Y", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "Calcium, strontium, and barium are commonly called what kind of elements? W) halides X) inert Y) alkali metals Z) alkaline earth", a: "ALKALINE", letter: "Z", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "In which of the geological time periods, did dinosaurs first appear: W) Jurassic X) Triassic Y) Cretaceous Z) Tertiary", a: "TRIASSIC", letter: "X", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "In what layer of the Earth’s atmosphere does most of our weather occur?", a: "TROPOSPHERE", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Toss-up", q: "A series of amino acids joined together will make a: W) polysaccharide X) DNA Y) sugar Z) protein", a: "PROTEIN", letter: "Z", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "When a nerve message reaches the end of an axon it sends a message or impulse across the space between the nerves to continue its message to the next nerve by a substance best known as: W) synaptic nodes X) neuromotor stimluli Y) neurotransmitters Z) intersynaptic dosimeters", a: "NEUROTRANSMITTERS", letter: "Y", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Toss-up", q: "Which of the following moves in the form of a longitudinal compression wave: W) ocean wave X) sound wave Y) light wave Z) electromagnetic wave", a: "SOUND WAVE", letter: "X", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "What is the resistance of an electric drill that draws 8 amps on a 120 volt line?", a: "15 OHMS", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "Ergot, Amanita muscaris, Penicillium and smut are all organisms that belong to which one of the five classical Kingdoms of life?", a: "FUNGI", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "When the moon appears through the night as a thin crescent, the suns light: W) is being blocked by the earth X) still illuminates about half the surface of the moon Y) is only hitting the crescent region Z) only shines during the day", a: "STILL ILLUMINATES ABOUT HALF THE SURFACE OF THE MOON", letter: "X", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Toss-up", q: "Most animal eukaryotic cells have: W) a cell wall, nucleus, and cytoplasm X) a plasma membrane, nucleus, and cytoplasm Y) a cell wall, nucleus, and nucleolus Z) a cell wall, nucleus, and mitochondrion", a: "A PLASMA MEMBRANE, NUCLEUS, AND CYTOPLASM", letter: "X", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "What is the term used by Charles Darwin that he believed was the principle mechanism of evolution and way that nature chose certain members of a population to survive over others?", a: "NATURAL SELECTION", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "In order from the beginning, what are the first 5 letters of the Greek alphabet?", a: "ALPHA, BETA, GAMMA, DELTA, EPSILON", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "Rounded to the nearest whole number, what is the temperature in Fahrenheit of a substance at -40°C ?", a: "-40", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Toss-up", q: "Ultrasonic sound frequencies are typically considered to be W) above 20,000 kilohertz X) below 20,000 kilohertz Y) above 20,000 Hertz Z) below 20,000 Hertz", a: "ABOVE 20,000 HERTZ", letter: "Y", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "Predict which object made of the following metal will sink in a pool of Mercury, which has a density 13.5 grams per cubic centimeter: W) aluminum, which has a density of 2.6 grams per cubic centimeter X) iron, which has a density of 7.9 grams per cubic centimeter Y) lead, which has a density of 11.34 grams per cubic centimeter Z) uranium, which has a density of 19.5 grams per cubic centimeter", a: "URANIUM, WHICH HAS A DENSITY OF 19.5 GRAMS PER CUBIC CENTIMETER", letter: "Z", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "In what layer of the Earth’s atmosphere does most of our weather occur?", a: "TROPOSPHERE", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "Lines on a weather map connecting places of equal air pressure are called:", a: "ISOBARS", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Toss-up", q: "What main artery carries oxygenated blood immediately away from left ventricle of the heart?", a: "AORTA", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Bonus", q: "What is the vector that transmits Rocky Mountain Spotted Fever to humans?", a: "THE TICK", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "On the Kelvin temperature scale give the whole number value that is the closest to absolute zero.", a: "0", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "Stars appear to have different colors because they have different: W) distances X) ages Y) temperatures Z) names", a: "TEMPERATURES", letter: "Y", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "Identify the type of structure associated with the following man-made structures in the United States: Hungry Horse, Yellowtail, Glen Canyon, Grand Coulee, and Hoover", a: "DAMS", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "What is the name of the boundary between the troposphere and the stratosphere?", a: "TROPOPAUSE", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Toss-up", q: "The electrons that are shared in chemical bonds between atoms are most accurately called: W) inner electrons X) quantum electrons Y) valence electrons Z) jumping electrons", a: "VALENCE ELECTRONS", letter: "Y", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "In grams per milliliter, which of the following is closest to the density of ice: W) 0.26 X) 0.92 Y) .99 Z) 3.00", a: ".99", letter: "Y", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Toss-up", q: "What is the protein found in red blood cells that carries oxygen:", a: "HEMOGLOBIN", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Bonus", q: "What is the vector for the germ which caused the black plague?", a: "FLEA", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "With a Mohs’ hardness of 10, what is the hardest mineral known?", a: "DIAMOND", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "Most of the ozone in the Earth’s atmosphere is present in which layer?", a: "STRATOSPHERE", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "What is the mineral that has tricked so many people into thinking it was the real precious metal gold that its common name is “fool’s gold” ?", a: "IRON PYRITE", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "Early astronomers observed lights that wandered among the stars, today we know these are: W) sun spots X) asteroid belts Y) constellations Z) planets", a: "PLANETS", letter: "Z", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "What is the term used for the unusual infectious agents that cause mad cow disease?", a: "PRIONS", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "George Washington Carver found over 100 uses for the organic molecules derived from what common plant?", a: "PEANUT", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "What is the name of the form of oxygen that is present in the atmosphere that protects life on Earth by absorbing much of the ultraviolet radiation from the sun?", a: "OZONE", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "What are the names of the tides that occur when the sun’s tidal bulges and the moon’s tidal bulges are at right angles to each other?", a: "NEAP TIDES", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Toss-up", q: "Mendel did most of his original experimentation using this type of plant:", a: "PEA", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Bonus", q: "Where is intercellular fluid normally found?", a: "OUTSIDE OF CELLS", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Toss-up", q: "Whole multiples of the fundamental tone are usually called:", a: "HARMONICS", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Bonus", q: "If an atom of fluorine has an atomic number of 9 and an atomic mass of 18.998 , how many protons and neutrons are in the nucleus?", a: "9 PROTONS, 10 NEUTRONS", letter: "", qformat: "Short Answer"},

  // ROUND ROBIN 6
  {cat: "BIOLOGY", type: "Toss-up", q: "Which of the following accounts for the largest increase in cancer death rate in the USA between the years 1900 and 1990: W) lung X) breast Y) colon Z) stomach", a: "LUNG", letter: "W", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "The structure of DNA proposed by Watson and Crick was partly based on the x-ray work of: W) Louis Pasteur X) Rosalind Franklin Y) Linus Pauling Z) Eleonore Rubinstein", a: "ROSALIND FRANKLIN", letter: "X", qformat: "Multiple Choice"},
  
  {cat: "PHYSICS", type: "Toss-up", q: "If light is passed through two pin holes and the patterns allowed to overlap on a wall, the pattern produced by the intersection of waves is called: W) an intersection pattern X) an interference pattern Y) an arcing pattern Z) a construction pattern", a: "AN INTERFERENCE PATTERN", letter: "X", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "Add a second proton and two neutrons to the hydrogen nucleus and you have which element?", a: "HELIUM", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "To guard against sparks causing a fire, mechanics aboard submarines during World War II often used tools made from which of the following: W) chrome plated steel X) vanadium Y) cold rolled steel Z) bronze", a: "BRONZE", letter: "Z", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "The shape of galaxies, stars, planets and their orbits is mostly attributed to: w) light x) matter y) electricity z) gravity", a: "GRAVITY", letter: "Z", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "If air masses move toward mountains from the west, most of the moisture will fall on the W) north side of the mountains X) south side of the mountains Y) west side of the mountains Z) east side of the mountains", a: "WEST SIDE OF THE MOUNTAINS", letter: "Y", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "Order the following periods of geological time from oldest to youngest: Jurassic, Cambrian, Triassic,", a: "CAMBRIAN; TRIASSIC; JURASSIC", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Toss-up", q: "Which planet is the brightest when viewed from Earth?", a: "VENUS", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Bonus", q: "If an atom of carbon has an atomic number of 6 and an atomic mass of 12.01, how many protons and neutrons are in the nucleus?", a: "6 PROTONS, 6 NEUTRONS", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Toss-up", q: "In the traditional 5 Kingdom classification of organisms, four of the 5 Kingdoms are Animalia, Plantae, Fungi, and Protista. What is the fifth?", a: "MONERA", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Bonus", q: "Give the scientific names for the four chambers of the human heart:", a: "LEFT VENTRICLE, RIGHT VENTRICLE, LEFT ATRIUM, RIGHT ATRIUM", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "Which of the following dominates the gasses in the Earth’s atmosphere, making up some 78% of the air by volume: W) nitrogen X) oxygen Y) helium Z) hydrogen", a: "NITROGEN", letter: "W", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "Metamorphism transforms limestone into a metamorphic rock called: W) quartzite X) marble Y) hornfel Z) granite", a: "MARBLE", letter: "X", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "This powerful telescope weighs about 11 tons, has a primary mirror 7.9 feet in diameter, and orbits about 380 miles above the earth:", a: "THE HUBBLE TELESCOPE", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following is NOT commonly thought of as an input device: W) scanner X) printer Y) touch-screen video screen Z) speaker", a: "PRINTER", letter: "X", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Toss-up", q: "Which of the following is a feeding structure in arachnids: W) dentipalps X) radula Y) proboscis Z) chelicerae", a: "CHELICERAE", letter: "Z", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "In humans, ovulation usually occurs how many days before the start of the next menstrual period: W) 4 X) 9 Y) 14 Z) 21", a: "14", letter: "Y", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Toss-up", q: "What color light is produced by adding equal amounts of red, green, and blue light?", a: "WHITE", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Bonus", q: "Name the most common disaccharide, known as milk sugar, that is found in milk.", a: "LACTOSE", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Toss-up", q: "Which of the following plants traps and digests insects: W) begonia X) bird of paradise Y) sun dew Z) lady’s slipper", a: "SUN DEW", letter: "Y", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "In human nerves, the nerve impulse or message occurs primarily because of the movement of ions of what two elements across the cell membranes of nerves: W) sodium and potassium X) potassium and calcium Y) calcium and sodium Z) calcium and magnesium", a: "SODIUM AND POTASSIUM", letter: "W", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "An autoclave would often be used by which of the following scientists? W) cosmologist X) microbiologist Y) paleontologist Z) philologist", a: "MICROBIOLOGIST", letter: "X", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "Which ones, if any, of the following elements are liquids at standard temperature and pressure: chlorine, bromine, mercury, selenium?", a: "BROMINE AND MERCURY", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "What happened in 1815 to cause that year to be named “the year without a summer?” W) a large meteor struck the Earth X) a large volcano erupted Y) there was a radical shift in the jet-stream southward Z) several large earthquakes occurred simultaneously around the globe", a: "A LARGE VOLCANO ERUPTED", letter: "X", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "When, in the geologic column, did dinosaurs become extinct? W) at the Cretaceous-Tertiary boundary X) at the Jurassic-Cretaceous boundary Y) at the Triassic-Jurassic boundary Z) at the Permian-Triassic boundary", a: "AT THE CRETACEOUS-TERTIARY BOUNDARY", letter: "W", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "The common mineral beryl, when found in its green crystalline form, is most commonly known as what gem stone: W) emerald X) opal Y) malachite Z) septantaine", a: "EMERALD", letter: "W", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "The unique property of carbon that is important to living organisms is its ability to: W) conduct electricity in graphite form. X) combine with other elements Y) form long chains of carbon atoms Z) exist as both diamond and graphite", a: "FORM LONG CHAINS OF CARBON ATOMS", letter: "Y", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Toss-up", q: "When Natalie rides in a circle on her horse she perceives a force which tends to throw her off her horse to the outside of the ring. What is the common name for this fictitious force center fleeing force:", a: "CENTRIFUGAL FORCE", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Bonus", q: "If an atom of gold has an atomic number of 79 and an atomic mass of 197, how many protons and neutrons are in the nucleus?", a: "79 PROTONS, 118 NEUTRONS", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Toss-up", q: "Which of the following is the organ mainly responsible for producing digestive enzymes and insulin: W) spleen X) liver Y) thyroid Z) pancreas", a: "PANCREAS", letter: "Z", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "Made up of barbs, calami, and shafts these are one of the most distinctive structures of the vertebrate class Aves.", a: "FEATHERS", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Toss-up", q: "Which of the following musical instruments can produce a pure tone: W) violin X) clarinet Y) piano Z) electronic synthesizer", a: "ELECTRONIC SYNTHESIZER", letter: "Z", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "Which is the lightest metal in the group known in the periodic table as the alkali metals?", a: "LITHIUM", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "What is the name given to the tides that occur during the new moon and full moon?", a: "SPRING TIDES", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "In limestone formations, the development of caves requires water and which of the following: W) oxygen X) nitrogen Y) carbon monoxide Z) carbon dioxide", a: "CARBON DIOXIDE", letter: "Z", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "What is the name for the outermost layer of the sun?", a: "CORONA", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "Kevin wishes to look at the stars with his binoculars. He also wants to look at a star chart with a flashlight, but he knows a regular white light will interfere with the sensitivity of his eyes to dim light. What color light is best for his flashlight?", a: "RED", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "The typical thunderstorm clouds of summer, sometimes referred to as hammerheads or thunderheads, are called: W) cumulonimbus X) altocumulus Y) stratocumulus Z) cirrocumulus", a: "CUMULONIMBUS", letter: "W", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "About how far away is the closest star to the Earth? W) 83 thousand miles X) 19 million miles Y) 93 million miles Z) 2 light years", a: "93 MILLION MILES", letter: "Y", qformat: "Multiple Choice"},

  // ROUND ROBIN 7
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following acids is NOT a flavoring used in foods? W) acetic acid X) lactic acid Y) citric acid Z) nitric acid", a: "NITRIC ACID", letter: "Z", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following is used to focus the electron beam in an electron microscope? W) condensers X) electromagnets Y) glass lenses Z) gonculators", a: "ELECTROMAGNETS", letter: "X", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Toss-up", q: "Which is not a basic muscle type in the human body? W) smooth X) skeletal Y) ventricular Z) cardiac", a: "VENTRICULAR", letter: "Y", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "Stamen is to anther as carpel is to: W) sepal X) ovary Y) egg Z) pollen", a: "OVARY", letter: "X", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "Eighty percent of the magma that results from a volcanic eruption is of what substance? W) basalt X) rhyolite Y) andesite Z) silicon dioxide", a: "BASALT", letter: "W", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "Each day, most coastal beaches encounter: W) one high tide and one low tide X) two high tides and one low tide Y) two high tides and two low tides Z) three high tides and three low tides", a: "TWO HIGH TIDES AND TWO LOW TIDES", letter: "Y", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following is most typically used as a unit of measurement for pressure: W) pascal X) dyne Y) weber Z) tesla", a: "PASCAL", letter: "W", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following household items is the best example of containing matter in the plasma state? W) fluorescent light X) toaster oven Y) blender Z) microwave oven", a: "FLUORESCENT LIGHT", letter: "W", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "The last two stars in the bowl of the big dipper point to which of the following? W) Vega X) Cassiopeia Y) Scorpio Z) Polaris", a: "POLARIS", letter: "Z", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "What is an area on earth that does not receive seismic waves during an earthquake called?", a: "SHADOW ZONE", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Toss-up", q: "Certain products have been designed so that people wearing headphones do not hear the objectionably loud sound from certain machinery with which they are working. These headphones work based on which one of the following principles: W) doppler effect X) destructive interference Y) constructive interference Z) audiopolarization", a: "DESTRUCTIVE INTERFERENCE", letter: "X", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "In chemical reactions when bonds between atoms are broken which of the following is most correct: W) energy is always needed X) both heat and light are always emitted Y) energy is always released Z) they cannot be repaired", a: "ENERGY IS ALWAYS NEEDED", letter: "W", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Toss-up", q: "If the distance separating two charges is tripled, the force between them decreases by what factor?", a: "9", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Bonus", q: "The reason why a beach ball held under the surface will pop up when released is because: W) the buoyant force has a net upward direction X) gravity is only acting at the surface Y) the pressure of the water is only in the upward direction Z) the ball is lighter than air", a: "THE BUOYANT FORCE HAS A NET UPWARD DIRECTION", letter: "W", qformat: "Multiple Choice"},
  
  {cat: "BIOLOGY", type: "Toss-up", q: "The receptors in the retina of the eye that detect faint light and transfer non-color impulses to the brain are: W) corpuscles X) rods Y) cones Z) axons", a: "RODS", letter: "X", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "Which of the following does NOT occur in mitosis: W) DNA synthesis X) sets of sister chromatids line up singly Y) sister chromatids separate as the centromere divides Z) spindle fibers help in the movement of chromosomes", a: "DNA SYNTHESIS", letter: "W", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Toss-up", q: "Which of the following is the emission source for microwaves in a typical microwave oven: W) small cyclotron X) cadmium disk bombarded with a soft x-ray source Y) magnetron Z) laser lamp", a: "MAGNETRON", letter: "Y", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "The red color in firework displays on the Fourth of July is caused by which element? W) lithium X) sodium Y) copper Z) iron", a: "LITHIUM", letter: "W", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "Which of the following is a calcite-rich carbonate rock: W) limestone X) dolostone Y) shale Z) sandstone", a: "LIMESTONE", letter: "W", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "What is the hot, putty like layer of Earth's mantle located from about 75 to 300 kilometers below the surface, where rocks have little strength?", a: "ASTHENOSPHERE", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Toss-up", q: "Which of the following is an example of a multiple fruit? W) pear X) grape Y) pineapple Z) orange", a: "PINEAPPLE", letter: "Y", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "Binomial nomenclature is classically made up of what two taxonomical terms?", a: "GENUS and SPECIES", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "What is the name of a mixture of molten rock, suspended mineral grains, and dissolved gases that forms within the crust or mantle of the Earth when temperatures are sufficiently high?", a: "MAGMA", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "A famous downslope wind that occurs in North America on the East side of the Rocky Mountains is called a: W) sirocco X) mistral Y) foehn Z) chinook", a: "CHINOOK", letter: "Z", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Toss-up", q: "Spallanzani, Reti and Pasteur were all: W) helpful in disproving the theory of spontaneous generation X) great Italian chefs Y) scientists who supported the genetic work of Mendel Z) supporters of the work of Charles Darwin", a: "HELPFUL IN DISPROVING THE THEORY OF SPONTANEOUS GENERATION", letter: "W", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "What organ of the human body is primarily responsible for removing abnormal red blood cells from the circulation ?", a: "SPLEEN", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following is a gas which presents a serious risk for cancer to thousands of Americans? W) Chlorine X) Argon Y) Neon Z) Radon", a: "RADON", letter: "Z", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "What fibrous protein found in nature is well known by scientists to be stronger by weight than steel?", a: "SILK", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following is the boiling point of water in the Kelvin temperature scale: W) 212.13 X) 262.17 Y) 373.18 Z) 459.72", a: "373.18", letter: "Y", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "If you want to specify the position of an object you must use: W) a reference point X) its mass Y) metric units Z) a meter tape", a: "A REFERENCE POINT", letter: "W", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "A rising barometer and clear skies indicate an approaching: W) warm front X) high-pressure area Y) low-pressure area Z) cold front", a: "HIGH-PRESSURE AREA", letter: "X", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "You find a mineral in the local rock shop. You know it is composed of carbonate, that it has perfect rhombohedral cleavage, and when you look through at the text on a nearby newspaper, you find it exhibits the property of double refraction. This mineral would most likely be which of the following: W) mica X) calcite Y) basalt Z) halite", a: "CALCITE", letter: "X", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Toss-up", q: "Where is the gravitational force the greatest for a uniform spherical planet:", a: "AT ITS SURFACE", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Bonus", q: "Which best explains the idea of conservation of matter in chemical reactions: W) atoms are neither created or destroyed X) the number of reactant molecules must equal the number of product molecules Y) energy and matter are equivalent Z) bond are either formed and/or broken", a: "ATOMS ARE NEITHER CREATED OR DESTROYED", letter: "W", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "In a mercury barometer, which of the following is the typically reported height of the column of mercury that is required to balance against the pressure of 1 atmosphere? W) 760 millimeters X) 14 pounds per square inch Y) 1 meter Z) 32 inches", a: "760 MILLIMETERS", letter: "W", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "For a given compound, motion at the molecular level is: W) greatest for gases X) greatest for solid Y) least for liquids Z) least for gases", a: "GREATEST FOR GASES", letter: "W", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Toss-up", q: "What is the following statement most commonly known as: “A body immersed in a fluid is supported by a force equal to the weight of the fluid it displaces.”", a: "ARCHIMEDES’ PRINCIPLE", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Bonus", q: "Boats made of iron and steel will float because: W) iron and steel are less dense than water X) the water displaced by the boat weighs more than the boat Y) surface tension holds the boat up Z) iron and steel are more dense that water", a: "THE WATER DISPLACED BY THE BOAT WEIGHS MORE THAN THE BOAT", letter: "X", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Toss-up", q: "A potato is a swollen underground stem that stores food for the plant. What is the scientific term for the swollen area?", a: "TUBER", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Bonus", q: "Give the common colloquial names in respective order for the following 3 anatomical structures: patella, scapula, hallux", a: "KNEE CAP, SHOULDER BLADE, BIG TOE", letter: "", qformat: "Short Answer"},

  // SINGLE ELIMINATION ROUND 1
  {cat: "BIOLOGY", type: "Toss-up", q: "A summary reaction for photosynthesis is: W) CO2 + O2 + H2O and light yields carbohydrate + O2 X) CO2 + H2O and light yields carbohydrate + O2 Y) CO2 + H2O and light yields carbohydrate + H2O Z) CO2 + O2 + H2O and light yields carbohydrate + H2O", a: "CO2 + H2O AND LIGHT YIELDS CARBOHYDRATE + O2", letter: "X", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "It is generally believed that most of the oxygen in the air today came from: W) oxidation of carbon molecules containing oxygen X) release of oxygen from volcanic vents Y) photosynthesis Z) forest fires", a: "PHOTOSYNTHESIS", letter: "Y", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Toss-up", q: "Osmosis is: W) the movement of water through a permeable membrane X) the movement of salts through a semi-permeable membrane Y) the movement of water through a semi-permeable membrane Z) the pressure exerted by water through a semi-permeable membrane", a: "THE MOVEMENT OF WATER THROUGH A SEMI-PERMEABLE MEMBRANE", letter: "Y", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "Which of the following is most accurate about the pasteurization of milk: W) it makes milk taste better X) it kills all bacteria by sterilizing the milk Y) it lowers the milk’s pH Z) it reduces the population of bacteria by heating but not boiling the milk", a: "IT REDUCES THE POPULATION OF BACTERIA BY HEATING BUT NOT BOILING THE MILK", letter: "Z", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "The hard rock under the topsoil in eastern Washington state was laid down over millions of years by volcanic eruptions. This rock is: W) limestone X) basalt Y) lava Z) granite", a: "BASALT", letter: "X", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "Wind speed is measured by what instrument?", a: "ANEMOMETER", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "Doubling a musical note's amplitude: W) doubles its frequency X) doubles its wavelength Y) increases its loudness Z) doubles its speed", a: "INCREASES ITS LOUDNESS", letter: "Y", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "Physicists believe there are four fundamental forces of nature. Name any two of them.", a: "GRAVITATIONAL, ELECTROMAGNETIC, STRONG, WEAK", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Toss-up", q: "Spanky swings a ball on the end of a string and maintains it in uniform circular motion, what is the most accurate term for the force exerted on the rock through the string?", a: "CENTRIPETAL", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Bonus", q: "The density of an object is a property that depends on: W) the total weight of object X) the total volume of the object Y) the liquid the object is suspended in Z) none of the above", a: "NONE OF THE ABOVE", letter: "Z", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Toss-up", q: "Amplitude modulation is typically associated with what common form of communication: W) television transmission X) radio transmission Y) short wave transmissions Z) laser transmissions", a: "RADIO TRANSMISSION", letter: "X", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "Which of the following elements does not occur naturally in nature: W) uranium X) technetium Y) boron Z) radon", a: "TECHNETIUM", letter: "X", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "As more fossil fuels are burned to produce energy, the greenhouse effect will continue to cause the temperature of the earth’s atmosphere to increase. The substance primarily responsible for the greenhouse effect is: W) ozone X) carbon dioxide Y) fluorocarbons Z) oxygen", a: "CARBON DIOXIDE", letter: "X", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "Which of the following is sometimes called volcanic glass because of its shiny appearance: W) obsidian X) granite Y) quartz Z) diorite", a: "OBSIDIAN", letter: "W", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following is the most common cause of deaths in American women between the ages of 20 and 40? W) AIDS X) breast cancer Y) colon cancer Z) heart attacks", a: "BREAST CANCER", letter: "X", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "Order the following from the SMALLEST unit of distance to the LARGEST: mile, rod, feet, kilometer.", a: "FOOT, ROD, KILOMETER, MILE", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Toss-up", q: "For two objects separated by a distance d, if the mass of one of the objects increases by two times, by what factor will the gravitational attraction between them increase?", a: "TWO", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Bonus", q: "Which of the following elements is found in Period 2 and Group 4A of the Periodic Table: W) sulfur X) carbon Y) nitrogen Z) oxygen", a: "CARBON", letter: "X", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "Tomorrow's weather forecast report for Venus would be: W) snow X) cold & clear Y) hot & humid with clear skies Z) overcast & hot", a: "OVERCAST & HOT", letter: "Z", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "What part of the cotton plant produces what is used to make cotton fabric. W) flowers or seed pods X) fibers in the stems Y) root hairs Z) fibers in the leaves", a: "FLOWERS OR SEED PODS", letter: "W", qformat: "Multiple Choice"},
  
  {cat: "BIOLOGY", type: "Toss-up", q: "In bean and corn seeds, the food supply that is used by the seed to germinate and grow is in the: W) cotyledon X) root tip Y) abcission zone Z) petiole", a: "COTYLEDON", letter: "W", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "Which of the following infectious diseases cannot be cured with current antibiotics: W) strep throat X) toxic shock syndrome Y) scarlet fever Z) influenza", a: "INFLUENZA", letter: "Z", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Toss-up", q: "The green pigment in plants that captures the energy of sunlight and initiates photosynthesis is called: W) chlorophyll X) anthocyanin Y) carotene Z) xanthophylls", a: "CHLOROPHYLL", letter: "W", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "Which of the following is an ectoparasite: W) tape worm X) malaria Y) pinworm Z) lice", a: "LICE", letter: "Z", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "What is the name for the fossilized sap of ancient conifer trees that has become brittle and hard, transparent, and yellow to brown in color:", a: "AMBER", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "Which of the following minerals constitute approximately 60% of the Earth’s crust: W) feldspar X) quartz Y) calcite Z) dolomite", a: "FELDSPAR", letter: "W", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "In humans, fertilization of the egg occurs most typically in which of the following? W) ovary X) vagina Y) uterus Z) fallopian tube", a: "FALLOPIAN TUBE", letter: "Z", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following is closest to the length of a U.S. five dollar bill? W) 6 cm X) 12 cm Y) 16 cm Z) 22 cm", a: "16 CM", letter: "Y", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "In a typical four cycle gasoline car engine, what are the most common names for the third stage or cycle of the engine if the first cycle is the intake?", a: "IGNITION", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "Order the following from the least used energy source to produce electricity in the U.S.A. to the most: hydroelectricity, oil, coal, nuclear", a: "HYDROELECTRICITY, OIL, NUCLEAR, COAL", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Toss-up", q: "A manual laborer moves 40 kilograms of flour 5 feet above the ground in 5 seconds. If she does the same task in twice the time it involves a different amount of what: W) power X) work Y) kinetic energy Z) potential energy", a: "POWER", letter: "W", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "What is the chemical symbol for the toxic element that causes mental retardation and is medically referred to as Plumbism?", a: "Pb", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "Which of the following is primarily involved in the movement of a glacier: W) running water X) ambient temperature Y) topology Z) gravity", a: "GRAVITY", letter: "Z", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "The Saffir-Simpson Scale is used to classify intensities of: W) hurricanes X) tornadoes Y) earthquakes Z) volcanic eruptions", a: "HURRICANES", letter: "W", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Toss-up", q: "This person established the “one fluid theory” of electricity and performed some of the first investigations into electrical grounding and insulation:", a: "BEN FRANKLIN", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Bonus", q: "What is always unchanged in any chemical reaction as reactants form products: W) the number of molecules X) the kind and number of atoms Y) the temperature Z) the pressure", a: "THE KIND AND NUMBER OF ATOMS", letter: "X", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "A continental glacier is found in which of the following locations: W) The Swiss Alps X) The Canadian Rockies Y) Greenland Z) The Andes Mountains", a: "GREENLAND", letter: "Y", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "The ability of mica to split into flat planar flakes resembling the leaves of a book is called what?", a: "CLEAVAGE", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Toss-up", q: "Which of the following is the hormone produced by the human body to control blood sugar and when not produced in sufficient amounts is the cause of some forms of diabetes: W) hemoglobin X) pituitary hormone Y) insulin Z) testosterone", a: "INSULIN", letter: "Y", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "The wing of a bird and the arm of a human are considered: W) congruent structures X) analogous structures Y) homologous structures Z) vestigial structures", a: "HOMOLOGOUS STRUCTURES", letter: "Y", qformat: "Multiple Choice"},

  // SINGLE ELIMINATION ROUND 2
  {cat: "PHYSICS", type: "Toss-up", q: "Which of the following components corresponds to the pitch of a sound wave: W) wavelength X) frequency Y) amplitude Z) speed", a: "FREQUENCY", letter: "X", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "In a closed container, if a gas is heated, which of the following occurs: W) molecular motion will decrease X) the gas will condense on the inner walls of the container Y) the chemical properties will change Z) the pressure will increase", a: "THE PRESSURE WILL INCREASE", letter: "Z", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Toss-up", q: "Which of the following is NOT true: W) all the DNA in a eukaryotic cell is contained in the nucleus X) chiasma are a method of genetic interchromasomal exchange Y) in deuterostomes, the blastopore forms the anus Z) in lower plants the sporophyte is parasitic upon the gametophyte", a: "ALL THE DNA IN A EUKARYOTIC CELL IS CONTAINED IN THE NUCLEUS", letter: "W", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "What is the name of the layer of cells that are produced by the phellogen and, as they mature and die, their cell walls are encrusted with suberin?", a: "CORK", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Toss-up", q: "Which of the following is the correct botanical term for the stem of a flower: W) peduncle X) stolon Y) rhizome Z) tuber", a: "PEDUNCLE", letter: "W", qformat: "Multiple Choice"},
  
  {cat: "BIOLOGY", type: "Bonus", q: "When reading the level of a fluid in a graduated cylinder, what part of the meniscus is lined up with the graduations to give an accurate reading of the volume? W) the top of the meniscus X) the bottom of the meniscus Y) the middle of the meniscus Z) the side of the meniscus", a: "THE BOTTOM OF THE MENISCUS", letter: "X", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "The Arctic Circle lies at which of the following latitudes: W) 66 ½° North X) 90° North Y) 66 ½° South Z) 90° South", a: "66 ½° NORTH", letter: "W", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "What is the only common mineral to be strongly magnetic other than magnetite:", a: "PYRRHOTITE", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following would typically be the most accurate for measuring exactly 1 liter of water: W) a pyrex 1 liter graduated cylinder X) a pyrex 1 liter beaker Y) a pyrex 2 liter beaker Z) a pyrex 1 liter Erlenmyer flask", a: "A PYREX 1 LITER GRADUATED CYLINDER", letter: "W", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "Pavlov is noted to have developed what is called classical conditioning. Which of the following is the best example of this? W) a dog hears its owner opening a can of food and the dog salivates X) a young boy looks forward to getting his allowance Y) a bird flies south when winter approaches Z) a monkey is trained to play ping pong through a series of rewards and punishments", a: "A DOG HEARS ITS OWNER OPENING A CAN OF FOOD AND THE DOG SALIVATES", letter: "W", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following is the most effective means of preventing the spread of infections in hospitals? W) antibiotic treatment X) proper sterilization of all materials Y) washing hands frequently Z) wearing surgical masks", a: "WASHING HANDS FREQUENTLY", letter: "Y", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following best describes what most experts believe about Homo sapiens? W) they arose out of Africa less than 200,000 years ago X) they arose from Neanderthals about 1 million years ago Y) they arose from apes about 20 million years ago Z) they arose from China about 2 million years ago", a: "THEY AROSE OUT OF AFRICA LESS THAN 200,000 YEARS AGO", letter: "W", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "An increase in chlorine in the stratosphere is believed to be the cause of which of the following: W) the Antarctic ozone hole X) increased photolysis of oxygen Y) decreased photolysis of oxygen Z) loss of atmospheric nitrogen", a: "THE ANTARCTIC OZONE HOLE", letter: "W", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "Order the following minerals from the hardest to the softest: Calcite; Talc; Quartz; Diamond", a: "DIAMOND; QUARTZ; CALCITE; TALC", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Toss-up", q: "At which temperature would water most likely boil on Mount McKinley: W) 90°C X) 100°C Y) 110°C Z) 120°C", a: "90°C", letter: "W", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "If one holds a piece of notebook paper vertically in front of and below the mouth and blows strongly over the paper, the paper rises in the direction that the air is flowing. This illustrates what principle of physics: W) Archimedes’ Principle X) Bernoulli’s Law Y) Pascal’s Law Z) Charles’ Law", a: "BERNOULLI’S LAW", letter: "X", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Toss-up", q: "The property of water which permits an insect to “walk” on water is: W) viscosity X) surface tension Y) tensile strength Z) turgor pressure", a: "SURFACE TENSION", letter: "X", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "Molecules that have the same chemical formula but have different shapes or geometric arrangements are called: W) isomers X) twins Y) gluons Z) isotopes", a: "ISOMERS", letter: "W", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "Which of the following is NOT true regarding the far side of the moon: W) it contains no large maria X) it contains numerous craters and highlands Y) it has been surveyed by spacecraft Z) it is always dark", a: "IT IS ALWAYS DARK", letter: "Z", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "The Fujita Scale is used to classify intensities of: W) hurricanes X) tornadoes Y) earthquakes Z) volcanic eruptions", a: "TORNADOES", letter: "X", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "Most of the rain that reaches the ground is from which of the following clouds? W) cumulus X) cirrus Y) nimbus Z) lenticular", a: "NIMBUS", letter: "Y", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "A tropical storm will be declared a hurricane when: W) it moves out of the tropics X) wind speeds reach 34 mph Y) tornadoes are observed Z) there is evidence of eye formation and sustained wind speeds of 74 mph", a: "THERE IS EVIDENCE OF EYE FORMATION AND SUSTAINED WIND SPEEDS OF 74 MPH", letter: "Z", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Toss-up", q: "Which of the following is the most specific place where the subunits of ribosomes are made in eukaryotes? W) nucleus X) endoplasmic reticulum Y) mitochondria Z) nucleolus", a: "NUCLEOLUS", letter: "Z", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "Which of the following is NOT characteristic of mitosis: W) chromosomes line up on an equatorial plate X) occurs in somatic cells Y) crossing over Z) preceded by the disappearance of the nuclear membrane", a: "CROSSING OVER", letter: "Y", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "What substance, because of its ability to dissolve so many different things, is usually considered the “universal solvent”?:", a: "WATER", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "In typical U.S. household wiring, which of the following colored wires is properly matched to its description? W) white for “hot” X) black for neutral Y) white for ground Z) green for ground", a: "GREEN FOR GROUND", letter: "Z", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "Which of the following occurs during a lunar eclipse? W) the moon passes between the Earth and the Sun X) the Earth passes between the Sun and the Moon Y) the Sun passes between the Earth and the Moon Z) Solar flares increase in intensity", a: "THE EARTH PASSES BETWEEN THE SUN AND THE MOON", letter: "X", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "Magnetite is composed of what two elements?", a: "IRON AND OXYGEN", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Toss-up", q: "By passing current through a wire wrapped around an iron rod, William Sturgeon invented the:", a: "ELECTROMAGNET", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Bonus", q: "In pursuit of an insect, a lizard, braced against a rock, accelerates with a horizontal magnitude of 15 meters per second squared. How much horizontal force, in newtons, must the lizard exert on the rock to produce this acceleration if the lizard has a mass of 3 kilograms?", a: "45 NEWTONS", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "Barney and Fred are looking at a star chart listing the brightness of stars to observers on Earth. Which of the following heavenly bodies would most likely match with a magnitude value of negative 13? W) the Moon X) the Sun Y) Jupiter Z) Pluto", a: "THE MOON", letter: "W", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "Which two of the following 5 elements are named after famous female scientists? Berkelium, Lawrencium, Meitnerium, Curium, Osmium", a: "MEITNERIUM, CURIUM", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "Where will you most likely absorb the most ionizing radiation? W) in a space shuttle 30 miles above the earth X) working in an assembly line packing nuclear reactor fuel rods with uranium pellets Y) working in a coal mine Z) working in a control room at a nuclear power plant", a: "IN A SPACE SHUTTLE 30 MILES ABOVE THE EARTH", letter: "W", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "Rounded to the nearest hundred, what is the temperature in Fahrenheit of a substance at 1000°C ?", a: "1800", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Toss-up", q: "The presence of which of the following is what makes rough endoplasmic reticulum appear rough and not smooth? W) ribosomes X) globular proteins Y) glycolipids Z) growing proteins", a: "RIBOSOMES", letter: "W", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "A lack of the neurotransmitter dopamine in the brain of humans causes what disease that afflicts thousands of US people including Michael J. Fox and Janet Reno:", a: "PARKINSON’S", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Toss-up", q: "Which of the following is NOT a protist? W) Paramecium X) Euglena Y) Amoeba Z) Anabaena", a: "ANABAENA", letter: "Z", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "Give the respective common name for the following tissues: hepatic, cardiac, epidermis.", a: "LIVER, HEART, SKIN", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Toss-up", q: "The ability of a semiconductor to carry a current is increased by a process called:", a: "DOPING", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Bonus", q: "Order the following from the LOWEST to the HIGHEST temperature: water boils, iron melts, ammonia boils, tin melts", a: "AMMONIA BOILS, WATER BOILS, TIN MELTS, IRON MELTS", letter: "", qformat: "Short Answer"},

  // SINGLE ELIMINATION ROUND 3
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "Fungi are usually spread most effectively by: W) water born hyphae X) airborne spores Y) animal ingestion of spores Z) soil germination of seeds", a: "AIRBORNE SPORES", letter: "X", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "When using a compound light microscope, which of the following is the proper procedure for focusing? W) begin with a low power objective and use only course focus when using the high power objective X) begin with a high power objective and use only fine focus when using the low power objective Y) begin with a low power objective and use only fine focus when using the high power objective Z) begin with a high power objective and use only course focus when using the low power objective", a: "BEGIN WITH A LOW POWER OBJECTIVE AND USE ONLY FINE FOCUS WHEN USING THE HIGH POWER OBJECTIVE", letter: "Y", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Toss-up", q: "During photosynthesis, for every molecule of glucose that is made, how many molecules of carbon dioxide and water are consumed? W) six carbon dioxide molecules and six water molecules X) four carbon dioxide molecules and four water molecules Y) twelve carbon dioxide molecules and twelve water molecules Z) six carbon dioxide molecules and twelve water molecules", a: "SIX CARBON DIOXIDE MOLECULES AND SIX WATER MOLECULES", letter: "W", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "Which of the following best describes antibodies: W) a class of polysaccharides involved in the immune system X) a group of proteins made by plasma cells in response to a foreign substance Y) small bodies of insects that look like ants Z) a class of genes produced by the immune system to fight disease", a: "A GROUP OF PROTEINS MADE BY PLASMA CELLS IN RESPONSE TO A FOREIGN SUBSTANCE", letter: "X", qformat: "Multiple Choice"},
  
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "If wind speeds in a storm are clocked in excess of 200 mph, this is most likely a measurement within a : W) typical thunder storm X) tornado Y) hurricane Z) microburst", a: "TORNADO", letter: "X", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "S-waves produced by earthquakes, do not travel through the Earth’s: W) crust X) mantle Y) outer core Z) lithosphere", a: "OUTER CORE", letter: "Y", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Toss-up", q: "What causes skin to sunburn after prolonged exposure to sunlight? W) infrared light X) X-rays Y) ultraviolet light Z) cosmic rays", a: "ULTRAVIOLET LIGHT", letter: "Y", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "An automobile traveling at 100 kilometers per hour has how many more times the kinetic energy than the same vehicle traveling at 50 kilometers per hour?", a: "4 TIMES", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Toss-up", q: "The melting of lead, the freezing of water, and the sublimation of dry ice, are all examples of which of the following: W) chemical reactions X) separation processes Y) condensation processes Z) physical changes", a: "PHYSICAL CHANGES", letter: "Z", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "If a 90 kilogram object displaces 30 kilograms of water when immersed, what will its apparent weight be?", a: "60 KILOGRAMS", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following temperatures in degrees Centigrade most likely corresponds to the hottest day on record anywhere in the USA: W) 26 degrees C X) 41 degrees C Y) 57 degrees C Z) 65 degrees C", a: "57 DEGREES C", letter: "Y", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "We know from solar eclipses that the Moon and the Sun appear in the sky to be: W) about the same diameter X) much different in size Y) in orbit around the Earth Z) moving on a collision course", a: "ABOUT THE SAME DIAMETER", letter: "W", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Toss-up", q: "The spines of cacti are a modification of what plant structure?", a: "LEAF", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Bonus", q: "Which of the following cells would typically be capable of the greatest amount of phagocytosis w) plasma cells X) lymphocytes Y) mast cells Z) macrophages", a: "MACROPHAGES", letter: "Z", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "The San Andreas Fault in California is an example of what type of plate margin: W) divergent margin X) convergent margin Y) transform fault margin Z) subduction margin", a: "TRANSFORM FAULT MARGIN", letter: "Y", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "Order the following minerals from the hardest to the softest: Corundum; Quartz; Fluorite", a: "CORUNDUM; QUARTZ; FLUORITE", letter: "", qformat: "Short Answer"},
  {cat: "PHYSICS", type: "Toss-up", q: "Which of the following is largely responsible for the characteristic bad odor of a rotten egg? W) sulfuric acid X) hydrogen sulfide Y) sodium chloride Z) nitrogen oxide", a: "HYDROGEN SULFIDE", letter: "X", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "Which of the following solutions will conduct electricity the best? W) sugar and distilled water X) alcohol and distilled water Y) sodium chloride and distiller water Z) moth balls and alcohol", a: "SODIUM CHLORIDE AND DISTILLER WATER", letter: "Y", qformat: "Multiple Choice"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "If Todd weighs 88 pounds, rounded to the nearest whole number, how much does he weigh in kilograms?", a: "40", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "Which of the following U.S. year 2001 coins is closest in diameter to 2 cm? W) a dollar X) a quarter Y) a dime Z) a penny", a: "A PENNY", letter: "Z", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "How many times does the Moon appear as half-full during a single lunar cycle?", a: "2", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "Which of the following is true of the Hawaiian chain of islands: W) they show increasing age from the northwest to the southeast X) they are thought to be the result of the lithosphere moving over a hot spot Y) they represent what could happen when plates interact at a convergent boundary Z) all the islands have approximately the same age", a: "THEY ARE THOUGHT TO BE THE RESULT OF THE LITHOSPHERE MOVING OVER A HOT SPOT", letter: "X", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Toss-up", q: "A figure skater who, while spinning in place, pulls her arms in to increase her rotational speed, is most closely exhibiting which of the following: W) conservation of angular momentum X) centrifugal force Y) satellite motion Z) centripetal acceleration", a: "CONSERVATION OF ANGULAR MOMENTUM", letter: "W", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "The centrifugal effect perceived by a person on a carousel is most accurately attributed to which of the following: W) friction X) a stationary frame of reference Y) constant velocity and accelerating angular momentum Z) inertia", a: "INERTIA", letter: "Z", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "The red color of Navajo sand stone is primarily because of the presence of what element?", a: "IRON", letter: "", qformat: "Short Answer"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "It is estimated that the temperature of the Earth’s core is: W) as hot as the surface of the sun X) much hotter than the surface of the sun Y) much cooler than the surface of the sun Z) it cannot be estimated", a: "AS HOT AS THE SURFACE OF THE SUN", letter: "W", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Toss-up", q: "If the full moon rises in Nebraska at about 9 p.m., which of the following will most likely be the approximate time it rises the next day? W) 7:30 p.m. X) 8:45 p.m. Y) 9:00 p.m. Z) 9:50 p.m.", a: "9:50 P.M.", letter: "Z", qformat: "Multiple Choice"},
  {cat: "EARTH AND SPACE", type: "Bonus", q: "Name 2 places on earth where continental glaciers exist:", a: "ANTARCTICA AND GREENLAND", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Toss-up", q: "Which of the following is a monocot: W) Acer rubrum X) Quercus rubra Y) Zea maize Z) Echinacea angustifolia", a: "Zea maize", letter: "Y", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "Which of the following is TRUE about a typical liver cell: W) most genes are arranged in operon-like clusters X) it has very few mitochondria Y) most genes are transcribed continuously Z) most of the DNA does not code for proteins", a: "MOST OF THE DNA DOES NOT CODE FOR PROTEINS", letter: "Z", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Toss-up", q: "Which of the following is the best description of a cell membrane also known as the plasma membrane? W) it is permeable and made of mostly proteins X) it is semi-permeable and made mostly of proteins in a lipid bilayer Y) it is impermeable and made up mostly of lipids Z) it is a fluid mosaic composed of a protein bilayer", a: "IT IS SEMI-PERMEABLE AND MADE MOSTLY OF PROTEINS IN A LIPID BILAYER", letter: "X", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "The development of embryonic cells that allows them to become different specialized cells of different organs and tissue and then function in very different ways in an adult organism is best explained by which of the following: W) they have evolved different genomes X) they each contain different genes Y) they use different genetic codes Z) different genes are expressed or turned on and off in different cells", a: "DIFFERENT GENES ARE EXPRESSED OR TURNED ON AND OFF IN DIFFERENT CELLS", letter: "Z", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Toss-up", q: "To describe a force you must give: W) the origin of the force X) its magnitude Y) the mass of an object Z) its direction and magnitude", a: "ITS DIRECTION AND MAGNITUDE", letter: "Z", qformat: "Multiple Choice"},
  {cat: "PHYSICS", type: "Bonus", q: "Order the following substances from the LEAST dense to the MOST dense: gold, water at 1°C, water at 4°C, iron", a: "WATER AT 1°C; WATER AT 4°C; IRON; GOLD", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "A person who had polydactylia would have too many of what?", a: "DIGITS", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "Consider a tree that grows 20 centimeters taller each year. If you marked a spot 100 centimeters from ground level up the trunk of the tree, about how high from the ground would the mark be in 6 years?", a: "100 CENTIMETERS", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Toss-up", q: "Which of the following is the largest in length? A light year, 1,860,000 miles, a parsec, a furlong, a hectometer", a: "A PARSEC", letter: "", qformat: "Short Answer"},
  {cat: "GENERAL SCIENCE", type: "Bonus", q: "Order the following from the most acidic to the most basic: household liquid ammonia, milk, tomato juice, pure water.", a: "TOMATO JUICE, PURE WATER, MILK, HOUSEHOLD LIQUID AMMONIA", letter: "", qformat: "Short Answer"},
  {cat: "BIOLOGY", type: "Toss-up", q: "Passive transport differs mostly from active transport since passive transport requires: W) ATP X) spectrin proteins Y) no energy Z) mitochondria", a: "NO ENERGY", letter: "Y", qformat: "Multiple Choice"},
  {cat: "BIOLOGY", type: "Bonus", q: "After taking 20 readings of the outside winter air temperature during an experiment, Kathy realizes that the first reading is more than 20% higher than all the following readings. She quickly remembers that she forgot to allow the thermometer, which was stored in a warm room, to adjust to the outside temperature. Which of the following is the most appropriate solution to her problem of what seems to be an experimental error: W) discuss the error with the other scientists and then discard the reading X) repeat the experiment, and if no other readings are unusually high she can discard the initial high reading as long as she explains why Y) repeat the experiment and average in the high reading Z) buy a new thermometer", a: "REPEAT THE EXPERIMENT AND AVERAGE IN THE HIGH READING", letter: "Y", qformat: "Multiple Choice"}
]
];

let players = {}; 
let scores = { A: 0, B: 0 };
let lockedTeams = []; 
let game = {
    state: 'lobby', 
    currentQ: null,
    words: [],
    wordIndex: 0,
    buzzedPlayer: null,
    isInterrupt: false,
    activeTeam: null, 
    timeLeft: 0,
    qCount: 0
};

const MAX_QUESTIONS = 23;
let timers = { reader: null, countdown: null };

function getOpposingTeam(team) { return team === 'A' ? 'B' : 'A'; }

// --- HELPER FUNCTIONS (These tell the game how to run!) ---
function broadcastState() {
    io.emit('updateState', { players, scores, game, lockedTeams });
}

function stopTimers() {
    clearInterval(timers.reader);
    clearInterval(timers.countdown);
}

function startCountdown(seconds, callback) {
    stopTimers();
    game.timeLeft = seconds;
    io.emit('timerUpdate', game.timeLeft);
    timers.countdown = setInterval(() => {
        game.timeLeft -= 0.1;
        io.emit('timerUpdate', Math.max(0, game.timeLeft).toFixed(1));
        if (game.timeLeft <= 0) {
            stopTimers();
            callback();
        }
    }, 100);
}

// The Backup Smart Evaluator (Just in case the AI goes down)
function getLevenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
            else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
        }
    }
    return matrix[b.length][a.length];
}

function checkAnswer(userVal, correctWord, letter) {
    userVal = userVal.toLowerCase().trim();
    correctWord = correctWord.toLowerCase().trim();
    let correctLetter = letter ? letter.toLowerCase().trim() : "";
    if (userVal === "") return false;
    if (correctLetter !== "") {
        if (userVal === correctLetter || userVal === correctLetter + ")" || userVal === correctLetter + ".)") return true;
        if (userVal === correctWord) return true;
        if (getLevenshteinDistance(userVal, correctWord) <= Math.floor(correctWord.length * 0.15)) return true;
        return false;
    }
    if (userVal === correctWord) return true;
    const tolerance = Math.floor(correctWord.length * 0.20); 
    if (getLevenshteinDistance(userVal, correctWord) <= tolerance && userVal.length > 2) return true;
    return false;
}

// --- THE AI JUDGE (WITH AUTO-ROTATION) ---
async function checkAnswerAI(question, officialAnswer, officialLetter, playerAnswer, isRetry = false) {
    if (!playerAnswer || playerAnswer.trim() === "") return false;

    const prompt = `QUESTION: "${question}"\nOFFICIAL ANSWER: "${officialAnswer}"\nOFFICIAL LETTER: "${officialLetter || 'None'}"\nPLAYER ANSWER: "${playerAnswer}"`;

    try {
        const result = await aiModel.generateContent(prompt);
        const data = JSON.parse(result.response.text());
        
        console.log(`\n[AI JUDGE - Key #${currentKeyIndex + 1}] Player: "${playerAnswer}" | Official: "${officialAnswer}"`);
        console.log(`[AI JUDGE] Reasoning: ${data.reasoning}`);
        console.log(`[AI JUDGE] Result: ${data.is_correct}\n`);

        return data.is_correct === true;

    } catch (error) {
        console.error(`[AI ERROR] Key #${currentKeyIndex + 1} failed. Rate limit hit or bad JSON.`, error.message);
        
        // If the key failed, and we haven't tried swapping yet, swap and retry!
        if (!isRetry && apiKeys.length > 1) {
            console.log("🔄 Rotating to the next API Key...");
            currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
            initAI(); // Load the new key

            console.log("🚀 Retrying the player's answer with the new key...");
            // Call the function again, but set isRetry to true so it doesn't loop forever
            return await checkAnswerAI(question, officialAnswer, officialLetter, playerAnswer, true);
        }

        // If we ALREADY retried or have no more keys, use the local text checker
        console.warn("⚠️ All AI keys are busy or failed! Falling back to local text matching.");
        return checkAnswer(playerAnswer, officialAnswer, officialLetter); 
    }
}

// --- GAME FLOW LOGIC ---
function nextQuestion() {
    stopTimers();
    lockedTeams = [];
    game.buzzedPlayer = null;

    if (game.qCount >= MAX_QUESTIONS) {
        game.state = 'lobby';
        io.emit('gameOver', { scores });
        io.emit('log', `Match over! Final Scores - Team A: ${scores.A}, Team B: ${scores.B}`);
        return;
    }

    let available = questions.filter(q => q.type === "Toss-up");
    if (available.length === 0) {
        console.log("ERROR: No Toss-up questions found!");
        io.emit('log', `SERVER ERROR: Could not find any Toss-up questions in the database.`);
        return;
    }

    game.currentQ = available[Math.floor(Math.random() * available.length)];
    game.words = game.currentQ.q.split(" ");
    game.wordIndex = 0;
    game.state = 'reading';
    game.qCount++;
    
    io.emit('clearBoard'); 
    io.emit('log', `--- Question ${game.qCount}/${MAX_QUESTIONS}: ${game.currentQ.cat} Toss-up ---`);
    broadcastState();

    timers.reader = setInterval(() => {
        if (game.wordIndex < game.words.length) {
            io.emit('word', game.words[game.wordIndex]);
            game.wordIndex++;
        } else {
            clearInterval(timers.reader);
            game.state = 'waiting';
            startCountdown(5, () => handleTimeout());
        }
    }, 200);
}

function startBonus(team) {
    game.state = 'bonus_reading'; 
    game.activeTeam = team;
    let available = questions.filter(q => q.type === "Bonus" && q.cat === game.currentQ.cat);
    if(available.length === 0) available = questions.filter(q => q.type === "Bonus");
    
    if (available.length === 0) {
        io.emit('log', `SERVER ERROR: No Bonus questions found!`);
        setTimeout(nextQuestion, 3000);
        return;
    }

    game.currentQ = available[Math.floor(Math.random() * available.length)];
    game.words = game.currentQ.q.split(" ");
    game.wordIndex = 0;
    
    game.timeLeft = 20;
    io.emit('timerUpdate', '20.0');
    
    io.emit('clearBoard');
    io.emit('log', `*** BONUS FOR TEAM ${team} ***`);
    broadcastState();

    timers.reader = setInterval(() => {
        if (game.wordIndex < game.words.length) {
            io.emit('word', game.words[game.wordIndex]);
            game.wordIndex++;
        } else {
            clearInterval(timers.reader);
            game.state = 'bonus'; 
            broadcastState(); 
            startCountdown(30, () => finishQuestion(false, "Time's up on Bonus.", "TIME!"));
        }
    }, 200);
}

function handleTimeout() {
    stopTimers();
    io.emit('log', `Time!`);
    io.emit('judgment', { isCorrect: false, text: "TIME!" });
    io.emit('revealAnswer', `ANSWER: ${game.currentQ.letter ? game.currentQ.letter + ') ' : ''}${game.currentQ.a}`);
    
    // NEW: Tell the players' screens to hide their input boxes!
    game.state = 'transition'; 
    broadcastState();
    
    setTimeout(nextQuestion, 3000);
}

function finishQuestion(isCorrect, msg, visualMsg) {
    stopTimers();
    io.emit('log', msg);
    
    if (visualMsg) {
        io.emit('judgment', { isCorrect: isCorrect, text: visualMsg });
    }

    let isQuestionDead = isCorrect || lockedTeams.length >= 2 || game.state === 'bonus';
    
    // We need to remember what state we were in before we change it!
    let previousState = game.state; 

    if (isQuestionDead) {
        io.emit('revealAnswer', `ANSWER: ${game.currentQ.letter ? game.currentQ.letter + ') ' : ''}${game.currentQ.a}`);
        
        // NEW: The question is dead. Switch to transition to hide the typing boxes!
        game.state = 'transition'; 
    }
    
    broadcastState();

    if (previousState === 'buzzing' && isCorrect) {
        let winningTeam = players[game.buzzedPlayer] ? players[game.buzzedPlayer].team : 'A';
        setTimeout(() => startBonus(winningTeam), 2500);

    } else if (previousState === 'buzzing' && !isCorrect && game.isInterrupt && lockedTeams.length < 2) {
        // 1. Temporarily put the game in 'transition' so no one can buzz during the pause
        game.state = 'transition';
        game.buzzedPlayer = null;
        broadcastState();

        // 2. Wait 2.5 seconds so players can actually read the "INCORRECT INTERRUPT" text!
        setTimeout(() => {
            game.state = 'reading';
            io.emit('clearBoard'); // Wipe the board clean AFTER the pause
            broadcastState();
            
            timers.reader = setInterval(() => {
                if (game.wordIndex < game.words.length) {
                    io.emit('word', game.words[game.wordIndex]);
                    game.wordIndex++;
                } else {
                    clearInterval(timers.reader);
                    game.state = 'waiting';
                    startCountdown(5, () => handleTimeout());
                }
            }, 200);
        }, 2500); // 2500 milliseconds = 2.5 seconds

    } else if (previousState === 'buzzing' && !isCorrect && lockedTeams.length < 2) {
         game.state = 'waiting';
         game.buzzedPlayer = null;
         startCountdown(5, () => handleTimeout());

    } else {
        setTimeout(nextQuestion, 3000);
    }
}
// --- SOCKET CONNECTIONS ---
io.on('connection', (socket) => {
    
    socket.on('join', ({ name, team, reqCaptain }) => {
        let teamMembers = Object.keys(players).filter(id => players[id].team === team);
        let hasCaptain = teamMembers.some(id => players[id].isCaptain);
        let isCap = !hasCaptain;
        players[socket.id] = { name, team, isCaptain: isCap };
        io.emit('log', `${name} joined Team ${team}${isCap ? ' as Captain' : ''}.`);
        broadcastState();
    
    });

    socket.on('startGame', () => {
        game.qCount = 0;
        scores = { A: 0, B: 0 };
        lockedTeams = [];
        io.emit('log', `Game Started!`);
        nextQuestion();
    });

    socket.on('disconnect', () => {
        if(players[socket.id]) {
            let p = players[socket.id];
            io.emit('log', `${p.name} disconnected.`);
            delete players[socket.id];
            
            if (p.isCaptain) {
                let teamMembers = Object.keys(players).filter(id => players[id].team === p.team);
                if (teamMembers.length > 0) {
                    let newCapId = teamMembers[Math.floor(Math.random() * teamMembers.length)];
                    players[newCapId].isCaptain = true;
                    io.emit('log', `>>> ${players[newCapId].name} has been promoted to Captain of Team ${p.team}! <<<`);
                }
            }
            broadcastState();
        }
    });

    socket.on('buzz', () => {
        let p = players[socket.id];
        if (!p || game.state === 'bonus' || lockedTeams.includes(p.team)) return;
        if (game.state === 'reading' || game.state === 'waiting') {
            stopTimers();
            game.state = 'buzzing';
            game.buzzedPlayer = socket.id;
            game.isInterrupt = (game.wordIndex < game.words.length);
            io.emit('log', `>>> ${p.name} (Team ${p.team}) BUZZED! <<<`);
            broadcastState();
            startCountdown(10, () => {
                lockedTeams.push(p.team);
                finishQuestion(false, `${p.name} timed out.`, "TIME!");
            });
        }
    });

    socket.on('typing', (val) => {
        if (game.buzzedPlayer === socket.id || (game.state === 'bonus' && players[socket.id].isCaptain)) {
            io.emit('liveType', { name: players[socket.id].name, text: val });
        }
    });

socket.on('submitAnswer', async (ans) => {
        let p = players[socket.id];
        if (!p) return;

        if (game.state !== 'buzzing' && game.state !== 'bonus') return;
        if (game.state === 'buzzing' && game.buzzedPlayer !== socket.id) return;
        if (game.state === 'bonus' && (!p.isCaptain || p.team !== game.activeTeam)) return;

        // --- THE SPAM BLOCKER ---
        // If the server is already waiting for the AI, ignore duplicate submissions!
        if (game.isJudging) return; 
        game.isJudging = true; 

        stopTimers();
        
        // Instantly clear any old CORRECT/INCORRECT/TIME logos from the screen
        io.emit('judgment', { isCorrect: true, text: "" });
        
        io.emit('log', `🤖 AI Judge is reviewing ${p.name}'s answer: "${ans}"...`);

        // The code pauses here to wait for the AI...
        let isCorrect = await checkAnswerAI(game.currentQ.q, game.currentQ.a, game.currentQ.letter, ans);
        
        // --- UNLOCK THE JUDGE ---
        game.isJudging = false; 
        
        if (isCorrect) {
            let pts = game.state === 'bonus' ? 10 : 4;
            scores[p.team] += pts;
            finishQuestion(true, `${p.name} answered CORRECTLY! (+${pts} pts)`, `CORRECT! +${pts}`);
        } else {
            lockedTeams.push(p.team);
            let oppTeam = p.team === 'A' ? 'B' : 'A';

            if (game.state === 'buzzing' && game.isInterrupt) {
                if (lockedTeams.length === 1) {
                    // FIRST INTERRUPT WRONG
                    scores[oppTeam] += 4;
                    io.emit('log', `Penalty! 4 pts to Team ${oppTeam}. Restarting question for them...`);
                    
                    // The "Restart" Trick:
                    game.wordIndex = 0; 
                    finishQuestion(false, `${p.name} Incorrect Interrupt!`, "INCORRECT INTERRUPT!");
                } else if (lockedTeams.length >= 2) {
                    // DOUBLE INTERRUPT WRONG
                    scores['A'] += 4;
                    scores['B'] += 4;
                    io.emit('log', `DOUBLE INTERRUPT! 4 pts to BOTH teams. Question Dead.`);
                    finishQuestion(false, `Double Interrupt Penalty!`, "DOUBLE INTERRUPT!");
                }
            } else {
                finishQuestion(false, `${p.name} answered incorrectly.`, "INCORRECT!");
            }
        }
    });

    // --- TEAM CHAT ---
    socket.on('chatMessage', (msg) => {
        let p = players[socket.id];
        if (!p) return;
        Object.keys(players).forEach(id => {
            if (players[id].team === p.team) {
                io.to(id).emit('chatReceive', { name: p.name, msg });
            }
        });
    });

    // --- GLOBAL CHAT ---
    socket.on('globalChatMessage', (msg) => {
        let p = players[socket.id];
        if (!p) return;
        io.emit('globalChatReceive', { name: p.name, msg: msg });
    });

}); // <--- THIS WAS MISSING! This is the end of io.on('connection')

// --- DEPLOYMENT PORT FIX ---
// Use the port Railway gives us, or default to 8080 for local testing
const PORT = process.env.PORT || 7860;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Multiplayer SciBowl running on port ${PORT}`);
});