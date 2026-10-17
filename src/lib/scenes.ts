import type { Phrase, Scene } from "./types";

// Colloquial Bengaluru Kannada. Have a native speaker review these lines before
// the demo; the LLM follows their register.

export const SCENES: Scene[] = [
  {
    id: "auto",
    title: "Auto ride",
    titleKn: "ಆಟೋ",
    icon: "🛺",
    tint: "auto",
    place: "Outside Jayanagar 4th Block bus stand",
    minutes: 3,
    goal: "Get an auto to Majestic on the meter",
    goalSteps: ["Say where you're going", "Ask for the meter", "Push back on the extra charge"],
    character: {
      name: "Manju",
      role: "auto driver",
      voice: "gokul",
      persona:
        "Manju, a cheerful but sharp Bengaluru auto driver in his 40s. Speaks fast colloquial Bengaluru Kannada with some English words (meter, signal, traffic). Starts by quoting a high fixed fare or 'meter mele ippattu' (₹20 over meter) and gives in if the passenger asks politely but firmly.",
    },
    opening: { kn: "ಹೇಳಿ, ಎಲ್ಲಿಗೆ ಹೋಗ್ಬೇಕು?", en: "Tell me, where do you need to go?" },
    phrases: [
      { id: "auto-1", kn: "ಮೆಜೆಸ್ಟಿಕ್‌ಗೆ ಬರ್ತೀರಾ?", en: "Will you come to Majestic?", variants: ["ಮೆಜೆಸ್ಟಿಕ್ಗೆ ಬರ್ತೀರಾ", "ಮೆಜೆಸ್ಟಿಕ್ ಬರ್ತೀರಾ"] },
      { id: "auto-2", kn: "ಮೀಟರ್ ಹಾಕಿ", en: "Put the meter on" },
      { id: "auto-3", kn: "ಎಷ್ಟು ಆಗುತ್ತೆ?", en: "How much will it be?", variants: ["ಎಷ್ಟಾಗುತ್ತೆ", "ಎಷ್ಟು ಆಗುತ್ತೆ"] },
      { id: "auto-4", kn: "ತುಂಬಾ ಜಾಸ್ತಿ, ಕಡಿಮೆ ಮಾಡಿ", en: "That's too much, bring it down" },
      { id: "auto-5", kn: "ಇಲ್ಲೇ ನಿಲ್ಸಿ", en: "Stop right here", variants: ["ಇಲ್ಲೇ ನಿಲ್ಲಿಸಿ"] },
    ],
    keyterms: ["Majestic", "ಮೆಜೆಸ್ಟಿಕ್", "Jayanagar", "ಜಯನಗರ", "KR Market", "Silk Board", "Indiranagar", "Koramangala", "meter", "ಮೀಟರ್"],
    regionalNote: "Bengaluru auto talk is heavily Kanglish: 'meter haaki', 'signal', 'right tagoli'. That is correct local Kannada.",
    maxTurns: 6,
    demo: [
      {
        match: ["ಮೆಜೆಸ್ಟಿಕ್", "majestic", "ಬರ್ತೀರಾ", "bartira", "barteera"],
        say: "ಮೆಜೆಸ್ಟಿಕ್‌ಗೆ ಬರ್ತಿರಾ?",
        reply: { kn: "ಮೆಜೆಸ್ಟಿಕ್ಆ? ಬರ್ತೀನಿ, ಆದ್ರೆ ನೂರೈವತ್ತು ರೂಪಾಯಿ ಆಗುತ್ತೆ.", en: "Majestic? I'll come, but it'll be 150 rupees." },
        required: true,
      },
      {
        match: ["ಮೀಟರ್", "meter", "meeter"],
        say: "ಮೀಟರ್ ಹಾಕಿ",
        reply: { kn: "ಸರಿ, ಮೀಟರ್ ಮೇಲೆ ಇಪ್ಪತ್ತು ರೂಪಾಯಿ ಕೊಡಿ.", en: "Okay, but give me twenty rupees over the meter." },
        tip: "Nice and direct. Add ದಯವಿಟ್ಟು (please) to sound extra polite.",
        required: true,
      },
      {
        match: ["ಜಾಸ್ತಿ", "ಕಡಿಮೆ", "jaasti", "jasti", "kadime", "ಬೇಡ"],
        say: "ತುಂಬಾ ಜಾಸ್ತಿ, ಕಡಿಮೆ ಮಾಡಿ",
        reply: { kn: "ಸರಿ ಬಿಡಿ, ಮೀಟರ್ ಮೇಲೆ ಹತ್ತು. ಕೂತ್ಕೊಳ್ಳಿ!", en: "Fine, ten over the meter. Hop in!" },
        required: true,
      },
      {
        match: ["ನಿಲ್ಸಿ", "ನಿಲ್ಲಿಸಿ", "nilsi"],
        say: "ಇಲ್ಲೇ ನಿಲ್ಸಿ",
        reply: { kn: "ಸರಿ, ಇಲ್ಲೇ ನಿಲ್ಲಿಸ್ತೀನಿ.", en: "Okay, I'll stop right here." },
      },
    ],
  },
  {
    id: "market",
    title: "Vegetable stall",
    titleKn: "ತರಕಾರಿ ಅಂಗಡಿ",
    icon: "🍅",
    tint: "market",
    place: "A stall at the Malleshwaram market",
    minutes: 3,
    goal: "Buy a kilo of tomatoes for a fair price",
    goalSteps: ["Ask the price", "Bargain a little", "Ask for one kilo"],
    character: {
      name: "Lakshmamma",
      role: "vegetable seller",
      voice: "kavitha",
      persona:
        "Lakshmamma, a warm, chatty vegetable seller in her 50s at Malleshwaram market. Calls customers 'ಬನ್ನಿ ಬನ್ನಿ', praises her produce, starts tomatoes at ₹40 a kilo and drops to ₹35 if asked nicely. Speaks everyday Bengaluru Kannada.",
    },
    opening: { kn: "ಬನ್ನಿ ಬನ್ನಿ, ಏನ್ ಬೇಕು?", en: "Come, come. What would you like?" },
    phrases: [
      { id: "market-1", kn: "ಟೊಮ್ಯಾಟೊ ಕೆಜಿ ಎಷ್ಟು?", en: "How much is a kilo of tomatoes?", variants: ["ಟೊಮೇಟೊ ಕೆಜಿ ಎಷ್ಟು", "ಟಮೋಟ ಕೆಜಿ ಎಷ್ಟು"] },
      { id: "market-2", kn: "ಸ್ವಲ್ಪ ಕಡಿಮೆ ಮಾಡಿ", en: "Bring it down a little" },
      { id: "market-3", kn: "ಒಂದು ಕೆಜಿ ಕೊಡಿ", en: "Give me one kilo", variants: ["ಒಂದ್ ಕೆಜಿ ಕೊಡಿ"] },
      { id: "market-4", kn: "ಫ್ರೆಶ್ ಆಗಿದ್ಯಾ?", en: "Is it fresh?" },
      { id: "market-5", kn: "ಸಾಕು, ಎಷ್ಟಾಯ್ತು?", en: "That's enough, how much is it?" },
    ],
    keyterms: ["ಟೊಮ್ಯಾಟೊ", "tomato", "ಈರುಳ್ಳಿ", "ಆಲೂಗಡ್ಡೆ", "ಕೊತ್ತಂಬರಿ", "Malleshwaram", "ಕೆಜಿ", "kg"],
    regionalNote: "Vendors say ಕೆಜಿ (kg) and many English vegetable names; ಒಂದ್ for ಒಂದು is normal speech.",
    maxTurns: 6,
    demo: [
      {
        match: ["ಎಷ್ಟು", "eshtu", "ಟೊಮ್ಯಾಟೊ", "tomato", "ಟೊಮೇಟೊ"],
        say: "ಟೊಮ್ಯಾಟೊ ಕೆಜಿ ಎಸ್ಟು?",
        reply: { kn: "ಕೆಜಿಗೆ ನಲವತ್ತು ರೂಪಾಯಿ. ತುಂಬಾ ಫ್ರೆಶ್ ಇದೆ!", en: "Forty rupees a kilo. Very fresh!" },
        required: true,
      },
      {
        match: ["ಕಡಿಮೆ", "kadime"],
        say: "ಸ್ವಲ್ಪ ಕಡಿಮೆ ಮಾಡಿ",
        reply: { kn: "ಸರಿ, ನಿಮಗೆ ಮೂವತ್ತೈದು. ಎಷ್ಟು ಕೊಡ್ಲಿ?", en: "Okay, thirty-five for you. How much shall I give?" },
        tip: "Good bargaining. ಸ್ವಲ್ಪ (a little) keeps it friendly.",
        required: true,
      },
      {
        match: ["ಕೆಜಿ ಕೊಡಿ", "ಒಂದು", "ಒಂದ್", "ondu", "kodi", "ಕೊಡಿ"],
        say: "ಒಂದು ಕೆಜಿ ಕೊಡಿ",
        reply: { kn: "ತಗೊಳ್ಳಿ, ಒಂದು ಕೆಜಿ. ಮೂವತ್ತೈದು ರೂಪಾಯಿ ಆಯ್ತು.", en: "Here, one kilo. That's thirty-five rupees." },
        required: true,
      },
      {
        match: ["ಫ್ರೆಶ್", "fresh"],
        say: "ಫ್ರೆಶ್ ಆಗಿದ್ಯಾ?",
        reply: { kn: "ಹೌದು, ಬೆಳಿಗ್ಗೆನೇ ಬಂತು!", en: "Yes, it came in this morning!" },
      },
    ],
  },
  {
    id: "bus",
    title: "BMTC bus",
    titleKn: "ಬಸ್",
    icon: "🚌",
    tint: "bus",
    place: "On a crowded BMTC bus from Shivajinagar",
    minutes: 3,
    goal: "Buy a ticket to Jayanagar and ask to be told the stop",
    goalSteps: ["Ask for a ticket", "Sort out the change", "Ask where to get off"],
    inferred: true,
    character: {
      name: "Ramesh",
      role: "bus conductor",
      voice: "anand",
      persona:
        "Ramesh, a busy BMTC conductor in his 30s. Short sentences, a little impatient but kind. Ticket to Jayanagar is ₹25. Says he has no change at first, then offers to give it later.",
    },
    opening: { kn: "ಟಿಕೆಟ್ ಟಿಕೆಟ್! ಎಲ್ಲಿಗೆ?", en: "Tickets, tickets! Where to?" },
    phrases: [
      { id: "bus-1", kn: "ಜಯನಗರಕ್ಕೆ ಒಂದು ಟಿಕೆಟ್ ಕೊಡಿ", en: "One ticket to Jayanagar, please", variants: ["ಜಯನಗರಕ್ಕೆ ಒಂದ್ ಟಿಕೆಟ್ ಕೊಡಿ", "ಜಯನಗರ ಒಂದು ಟಿಕೆಟ್"] },
      { id: "bus-2", kn: "ಎಷ್ಟು ರೂಪಾಯಿ?", en: "How many rupees?" },
      { id: "bus-3", kn: "ಚಿಲ್ಲರೆ ಇಲ್ಲ", en: "I don't have change" },
      { id: "bus-4", kn: "ಜಯನಗರ ಬಂದಾಗ ಹೇಳ್ತೀರಾ?", en: "Will you tell me when Jayanagar comes?" },
    ],
    keyterms: ["Jayanagar", "ಜಯನಗರ", "Shivajinagar", "ಶಿವಾಜಿನಗರ", "BMTC", "ticket", "ಟಿಕೆಟ್", "ಚಿಲ್ಲರೆ"],
    regionalNote: "ಚಿಲ್ಲರೆ (change) is the word every bus rider needs.",
    maxTurns: 6,
    demo: [
      {
        match: ["ಜಯನಗರ", "jayanagar", "ಟಿಕೆಟ್", "ticket"],
        say: "ಜಯನಗರಕ್ಕೆ ಒಂದು ಟಿಕೆಟ್ ಕೊಡಿ",
        reply: { kn: "ಜಯನಗರ ಫೋರ್ತ್ ಬ್ಲಾಕ್ಆ? ಇಪ್ಪತ್ತೈದು ರೂಪಾಯಿ.", en: "Jayanagar 4th Block? Twenty-five rupees." },
        required: true,
      },
      {
        match: ["ಚಿಲ್ಲರೆ", "chillare"],
        say: "ಚಿಲ್ಲರೆ ಇಲ್ಲ",
        reply: { kn: "ಪರವಾಗಿಲ್ಲ, ಐದು ರೂಪಾಯಿ ಆಮೇಲೆ ಕೊಡ್ತೀನಿ.", en: "No problem, I'll give you the five rupees later." },
      },
      {
        match: ["ಹೇಳ್ತೀರಾ", "ಬಂದಾಗ", "heltira", "helteera", "bandaaga"],
        say: "ಜಯನಗರ ಬಂದಾಗ ಹೇಲ್ತೀರಾ?",
        reply: { kn: "ಹೂಂ, ಹೇಳ್ತೀನಿ. ಮುಂದೆ ಹೋಗಿ ನಿಂತ್ಕೊಳ್ಳಿ.", en: "Yes, I'll tell you. Go stand near the front." },
        tip: "ಹೇಳ್ತೀರಾ? is a polite way to ask a favour.",
        required: true,
      },
    ],
  },
  {
    id: "clinic",
    title: "Clinic visit",
    titleKn: "ಕ್ಲಿನಿಕ್",
    icon: "🩺",
    tint: "clinic",
    place: "Front desk of a neighbourhood clinic",
    minutes: 3,
    goal: "Book a doctor's slot for this evening",
    goalSteps: ["Say you need the doctor", "Describe your problem", "Agree on a time"],
    inferred: true,
    character: {
      name: "Shwetha",
      role: "clinic receptionist",
      voice: "ishita",
      persona:
        "Shwetha, a calm, polite clinic receptionist in her 20s. Uses respectful Kannada (ನೀವು). Only handles booking, timings and simple symptom words. She never diagnoses or suggests medicine; if asked, she says the doctor will tell them.",
    },
    opening: { kn: "ನಮಸ್ಕಾರ, ಏನ್ ಸಹಾಯ ಬೇಕು?", en: "Hello, how can I help you?" },
    phrases: [
      { id: "clinic-1", kn: "ಡಾಕ್ಟರ್‌ನ ನೋಡ್ಬೇಕು", en: "I need to see the doctor", variants: ["ಡಾಕ್ಟರ್ನ ನೋಡ್ಬೇಕು", "ಡಾಕ್ಟರನ್ನ ನೋಡಬೇಕು"] },
      { id: "clinic-2", kn: "ನನಗೆ ಜ್ವರ ಇದೆ", en: "I have a fever", variants: ["ನಂಗೆ ಜ್ವರ ಇದೆ"] },
      { id: "clinic-3", kn: "ಇವತ್ತು ಸಂಜೆ ಸಿಗ್ತಾರಾ?", en: "Is the doctor available this evening?" },
      { id: "clinic-4", kn: "ಎಷ್ಟು ಹೊತ್ತಿಗೆ ಬರ್ಲಿ?", en: "What time should I come?" },
    ],
    keyterms: ["doctor", "ಡಾಕ್ಟರ್", "appointment", "ಜ್ವರ", "ಕೆಮ್ಮು", "ಸಂಜೆ"],
    regionalNote: "ನಂಗೆ for ನನಗೆ is everyday speech and perfectly understood.",
    maxTurns: 6,
    demo: [
      {
        match: ["ಡಾಕ್ಟರ್", "doctor", "ನೋಡ್ಬೇಕು", "nodbeku"],
        say: "ಡಾಕ್ಟರ್‌ನ ನೋಡ್ಬೇಕು",
        reply: { kn: "ಸರಿ. ಏನ್ ತೊಂದರೆ ಆಗ್ತಿದೆ?", en: "Okay. What's troubling you?" },
        required: true,
      },
      {
        match: ["ಜ್ವರ", "jwara", "ಕೆಮ್ಮು", "kemmu", "ನೋವು"],
        say: "ನನಗೆ ಜ್ವರ ಇದೆ",
        reply: { kn: "ಅಯ್ಯೋ. ಇವತ್ತು ಸಂಜೆ ಆರು ಗಂಟೆಗೆ ಸ್ಲಾಟ್ ಇದೆ, ಆಗುತ್ತಾ?", en: "Oh no. There's a slot at six this evening, does that work?" },
        required: true,
      },
      {
        match: ["ಸಂಜೆ", "ಸರಿ", "ಹೊತ್ತಿಗೆ", "sanje", "sari", "ಆಗುತ್ತೆ"],
        say: "ಸರಿ, ಸಂಜೆ ಬರ್ತೀನಿ",
        reply: { kn: "ಸರಿ, ಸಂಜೆ ಆರು ಗಂಟೆಗೆ ಬುಕ್ ಮಾಡಿದೀನಿ. ಹತ್ತು ನಿಮಿಷ ಮುಂಚೆ ಬನ್ನಿ.", en: "Done, booked for six this evening. Come ten minutes early." },
        required: true,
      },
    ],
  },
];

/** Survival lines that help in every scene; offered as hints too. */
export const LIFESAVERS: Phrase[] = [
  { id: "ls-1", kn: "ಸ್ವಲ್ಪ ನಿಧಾನವಾಗಿ ಹೇಳಿ", en: "Please say it a little slowly" },
  { id: "ls-2", kn: "ಕನ್ನಡ ಸ್ವಲ್ಪ ಸ್ವಲ್ಪ ಬರುತ್ತೆ", en: "I know a little Kannada" },
  { id: "ls-3", kn: "ಇನ್ನೊಂದ್ಸಲ ಹೇಳಿ", en: "Say it once more" },
  { id: "ls-4", kn: "ಗೊತ್ತಾಗ್ಲಿಲ್ಲ", en: "I didn't understand" },
  { id: "ls-5", kn: "ಧನ್ಯವಾದಗಳು", en: "Thank you" },
  { id: "ls-6", kn: "ಊಟ ಆಯ್ತಾ?", en: "Have you eaten? (a warm hello)" },
];

export function getScene(id: string) {
  return SCENES.find((s) => s.id === id);
}

/** One phrase a day, the same for everyone on a given date. */
export function phraseOfTheDay(date = new Date()): { phrase: Phrase; sceneId?: string } {
  const all: { phrase: Phrase; sceneId?: string }[] = [
    ...LIFESAVERS.map((p) => ({ phrase: p })),
    ...SCENES.flatMap((s) => s.phrases.map((p) => ({ phrase: p, sceneId: s.id }))),
  ];
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  return all[day % all.length];
}

export const REPEAT_LINE = { kn: "ಏನು? ಇನ್ನೊಂದ್ಸಲ ಹೇಳಿ.", en: "Sorry? Say that once more." };
export const ONLY_KANNADA_LINE = { kn: "ನಂಗೆ ಕನ್ನಡ ಮಾತ್ರ ಬರೋದು. ಕನ್ನಡದಲ್ಲಿ ಹೇಳಿ.", en: "I only speak Kannada. Say it in Kannada." };
export const HOLD_ON_LINE = { kn: "ಸ್ವಲ್ಪ ಇರಿ...", en: "One moment..." };
