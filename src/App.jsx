import React, { useState, useEffect, useRef, useMemo, useContext } from 'react';
import {
  supabase,
  listEntries,
  upsertEntry,
  deleteEntry,
  loadMoods,
  saveMoods,
  migrateSeedIfEmpty,
} from './db';
import { ENABLE_SUGGESTIONS } from './config';
import {
  Search, Plus, FileText, BookOpen, ChevronDown, X, Trash2,
  Pencil, Filter, LayoutGrid, BarChart3,
} from 'lucide-react';

// Slash search: each Keepsake lists the alias(es) that should match it.
// For the six characters with shortcuts, ONLY the shortcut matches —
// /megaera returns nothing; /meg returns Skull Earring.
const KEEPSAKES = [
  { name: 'Adamant Arrowhead', emoji: '🏹', characters: ['artemis'] },
  { name: 'Adamant Shard', emoji: '🌋', characters: ['heph'] },
  { name: 'Aromatic Phial', emoji: '🌺', characters: ['narcissus'] },
  { name: 'Barley Sheaf', emoji: '🌾', characters: ['demeter'] },
  { name: 'Beautiful Mirror', emoji: '🪞', characters: ['aphro'] },
  { name: 'Black Shawl', emoji: '🌙', characters: ['nyx'] },
  { name: 'Blackened Fleece', emoji: '🕋', characters: ['medea'] },
  { name: 'Blood-filled Vial', emoji: '🩸', characters: ['ares'] },
  { name: 'Bone Hourglass', emoji: '⏳', characters: ['charon'] },
  { name: 'Broken Spearpoint', emoji: '🗡', characters: ['patroclus'] },
  { name: 'Calling Card', emoji: '☎️', characters: ['zag'] },
  { name: 'Cloud Bangle', emoji: '⛈️', characters: ['zeus'] },
  { name: 'Concave Stone', emoji: '🪨', characters: ['echo'] },
  { name: 'Conch Shell', emoji: '🐚', characters: ['poseidon'] },
  { name: 'Cosmic Egg', emoji: '🥚', characters: ['chaos'] },
  { name: 'Crystal Figurine', emoji: '🐷', characters: ['circe'] },
  { name: 'Cthonic Coin Purse', emoji: '👛', characters: ['hypnos'] },
  { name: 'Discordant Bell', emoji: '🛎️', characters: ['eris'] },
  { name: 'Distant Memory', emoji: '🎼', characters: ['orpheus'] },
  { name: 'Engraved Pin', emoji: '🧷', characters: ['moros'] },
  { name: 'Eternal Rose', emoji: '🌹', characters: ['aphro'] },
  { name: 'Evergreen Acorn', emoji: '🎇', characters: ['eurydice'] },
  { name: 'Everlasting Ember', emoji: '🔥', characters: ['hestia'] },
  { name: 'Evil Eye', emoji: '👁️', characters: ['nem'] },
  { name: 'Experimental Hammer', emoji: '🔨', characters: ['icarus'] },
  { name: 'Fig Leaf', emoji: '🌿', characters: ['dio'] },
  { name: 'Frostbitten Horn', emoji: '❄️', characters: ['demeter'] },
  { name: 'Ghost Onion', emoji: '🧅', characters: ['dora'] },
  { name: 'Gold Purse', emoji: '👜', characters: ['charon'] },
  { name: "Gorgon's Amulet", emoji: '📿', characters: ['athena'] },
  { name: 'Harmonic Photon', emoji: '📯', characters: ['apollo'] },
  { name: 'Harpy Feather Duster', emoji: '🧼', characters: ['dusa'] },
  { name: 'Iridescent Fan', emoji: '💒', characters: ['hera'] },
  // Jeweled Pom belongs to both Persephone and Hades — matches either alias.
  { name: 'Jeweled Pom', emoji: '💎', characters: ['persephone', 'hades'] },
  { name: 'Knuckle Bones', emoji: '🦴', characters: ['odysseus'] },
  { name: 'Lambent Plume', emoji: '🪶', characters: ['hermes'] },
  { name: 'Lion Fang', emoji: '🦁', characters: ['heracles'] },
  { name: 'Lucky Tooth', emoji: '🦷', characters: ['skelly'] },
  { name: 'Luckier Tooth', emoji: '🦷', characters: ['skelly'] },
  { name: 'Metallic Droplet', emoji: '🪙', characters: ['hermes'] },
  { name: 'Moon Beam', emoji: '🌙', characters: ['selene'] },
  { name: 'Myrmidon Bracer', emoji: '🛡', characters: ['achilles'] },
  { name: 'Old Spiked Collar', emoji: '🐾', characters: ['cerberus'] },
  { name: 'Overflowing Cup', emoji: '🍹', characters: ['dio'] },
  { name: 'Owl Pendant', emoji: '🦉', characters: ['athena'] },
  { name: 'Pierced Butterfly', emoji: '🦋', characters: ['than'] },
  { name: 'Pom Blossom', emoji: '🌺', characters: ['persephone'] },
  { name: 'Shattered Shackle', emoji: '🔐', characters: ['sisyphus'] },
  { name: 'Sigil of the Dead', emoji: '☠️', characters: ['hades'] },
  { name: 'Silken Sash', emoji: '🧣', characters: ['arachne'] },
  { name: 'Silver Wheel', emoji: '🛞', characters: ['hecate'] },
  { name: 'Skull Earring', emoji: '💍', characters: ['meg'] },
  { name: 'Sword Hilt', emoji: '⚔️', characters: ['ares'] },
  { name: 'Thunder Signet', emoji: '⚡️', characters: ['zeus'] },
  { name: 'Time Piece', emoji: '🕰️', characters: ['chronos'] },
  { name: 'Transcendent Embryo', emoji: '🍳', characters: ['chaos'] },
  { name: 'Vivid Sea', emoji: '🌊', characters: ['poseidon'] },
  { name: 'White Antler', emoji: '🦌', characters: ['artemis'] },
];

// Topic prompts shown as chips under the textarea once a Keepsake is selected.
// Combines the user's originals with mythologically/game-grounded additions.
const TOPICS = {
  'Adamant Arrowhead': ['excitability', 'indignation', 'critical eye', 'the hunt', 'traps', 'solitude', 'nature', 'wildlife', 'independence', 'tracking'],
  'Adamant Shard': ['masonry', 'weapons', 'tuning', 'fine-tuning', 'calibration', 'refinement', 'building', 'fixing', 'perfectionism', 'blue-collar work', 'dedication'],
  'Aromatic Phial': ['self-pride', 'ego', 'reflection', 'fountains', 'leveling up', 'vanity', 'looking inward', 'mirrors', 'beauty rituals', 'social media'],
  'Barley Sheaf': ['holding grudges', 'unforgiving moods', 'emotional instability', 'seasonality', 'bitterness', 'grief', 'longing for absent loved ones', 'harvest', 'cold snaps'],
  'Beautiful Mirror': ['appreciating beauty', 'small pleasures', 'beauty', 'love', 'charm', 'affection', 'romance', 'self-care'],
  'Black Shawl': ['grave shift', 'nights', 'motherhood', 'stillness', 'mystery', 'dignity'],
  'Blackened Fleece': ['curses', 'experimentation', 'herbalism', 'alchemy', 'betrayal', 'revenge'],
  'Blood-filled Vial': ['anger', 'rage', 'war', 'conflict', 'violence', 'frustration', 'confrontation', 'aggression'],
  'Bone Hourglass': ['finiteness', 'scarcity', 'travel', 'exchange', 'tradeoff', 'transactions', 'crossings', 'transitions', 'gruff service'],
  'Broken Spearpoint': ['risk', 'reunion', 'impulse', 'friendship', 'loss', 'longing', 'regret', 'reconciliation', 'depression'],
  'Calling Card': ['business', 'professional matters', 'House business', 'leveling up', 'persistence', 'rebellion', 'escapes', 'getting up after failure', 'family reconciliation'],
  'Cloud Bangle': ['leadership', 'initiative', 'authority', 'decrees', 'ego', 'storms'],
  'Concave Stone': ['déjà vu', 'repeated sayings', 'being misunderstood', 'mimicry', 'sound', 'listening', 'repeating yourself'],
  'Conch Shell': ['weather', 'climate', 'water', 'swimming', 'beaches', 'breakthroughs', 'jovial energy'],
  'Cosmic Egg': ['existential instability', 'options', 'indecision', 'beginnings', 'potential', 'gambles', 'sacrifice for reward'],
  'Crystal Figurine': ['transformation', 'deceptive hospitality', 'enchantment', 'solitude', 'herbs and potions', 'domesticity', 'feasts'],
  'Cthonic Coin Purse': ['money', 'finances', 'dreams', 'sleep', 'naps', 'drowsiness', 'indolence', 'missed alarms', 'daydreaming'],
  'Discordant Bell': ['doors', 'disagreements', 'mischief', 'sowing chaos', 'troublemaking', 'thresholds', 'apple of discord'],
  'Distant Memory': ['nostalgia', 'music', 'longing', 'lost love', 'poetry', 'the past'],
  'Engraved Pin': ['doom', 'deadlines', 'foreboding', 'dread', 'anxiety', 'accepting fate', 'mortality'],
  'Eternal Rose': ['appreciating beauty', 'small pleasures', 'beauty', 'love', 'charm', 'affection', 'romance', 'self-care'],
  'Evergreen Acorn': ['inspiration', 'cooking', 'music', 'contentment', 'peace', 'healing', 'solitude in nature', 'hosting'],
  'Everlasting Ember': ['fire', 'home', 'warmth', 'hospitality', 'family meals', 'comfort'],
  'Evil Eye': ['retribution', 'revenge', 'rivalry', 'fairness', 'justice', 'balance', 'karma', 'comeuppance'],
  'Experimental Hammer': ['ingenuity', 'invention', 'flight', 'soaring', 'taking off', 'hubris', 'ambition', 'overreach', 'warnings unheeded', 'daring projects'],
  'Fig Leaf': ['celebration', 'achievement', 'parties', 'anniversaries', 'beverages', 'taking a load off', 'hedonism', 'indulgence', 'friends', 'joy', 'intoxication', 'festivals'],
  'Frostbitten Horn': ['holding grudges', 'unforgiving moods', 'emotional instability', 'seasonality', 'bitterness', 'grief', 'longing for absent loved ones', 'harvest', 'cold snaps'],
  'Ghost Onion': ['decoration', 'homemaking', 'apathy', 'feng shui', 'listlessness', 'haunted spaces', 'eerie atmospheres', 'roommates', 'hosting', 'gossip', 'daily routine'],
  'Gold Purse': ['finiteness', 'scarcity', 'travel', 'exchange', 'tradeoff', 'shopping', 'finances', 'transactions', 'crossings', 'transitions', 'gruff service'],
  "Gorgon's Amulet": ['stratagem', 'foresight', 'retrospection', 'wisdom', 'planning', 'defense', 'problem-solving', 'learning'],
  'Harmonic Photon': ['hope', 'optimism', 'sun', 'music', 'art', 'healing', 'prophecy', 'sunny days', 'performance'],
  'Harpy Feather Duster': ['work-life balance', 'tidiness', 'organization', 'toil', 'food prep', 'eating', 'cleaning', 'shyness', 'anxiety', 'gratitude for service workers'],
  'Iridescent Fan': ['dating', 'courtship', 'being partnered', 'children', 'ceremony', 'rites', 'weddings', 'family events', 'formal occasions', 'jealousy', 'traditional rites'],
  'Jeweled Pom': ['blessings', 'fruit', 'reconciliation', 'partnership', 'marriage', 'gift-giving'],
  'Knuckle Bones': ['commutes', 'journeys', 'tactics', 'cleverness', 'problem-solving', 'homecoming', 'deception'],
  'Lambent Plume': ['physical agility', 'quick thinking', 'haste', 'swiftness of response', 'emergency response', 'urgent fires', 'deliveries', 'packages', 'errands run', 'messages', 'communication', 'schedules', 'multitasking'],
  'Lion Fang': ['interruption', 'getting pulled away mid-task', 'toil', 'labor', 'resentment', 'cleanup', 'payment', 'compensation', 'bills paid', 'earned rewards', 'tasks', 'atonement', 'repetitive chores', 'brute force'],
  'Lucky Tooth': ['luck', 'chance', 'practice', 'getting back up', 'resilience', 'taking hits'],
  'Luckier Tooth': ['luck', 'chance', 'practice', 'getting back up', 'resilience', 'taking hits'],
  'Metallic Droplet': ['physical agility', 'quick thinking', 'haste', 'swiftness of response', 'emergency response', 'urgent fires', 'deliveries', 'packages', 'errands run', 'messages', 'communication', 'schedules', 'multitasking'],
  'Moon Beam': ['celestial events', 'lunar new year', 'moonlight', 'cycles', 'phases', 'contemplation', 'romance under moonlight'],
  'Myrmidon Bracer': ['calls to arms', 'defeat', 'teamwork', 'weaknesses', 'rashness', 'mentorship', 'heroism', 'pride'],
  'Old Spiked Collar': ['friendship', 'pets', 'mood swings', 'irritability', 'tears', 'grieving', 'mourning', 'crying', 'emotional moments', 'guarding', 'loyalty', 'multiple perspectives'],
  'Overflowing Cup': ['celebration', 'achievement', 'parties', 'anniversaries', 'beverages', 'taking a load off', 'hedonism', 'indulgence', 'friends', 'joy', 'intoxication', 'festivals'],
  'Owl Pendant': ['stratagem', 'foresight', 'retrospection', 'wisdom', 'planning', 'defense', 'problem-solving', 'learning'],
  'Pierced Butterfly': ['perfect execution', 'endurance', 'vitality', 'tight deadlines', 'reliability', 'precision', 'finality', 'transformation', 'focus'],
  'Pom Blossom': ['personal growth', 'development', 'mom', 'returning home', 'sacrifice for family', 'choices', 'springtime'],
  'Shattered Shackle': ['helplessness', 'routine', 'persistence', 'breaking free', 'finding joy in repetition', 'peace with routine'],
  'Sigil of the Dead': ['home', 'secrets', 'secretive matters', 'secrecy', 'dad', 'authority', 'sternness', 'paperwork', 'household management', 'gradual warming'],
  'Silken Sash': ['armor', 'crafts', 'clothing', 'weaving', 'sewing', 'knitting', 'fabric crafts', 'hubris'],
  'Silver Wheel': ['things that happen thrice', 'triple déjà vu', 'magic', 'teachings', 'craft', 'mentorship', 'crossroads', 'witchcraft', 'transitions'],
  'Skull Earring': ['competition', 'rivalry', 'work', 'work pressure', 'work performance', 'discipline', 'duty', 'punishment', 'intimidation', 'fierce love'],
  'Sword Hilt': ['anger', 'rage', 'war', 'conflict', 'violence', 'frustration', 'confrontation', 'aggression'],
  'Thunder Signet': ['leadership', 'initiative', 'authority', 'decrees', 'ego', 'storms'],
  'Time Piece': ['time', 'selling items', 'monetary windfalls', 'aging', 'time passing', 'scheduling', 'urgency'],
  'Transcendent Embryo': ['existential instability', 'options', 'indecision', 'beginnings', 'potential', 'gambles', 'sacrifice for reward'],
  'Vivid Sea': ['weather', 'climate', 'water', 'swimming', 'beaches', 'breakthroughs', 'jovial energy'],
  'White Antler': ['excitability', 'indignation', 'critical eye', 'the hunt', 'traps', 'solitude', 'nature', 'wildlife', 'independence', 'tracking'],
};

// Shortcuts for the slash search are stored as aliases; map them back to
// display names for the LLM context (everything else just gets capitalized).
const CHARACTER_DISPLAY = {
  heph: 'Hephaestus',
  meg: 'Megaera',
  than: 'Thanatos',
  aphro: 'Aphrodite',
  dio: 'Dionysus',
  nem: 'Nemesis',
  zag: 'Zagreus',
};

function characterDisplay(alias) {
  return CHARACTER_DISPLAY[alias] || alias.charAt(0).toUpperCase() + alias.slice(1);
}

// Pre-built reference catalog sent to the LLM. Built once at module load.
const KEEPSAKE_CONTEXT = KEEPSAKES.map((k) => {
  const chars = k.characters.map(characterDisplay).join(' & ');
  const topics = (TOPICS[k.name] || []).join(', ');
  return `- ${k.name} (${chars}) ${k.emoji}: ${topics}`;
}).join('\n');

const SUGGESTION_SYSTEM_PROMPT = `You help someone pick a Hades / Hades II Keepsake sticker that fits the theme of a journal entry. They keep a microblog where each entry is tagged with a Keepsake whose mythological character or in-game mechanic resonates with what happened.

Here is the full catalog of 58 Keepsakes, their character(s), and the user's curated thematic associations:

${KEEPSAKE_CONTEXT}

Given the user's title and entry, return up to 4 Keepsake suggestions ranked from best to worst fit. Read the entry holistically — pick up on emotional tone, figurative language, and context, not just keyword overlap. Reference the character's mythology or the game mechanic in your reasoning.

Rules:
- Use exact Keepsake names from the catalog above.
- Prefer variety: avoid suggesting both Keepsakes from the same character unless they have meaningfully different fits.
- Each reason should be 1–2 sentences, specific, and tie back to mythology or the game.
- If the entry is too short, vague, or empty to interpret, return an empty list.

Return ONLY valid JSON in this exact shape, with no preamble or markdown fences:
{"suggestions":[{"keepsake":"Exact Keepsake Name","reason":"..."}]}`;

// Suggestions run through the `suggest-keepsakes` Supabase Edge Function,
// which holds the Anthropic API key server-side. Toggle in src/config.js.
const SUGGESTIONS_ENABLED = ENABLE_SUGGESTIONS;

async function fetchKeepsakeSuggestions(title, content, unavailable, signal) {
  const unavailableBlock =
    unavailable && unavailable.length > 0
      ? '\n\nIMPORTANT: The following Keepsakes have already been used in the current cycle and MUST NOT be suggested:\n' +
        unavailable.map((n) => '- ' + n).join('\n')
      : '';

  const userMessage =
    SUGGESTION_SYSTEM_PROMPT +
    unavailableBlock +
    '\n\n---\n\nTitle: ' +
    (title || '(no title yet)') +
    '\n\nEntry:\n' +
    (content || '(empty)');

  // The Edge Function holds the Anthropic API key and relays the request.
  const { data, error } = await supabase.functions.invoke('suggest-keepsakes', {
    body: { userMessage },
    signal,
  });
  if (error) {
    throw new Error('Suggestion service: ' + (error.message || String(error)));
  }
  if (data?.error) {
    throw new Error('Suggestion service: ' + String(data.error).slice(0, 200));
  }

  if (!Array.isArray(data?.content)) {
    throw new Error(
      'Unexpected response shape: ' + JSON.stringify(data).slice(0, 200)
    );
  }

  const text = data.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  // Tolerate any preamble Claude might add despite instructions — extract from
  // the first { to the last }.
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first === -1 || last === -1 || last < first) {
    throw new Error('No JSON object in response: ' + text.slice(0, 100));
  }
  const jsonStr = text.slice(first, last + 1);

  const parsed = JSON.parse(jsonStr);
  return Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Cycles are two-month periods that start on the first of every odd-numbered
// month (Jan, Mar, May, Jul, Sep, Nov). Used to scope unique-Keepsake checks.
// An entry's cycle is determined by its datetime, not when it was written.
function getCycleKey(dateInput) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  const startMonth = d.getMonth() - (d.getMonth() % 2);
  return d.getFullYear() + '-' + startMonth;
}

function getCycleLabel(dateInput) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const startMonth = d.getMonth() - (d.getMonth() % 2);
  return MONTHS[startMonth] + '–' + MONTHS[startMonth + 1] + ' ' + d.getFullYear();
}

// Parse title and entry text for @mentions and standard markdown.
// Supported: @name, @{Multi Word Name} → blue (the @ itself is not rendered);
// **text** → bold; *text* → italic. Styles do not span newlines; no nesting.
// Bold must come before italic in the alternation so ** matches greedily.
const RICH_TEXT_PATTERN =
  /@\{([^}]+)\}|@([A-Za-z0-9][A-Za-z0-9_-]*)|\*\*([^*\n]+?)\*\*|\*([^*\n]+?)\*/g;

function renderRichText(text) {
  if (!text) return null;
  const out = [];
  let lastIndex = 0;
  let key = 0;
  RICH_TEXT_PATTERN.lastIndex = 0;
  let match;
  while ((match = RICH_TEXT_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push(text.substring(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      out.push(
        <span key={key++} style={{ color: '#0066cc' }}>{match[1]}</span>
      );
    } else if (match[2] !== undefined) {
      out.push(
        <span key={key++} style={{ color: '#0066cc' }}>{match[2]}</span>
      );
    } else if (match[3] !== undefined) {
      out.push(<strong key={key++}>{match[3]}</strong>);
    } else if (match[4] !== undefined) {
      out.push(<em key={key++}>{match[4]}</em>);
    }
    lastIndex = RICH_TEXT_PATTERN.lastIndex;
  }
  if (lastIndex < text.length) {
    out.push(text.substring(lastIndex));
  }
  return out;
}

function formatDateTime(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}  ${hour}:${minute}`;
}

function nowLocalString() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

/* ============================================================
   Year in Pixels — mood model, ported from the standalone HTML.
   Moods are keyed by day-of-year (1–365) for 2026. A day holds
   up to two mood ids; two moods render as an edge-to-edge
   left-to-right gradient, matching the tracker exactly.
   ============================================================ */

const MOODS = [
  { id: 'happy',     label: 'Happy',     hex: '#68CDC4' },
  { id: 'motivated', label: 'Motivated', hex: '#D74893' },
  { id: 'ok',        label: 'OK',        hex: '#C6CD55' },
  { id: 'meh',       label: 'Meh',       hex: '#FFF991' },
  { id: 'tired',     label: 'Tired',     hex: '#FFC12A' },
  { id: 'stressed',  label: 'Stressed',  hex: '#FF6E12' },
  { id: 'angry',     label: 'Angry',     hex: '#FA6610' },
  { id: 'apathetic', label: 'Apathetic', hex: '#FFEAC6' },
  { id: 'sad',       label: 'Sad',       hex: '#007EB4' },
  { id: 'sick',      label: 'Sick',      hex: '#F3889E' },
];

const moodById = (id) => MOODS.find((m) => m.id === id);

// Moods are stored in Supabase as one JSON map per year:
// { [dayOfYear]: [moodId, moodId?] } — see src/db.js.

// One Date per day of 2026, so tooltips can show the weekday.
const DAYS_2026 = (() => {
  const out = [];
  const start = new Date(2026, 0, 1);
  for (let i = 0; i < 365; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    out.push(d);
  }
  return out;
})();

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function fmtTrackerDate(d) {
  return (
    WEEKDAYS[d.getDay()] +
    ' ' +
    String(d.getDate()).padStart(2, '0') +
    ' ' +
    MONTHS[d.getMonth()] +
    ' ' +
    d.getFullYear()
  );
}

// Map an entry's datetime to its 2026 day-of-year (1–365), or null if the
// entry isn't in 2026. This is the bridge between a log entry and its pixel.
function dayOfYear2026(datetime) {
  const d = new Date(datetime);
  if (isNaN(d.getTime()) || d.getFullYear() !== 2026) return null;
  const start = new Date(2026, 0, 1);
  const atMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const n = Math.round((atMidnight - start) / 86400000) + 1;
  return n >= 1 && n <= 365 ? n : null;
}

function luminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function textColorForMoods(moods) {
  if (!moods || !moods.length) return null;
  const avg =
    moods.length === 1
      ? luminance(moodById(moods[0]).hex)
      : (luminance(moodById(moods[0]).hex) + luminance(moodById(moods[1]).hex)) / 2;
  return avg > 160 ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.92)';
}

// Edge-to-edge fill: solid for one mood, left→right linear gradient for two.
function drawGradientCircle(canvas, moods, size) {
  const ctx = canvas.getContext('2d');
  canvas.width = size;
  canvas.height = size;
  ctx.clearRect(0, 0, size, size);
  if (!moods || !moods.length) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();
  if (moods.length === 1) {
    ctx.fillStyle = moodById(moods[0]).hex;
    ctx.fillRect(0, 0, size, size);
  } else {
    const grad = ctx.createLinearGradient(0, 0, size, 0);
    grad.addColorStop(0, moodById(moods[0]).hex);
    grad.addColorStop(1, moodById(moods[1]).hex);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  ctx.restore();
}

/* ---- Shared mouse-following tooltip (one instance for the whole app) ---- */

const TooltipContext = React.createContext(null);

function TooltipLayer({ children }) {
  const [tip, setTip] = useState(null); // { x, y, date, moods }
  const api = useRef({
    show(e, date, moods) {
      setTip({ x: e.clientX, y: e.clientY, date, moods });
    },
    move(e) {
      setTip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t));
    },
    hide() {
      setTip(null);
    },
  }).current;

  useEffect(() => {
    function onMove(e) {
      api.move(e);
    }
    if (tip) {
      window.addEventListener('mousemove', onMove);
      return () => window.removeEventListener('mousemove', onMove);
    }
  }, [tip, api]);

  return (
    <TooltipContext.Provider value={api}>
      {children}
      {tip && <MoodTooltip {...tip} />}
    </TooltipContext.Provider>
  );
}

function MoodTooltip({ x, y, date, moods }) {
  let left = x + 14;
  let top = y - 36;
  if (typeof window !== 'undefined' && left + 170 > window.innerWidth) {
    left = x - 180;
  }
  const moodText =
    moods && moods.length
      ? moods.map((id) => moodById(id).label).join(' + ')
      : 'No mood logged';
  return (
    <div
      className="fixed pointer-events-none rounded-md bg-white border border-gray-200 shadow-lg px-3 py-2 text-xs text-gray-900 whitespace-nowrap"
      style={{ left, top, zIndex: 1000 }}
    >
      <div className="font-medium mb-0.5">{fmtTrackerDate(date)}</div>
      <div className="text-gray-500">{moodText}</div>
    </div>
  );
}

/* ---- Reusable mood pixel (tracker grid, log rows, and modal preview) ---- */

function MoodCircle({
  day,
  moods,
  size = 24,
  fontSize = 10,
  onClick = null,
  hoverScale = false,
  showTooltip = true,
}) {
  const canvasRef = useRef(null);
  const [hover, setHover] = useState(false);
  const tip = useContext(TooltipContext);

  useEffect(() => {
    if (canvasRef.current) drawGradientCircle(canvasRef.current, moods, size);
  }, [moods, size]);

  const colored = !!(moods && moods.length);
  const date = day ? DAYS_2026[day - 1] : null;

  return (
    <div
      className="relative flex-shrink-0"
      style={{
        width: size,
        height: size,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform .1s',
        transform: hoverScale && hover ? 'scale(1.3)' : 'none',
        zIndex: hoverScale && hover ? 2 : 'auto',
      }}
      onClick={onClick || undefined}
      onMouseEnter={() => setHover(true)}
      onMouseMove={(e) => {
        if (showTooltip && tip && date) tip.show(e, date, moods);
      }}
      onMouseLeave={() => {
        setHover(false);
        if (showTooltip && tip) tip.hide();
      }}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="absolute inset-0 rounded-full"
        style={{ width: size, height: size }}
      />
      <div
        className="absolute inset-0 rounded-full flex items-center justify-center"
        style={{
          border: colored
            ? '1px solid transparent'
            : '1px solid ' + (onClick && hover ? '#9aa0ab' : '#bcc2cb'),
          transition: 'border-color .1s',
        }}
      >
        {day != null && (
          <span
            style={{
              fontSize,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: '-0.3px',
              position: 'relative',
              zIndex: 2,
              pointerEvents: 'none',
              transition: 'color .1s',
              color: colored
                ? textColorForMoods(moods)
                : onClick && hover
                ? '#4b5563'
                : '#6b7280',
            }}
          >
            {day}
          </span>
        )}
      </div>
    </div>
  );
}

/* ---- Day editor (same chip palette + live preview as the tracker) ---- */

function MoodModal({ day, initialMoods, onSave, onClose }) {
  const [selected, setSelected] = useState(initialMoods || []);

  function toggle(id) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      const next = [...prev];
      if (next.length >= 2) next.shift();
      next.push(id);
      return next;
    });
  }

  const date = DAYS_2026[day - 1];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 500, background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-lg border border-gray-200 p-6"
        style={{ width: 380, maxWidth: '92vw' }}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-medium text-gray-900">
            Day {day} — {fmtTrackerDate(date)}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded px-1.5 leading-none text-xl"
          >
            ×
          </button>
        </div>
        <div className="text-xs text-gray-500 mb-4">Select up to 2 moods</div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {MOODS.map((m) => {
            const sel = selected.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggle(m.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors"
                style={{
                  border: '1.5px solid ' + (sel ? m.hex : '#e5e7eb'),
                  background: sel ? m.hex + '22' : 'transparent',
                }}
              >
                <span
                  className="rounded-full flex-shrink-0"
                  style={{ width: 18, height: 18, background: m.hex }}
                />
                <span className="flex-1 text-xs text-gray-900">{m.label}</span>
                <span
                  className="rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 15,
                    height: 15,
                    fontSize: 8,
                    background: sel ? m.hex : 'transparent',
                    border: sel ? '1.5px solid transparent' : '1.5px solid #d1d5db',
                    color: '#fff',
                  }}
                >
                  {sel ? '✓' : ''}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-md">
          <MoodCircle
            day={day}
            moods={selected}
            size={44}
            fontSize={12}
            showTooltip={false}
          />
          <div className="text-xs text-gray-500">
            {selected.length ? (
              <>
                <span
                  className="block font-medium text-gray-900"
                  style={{ fontSize: 13 }}
                >
                  {selected.map((id) => moodById(id).label).join(' + ')}
                </span>
                How day {day} will appear
              </>
            ) : (
              <>
                <span
                  className="block font-medium text-gray-900"
                  style={{ fontSize: 13 }}
                >
                  No mood selected
                </span>
                Pick a mood to preview
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSelected([])}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 hover:bg-gray-50 rounded-md transition-colors"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => onSave(day, selected)}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-md transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- Tracker tab: 14-wide grid of 364 + the lone day 365 ---- */

// True on phone-width viewports. Used for label/layout choices in JS, since
// this runtime's Tailwind only ships core classes (no responsive variants).
function useIsNarrow(max = 520) {
  const [narrow, setNarrow] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= max : false
  );
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth <= max);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [max]);
  return narrow;
}

// True only when the device has a real hovering pointer (a mouse). On touch,
// hover tooltips are just a synthesized flash before the tap opens the editor,
// so we suppress them there.
function useHoverCapable() {
  const query = '(hover: hover) and (pointer: fine)';
  const read = () =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(query).matches
      : true;
  const [can, setCan] = useState(read);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    const onChange = () => setCan(mq.matches);
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);
  return can;
}

function TrackerTab({ moodData, onOpenMood }) {
  const days = [];
  for (let i = 1; i <= 364; i++) days.push(i);

  // Size the 14-wide grid to the available width so it never needs horizontal
  // scrolling. Circles cap at 24px (desktop) and shrink on phones to fit. The
  // inner wrapper's 6px padding (each side) is reserved for hover scale-up.
  const rootRef = useRef(null);
  const [cell, setCell] = useState(24);
  const GAP = 6;
  const PAD = 6;

  useEffect(() => {
    function measure() {
      const w = rootRef.current?.clientWidth;
      if (!w) return;
      const avail = w - PAD * 2; // usable width inside the padded wrapper
      // -2 safety so rounding never tips into a scrollbar.
      const size = Math.max(14, Math.min(24, Math.floor((avail - 13 * GAP - 2) / 14)));
      setCell(size);
    }
    measure();
    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro && rootRef.current) ro.observe(rootRef.current);
    window.addEventListener('resize', measure);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const fontSize = Math.max(7, Math.round(cell * 0.42));
  const canHover = useHoverCapable();

  return (
    <div ref={rootRef}>
      <div
        className="text-gray-900 mb-5"
        style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em' }}
      >
        Year in Pixels
      </div>
      <div style={{ padding: PAD, overflow: 'hidden', boxSizing: 'border-box' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(14, ${cell}px)`,
            gap: GAP,
          }}
        >
          {days.map((n) => (
            <MoodCircle
              key={n}
              day={n}
              moods={moodData[n]}
              size={cell}
              fontSize={fontSize}
              hoverScale
              showTooltip={canHover}
              onClick={() => onOpenMood(n)}
            />
          ))}
        </div>
        <div className="flex mt-1.5" style={{ gap: GAP }}>
          <MoodCircle
            day={365}
            moods={moodData[365]}
            size={cell}
            fontSize={fontSize}
            hoverScale
            showTooltip={canHover}
            onClick={() => onOpenMood(365)}
          />
        </div>
      </div>
    </div>
  );
}

/* ---- Summary tab: counts, bar chart, switchable pie ---- */

function SummaryTab({ moodData }) {
  const [mode, setMode] = useState('bar');

  const { counts, totalDays } = useMemo(() => {
    const c = {};
    MOODS.forEach((m) => (c[m.id] = 0));
    let t = 0;
    Object.values(moodData).forEach((arr) => {
      if (!arr || !arr.length) return;
      t++;
      arr.forEach((id) => {
        if (c[id] !== undefined) c[id]++;
      });
    });
    return { counts: c, totalDays: t };
  }, [moodData]);

  const max = Math.max(1, ...Object.values(counts));

  return (
    <div>
      <div className="text-gray-500 mb-3" style={{ fontSize: 13 }}>
        {totalDays} day{totalDays !== 1 ? 's' : ''} logged so far
      </div>

      <div
        className="mb-6"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 10,
        }}
      >
        {MOODS.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-2.5 bg-gray-50 rounded-md p-3"
          >
            <span
              className="w-6 h-6 rounded-full flex-shrink-0"
              style={{ background: m.hex }}
            />
            <div>
              <div className="font-medium text-gray-900" style={{ fontSize: 13 }}>
                {m.label}
              </div>
              <div className="text-xs text-gray-500">
                {counts[m.id]} day{counts[m.id] !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-900" style={{ fontSize: 15 }}>
          Mood frequency
        </h3>
        <div className="flex gap-2">
          {['bar', 'pie'].map((mk) => (
            <button
              key={mk}
              type="button"
              onClick={() => setMode(mk)}
              className={
                'px-4 py-1.5 text-xs font-medium rounded-md border transition-colors ' +
                (mode === mk
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50')
              }
            >
              {mk === 'bar' ? 'Bar' : 'Pie'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'bar' ? (
        <div>
          {MOODS.map((m) => {
            const pct = Math.round((counts[m.id] / max) * 100);
            return (
              <div key={m.id} className="flex items-center gap-2.5 mb-2.5">
                <div className="w-20 text-xs text-gray-500 flex-shrink-0">
                  {m.label}
                </div>
                <div className="flex-1 h-3.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: pct + '%', background: m.hex }}
                  />
                </div>
                <div className="w-8 text-right text-xs text-gray-500 flex-shrink-0 tabular-nums">
                  {counts[m.id]}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <MoodPie counts={counts} />
      )}
    </div>
  );
}

function MoodPie({ counts }) {
  const entries = MOODS.filter((m) => counts[m.id] > 0).map((m) => ({
    ...m,
    count: counts[m.id],
  }));
  const total = entries.reduce((s, e) => s + e.count, 0);

  if (total === 0) {
    return (
      <p className="text-gray-500" style={{ fontSize: 13 }}>
        No data yet — log some days first.
      </p>
    );
  }

  const size = 200;
  const cx = 100;
  const cy = 100;
  const r = 90;
  let start = -Math.PI / 2;
  const paths = [];
  entries.forEach((e, i) => {
    const pct = Math.round((e.count / total) * 100);
    const labelFill =
      luminance(e.hex) > 160 ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.9)';

    // A single mood at 100% is a full circle. An SVG arc whose start and end
    // points coincide collapses to nothing, so draw a plain circle instead and
    // center the label.
    if (e.count === total) {
      paths.push(
        <circle key={'c' + i} cx={cx} cy={cy} r={r} fill={e.hex} stroke="#fff" strokeWidth="1.5" />
      );
      paths.push(
        <text
          key={'t' + i}
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="14"
          fontWeight="700"
          fill={labelFill}
        >
          {pct}%
        </text>
      );
      return;
    }

    const angle = (e.count / total) * Math.PI * 2;
    const end = start + angle;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const large = angle > Math.PI ? 1 : 0;
    const mid = start + angle / 2;
    paths.push(
      <path
        key={'p' + i}
        d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`}
        fill={e.hex}
        stroke="#fff"
        strokeWidth="1.5"
      />
    );
    if (pct >= 5) {
      const lx = cx + r * 0.65 * Math.cos(mid);
      const ly = cy + r * 0.65 * Math.sin(mid);
      paths.push(
        <text
          key={'t' + i}
          x={lx}
          y={ly}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="12"
          fontWeight="700"
          fill={labelFill}
        >
          {pct}%
        </text>
      );
    }
    start = end;
  });

  return (
    <div className="flex items-start gap-6 flex-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
        {paths}
      </svg>
      <div className="flex flex-col gap-2">
        {entries.map((e) => (
          <div key={e.id} className="flex items-center gap-2 text-xs text-gray-500">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ background: e.hex }}
            />
            {e.label}{' '}
            <span className="ml-1 font-medium text-gray-900">{e.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Reusable shared styles
const inputBase =
  'w-full px-3 py-2 bg-white border border-gray-300 rounded text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900';

const labelBase = 'block text-xs font-medium text-gray-600 mb-1.5';

function KeepsakeSelector({ value, onChange, usedNames }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hl, setHl] = useState(0);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const used = usedNames || new Set();

  // The active list excludes anything used in the current cycle, except the
  // already-selected Keepsake so that edits can see what they currently have.
  const availableKeepsakes = useMemo(
    () => KEEPSAKES.filter((k) => !used.has(k.name) || k.name === value?.name),
    [used, value?.name]
  );

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    setHl(0);
  }, [query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return availableKeepsakes;
    if (q.startsWith('/')) {
      const c = q.slice(1);
      if (!c) return availableKeepsakes;
      return availableKeepsakes.filter((k) => k.characters.some((alias) => alias.startsWith(c)));
    }
    return availableKeepsakes.filter((k) => k.name.toLowerCase().includes(q));
  }, [query, availableKeepsakes]);

  function pick(k) {
    onChange(k);
    setOpen(false);
    setQuery('');
  }

  function onKey(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHl((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHl((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[hl]) {
      e.preventDefault();
      pick(filtered[hl]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  }

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${hl}"]`);
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }, [hl]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white border border-gray-300 hover:border-gray-400 rounded text-left transition-colors focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
      >
        {value ? (
          <span className="flex items-center gap-2.5">
            <span className="text-xl leading-none">{value.emoji}</span>
            <span className="text-gray-900 text-sm">{value.name}</span>
          </span>
        ) : (
          <span className="text-gray-400 text-sm">Select a Keepsake…</span>
        )}
        <span className="flex items-center gap-1 text-gray-400">
          {value && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear selection"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange(null);
                }
              }}
              className="p-0.5 hover:text-gray-700 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKey}
              placeholder="Search or type /character"
              className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none text-base"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div ref={listRef} className="max-h-72 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-400 text-sm">
                No Keepsakes found
              </div>
            ) : (
              filtered.map((k, idx) => {
                const isHl = idx === hl;
                const isSelected = value?.name === k.name;
                return (
                  <button
                    key={k.name}
                    data-idx={idx}
                    type="button"
                    onClick={() => pick(k)}
                    onMouseEnter={() => setHl(idx)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors border-l-2 ${
                      isHl ? 'bg-gray-50' : ''
                    } ${
                      isSelected ? 'border-gray-900' : 'border-transparent'
                    }`}
                  >
                    <span className="text-lg leading-none">{k.emoji}</span>
                    <span className="text-gray-900 text-sm">{k.name}</span>
                  </button>
                );
              })
            )}
          </div>
          <div className="px-3 py-1.5 border-t border-gray-200 text-xs text-gray-500">
            Try{' '}
            <span className="text-gray-700 font-mono">/meg</span>,{' '}
            <span className="text-gray-700 font-mono">/aphro</span>,{' '}
            <span className="text-gray-700 font-mono">/zag</span>…
          </div>
        </div>
      )}
    </div>
  );
}

// Shared form used both for creating a new entry and editing an existing one.
function EntryForm({ initial, entries, onSave, onCancel, submitLabel = 'Add to Log' }) {
  const [keepsake, setKeepsake] = useState(
    initial?.keepsake ?? null
  );
  const [datetime, setDatetime] = useState(
    initial?.datetime ?? nowLocalString()
  );
  const [title, setTitle] = useState(initial?.title ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = !!keepsake && title.trim() && content.trim() && !!datetime;
  const topics = keepsake ? TOPICS[keepsake.name] || [] : [];

  // The reset button only renders in new-entry mode (edit mode has Cancel),
  // and only when the user has actually put something into the form.
  const isDirty = !!keepsake || !!title.trim() || !!content.trim();
  const showReset = !initial && isDirty;

  function handleReset() {
    setKeepsake(null);
    setDatetime(nowLocalString());
    setTitle('');
    setContent('');
    setError('');
  }

  // Which Keepsakes are off-limits for this entry. An entry's cycle comes from
  // its datetime, and we exclude the entry itself when editing so its current
  // Keepsake stays usable.
  const cycleKey = useMemo(() => getCycleKey(datetime), [datetime]);
  const cycleLabel = useMemo(() => getCycleLabel(datetime), [datetime]);
  const usedKeepsakes = useMemo(() => {
    const set = new Set();
    if (!cycleKey || !entries) return set;
    for (const e of entries) {
      if (initial?.id && e.id === initial.id) continue;
      if (getCycleKey(e.datetime) === cycleKey) {
        set.add(e.keepsakeName);
      }
    }
    return set;
  }, [entries, cycleKey, initial?.id]);
  const unavailableNames = useMemo(
    () =>
      Array.from(usedKeepsakes).filter((n) => n !== keepsake?.name),
    [usedKeepsakes, keepsake?.name]
  );
  const unavailableKey = unavailableNames.join('|');

  // LLM-based suggestions: debounce while the user types, then send the title
  // and entry to Claude and parse a small list of recommended Keepsakes.
  const [rawSuggestions, setRawSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState('');
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!SUGGESTIONS_ENABLED) return;
    const combined = (title + ' ' + content).trim();
    if (combined.length < 25) {
      setRawSuggestions([]);
      setSuggestError('');
      setSuggestLoading(false);
      return;
    }

    const controller = new AbortController();
    const handle = setTimeout(async () => {
      const myId = ++requestIdRef.current;
      setSuggestLoading(true);
      setSuggestError('');
      try {
        const result = await fetchKeepsakeSuggestions(
          title.trim(),
          content.trim(),
          unavailableNames,
          controller.signal
        );
        if (myId !== requestIdRef.current) return;
        const mapped = result
          .map((s) => {
            const k = KEEPSAKES.find((kk) => kk.name === s.keepsake);
            return k ? { keepsake: k, reason: s.reason || '' } : null;
          })
          .filter(Boolean)
          .slice(0, 4);
        setRawSuggestions(mapped);
      } catch (e) {
        if (e.name === 'AbortError') return;
        if (myId !== requestIdRef.current) return;
        console.error('Suggestion fetch failed:', e);
        setSuggestError('Could not load suggestions: ' + (e?.message || String(e)));
        setRawSuggestions([]);
      } finally {
        if (myId === requestIdRef.current) setSuggestLoading(false);
      }
    }, 1800);

    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [title, content, unavailableKey]);

  // Exclude the currently-selected Keepsake from the rendered list, but don't
  // re-fetch on every selection change (it'd burn tokens for no new info).
  const displayedSuggestions = rawSuggestions.filter(
    (s) => s.keepsake.name !== keepsake?.name
  );

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    const result = await onSave({
      keepsakeName: keepsake.name,
      emoji: keepsake.emoji,
      datetime,
      title: title.trim(),
      content: content.trim(),
    });
    // onSave returns { ok: true } or { ok: false, error: '...' }
    if (!result?.ok) {
      setError(result?.error || 'Failed to save. Try again.');
    }
    setSubmitting(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <label className={`${labelBase} mb-0`}>Keepsake</label>
          {cycleLabel && (
            <span className="text-xs text-gray-500">
              {cycleLabel} · {usedKeepsakes.size}/58 used
            </span>
          )}
        </div>
        <KeepsakeSelector
          value={keepsake}
          onChange={setKeepsake}
          usedNames={usedKeepsakes}
        />
      </div>

      <div>
        <label className={labelBase}>When</label>
        <div className="flex gap-2">
          <input
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            className={`${inputBase} flex-1`}
          />
          <button
            type="button"
            onClick={() => setDatetime(nowLocalString())}
            className="px-3 py-2 text-xs text-gray-600 border border-gray-300 hover:border-gray-400 rounded transition-colors"
          >
            Now
          </button>
        </div>
        {datetime && (
          <p className="mt-1.5 text-xs text-gray-500 font-mono">
            {formatDateTime(datetime)}
          </p>
        )}
      </div>

      <div>
        <label className={labelBase}>Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="A short headline…"
          className={inputBase}
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <label className={`${labelBase} mb-0`}>Entry</label>
          <span
            className={
              'text-xs tabular-nums ' +
              (content.length > 300 ? 'text-amber-600' : 'text-gray-400')
            }
          >
            {content.length > 300
              ? content.length + ' / 300'
              : content.length}
          </span>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={7}
          placeholder="What happened?"
          className={`${inputBase} resize-y leading-relaxed`}
        />
        {showReset && (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-gray-500 hover:text-gray-900 underline"
            >
              Reset form
            </button>
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
            {submitting ? 'Saving…' : submitLabel}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 hover:border-gray-400 rounded transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
        {topics.length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-gray-500 mb-1.5">Prompts</div>
            <div className="flex flex-wrap gap-1.5">
              {topics.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {(displayedSuggestions.length > 0 || suggestLoading || suggestError) && (
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label className={`${labelBase} mb-0`}>Suggested Keepsakes</label>
            {suggestLoading && (
              <span className="text-xs text-gray-400">analyzing…</span>
            )}
          </div>
          {suggestError ? (
            <p className="text-xs text-gray-500">{suggestError}</p>
          ) : (
            <div className="space-y-1.5">
              {displayedSuggestions.map((s) => (
                <button
                  key={s.keepsake.name}
                  type="button"
                  onClick={() => setKeepsake(s.keepsake)}
                  className="w-full flex items-start gap-2.5 px-3 py-2 text-left rounded border border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg leading-none flex-shrink-0 mt-0.5">
                    {s.keepsake.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-gray-900 text-sm font-medium">
                      {s.keepsake.name}
                    </div>
                    {s.reason && (
                      <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        {s.reason}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}

function EntryCard({ entry, entries, onDelete, onUpdate, moodData, onOpenMood, tooltipEnabled }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Any entry on a 2026 day gets a pixel next to its actions: filled if a mood
  // is logged for that day, otherwise a blank, clickable circle for logging the
  // mood on the spot.
  const moodDay = dayOfYear2026(entry.datetime);
  const dayMoods = moodDay != null ? moodData?.[moodDay] : null;

  if (editing) {
    const initialKeepsake = KEEPSAKES.find(
      (k) => k.name === entry.keepsakeName
    ) || { name: entry.keepsakeName, emoji: entry.emoji, characters: [] };
    return (
      <div className="bg-white border border-gray-300 rounded p-4">
        <EntryForm
          initial={{
            id: entry.id,
            keepsake: initialKeepsake,
            datetime: entry.datetime,
            title: entry.title,
            content: entry.content,
          }}
          entries={entries}
          onSave={async (data) => {
            const result = await onUpdate(entry.id, data);
            if (result?.ok) setEditing(false);
            return result;
          }}
          onCancel={() => setEditing(false)}
          submitLabel="Save Changes"
        />
      </div>
    );
  }

  return (
    <article className="bg-white border border-gray-200 hover:border-gray-300 rounded p-4 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-2xl leading-none flex-shrink-0">{entry.emoji}</span>
          <div className="min-w-0">
            <div className="text-gray-700 text-sm font-medium truncate">
              {entry.keepsakeName}
            </div>
            <div className="text-gray-500 text-xs font-mono mt-0.5">
              {formatDateTime(entry.datetime)}
            </div>
          </div>
        </div>
        <div className="flex gap-0.5 items-center flex-shrink-0">
          {moodDay != null && (
            <>
              <MoodCircle
                day={moodDay}
                moods={dayMoods}
                size={24}
                showTooltip={tooltipEnabled}
                onClick={() => onOpenMood(moodDay)}
              />
              <span className="w-px h-5 bg-gray-200 mx-1" aria-hidden="true" />
            </>
          )}
          <button
            type="button"
            onClick={() => setEditing(true)}
            title="Edit"
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  onDelete(entry.id);
                  setConfirmDelete(false);
                }}
                className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              title="Delete"
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <h3 className="text-gray-900 font-medium text-sm mb-1.5">
        {renderRichText(entry.title)}
      </h3>
      <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
        {renderRichText(entry.content)}
      </p>
    </article>
  );
}

function LogFilters({ entries, filters, setFilters }) {
  // Only show Keepsakes that have at least one entry so the dropdown
  // doesn't list 58 options when most are unused.
  const usedKeepsakes = useMemo(() => {
    const map = new Map();
    entries.forEach((e) => {
      if (!map.has(e.keepsakeName)) {
        map.set(e.keepsakeName, e.emoji);
      }
    });
    return Array.from(map.entries())
      .map(([name, emoji]) => ({ name, emoji }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [entries]);

  const hasActive = filters.from || filters.to || filters.keepsake;

  return (
    <div className="border border-gray-200 rounded p-3 mb-4 bg-gray-50">
      <div className="flex items-center gap-2 mb-2">
        <Filter className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">
          Filter
        </span>
        {hasActive && (
          <button
            type="button"
            onClick={() => setFilters({ from: '', to: '', keepsake: '' })}
            className="ml-auto text-xs text-gray-500 hover:text-gray-900 underline"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            className={`${inputBase} text-sm`}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            className={`${inputBase} text-sm`}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Keepsake</label>
          <select
            value={filters.keepsake}
            onChange={(e) => setFilters({ ...filters, keepsake: e.target.value })}
            className={`${inputBase} text-sm`}
          >
            <option value="">All Keepsakes</option>
            {usedKeepsakes.map((k) => (
              <option key={k.name} value={k.name}>
                {k.emoji} {k.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function LogTab({ entries, onDelete, onUpdate, moodData, onOpenMood }) {
  const [filters, setFilters] = useState({ from: '', to: '', keepsake: '' });
  const canHover = useHoverCapable();

  const filtered = useMemo(() => {
    const fromTs = filters.from ? new Date(filters.from + 'T00:00').getTime() : null;
    const toTs = filters.to ? new Date(filters.to + 'T23:59').getTime() : null;
    return entries
      .filter((e) => {
        const ts = new Date(e.datetime).getTime();
        if (fromTs !== null && ts < fromTs) return false;
        if (toTs !== null && ts > toTs) return false;
        if (filters.keepsake && e.keepsakeName !== filters.keepsake) return false;
        return true;
      })
      .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
  }, [entries, filters]);

  if (entries.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        No entries yet. Start with the Fill Form tab.
      </div>
    );
  }

  return (
    <div>
      <LogFilters entries={entries} filters={filters} setFilters={setFilters} />
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No entries match the current filter.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              entries={entries}
              onDelete={onDelete}
              onUpdate={onUpdate}
              moodData={moodData}
              onOpenMood={onOpenMood}
              tooltipEnabled={canHover}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('form');
  const [entries, setEntries] = useState([]);
  const [moodData, setMoodData] = useState({});
  const [moodModalDay, setMoodModalDay] = useState(null);
  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        // First login on an empty account: push the bundled seed into Supabase
        // once, then read back. Any device after that just reads.
        await migrateSeedIfEmpty();
        const [entryList, moodMap] = await Promise.all([listEntries(), loadMoods()]);
        setEntries(entryList);
        setMoodData(moodMap && typeof moodMap === 'object' ? moodMap : {});
      } catch (e) {
        console.error('load failed', e);
        setLoadError(
          'Could not load your data: ' +
            (e?.message || String(e)) +
            ' — check that the database tables exist (see SETUP.md).'
        );
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleCreate(data) {
    const entry = {
      id: 'entry_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      ...data,
      createdAt: new Date().toISOString(),
    };
    try {
      await upsertEntry(entry);
      setEntries((prev) => [...prev, entry]);
      setTab('log');
      return { ok: true };
    } catch (e) {
      console.error('save failed', e);
      return { ok: false, error: 'Save error: ' + (e?.message || String(e)) };
    }
  }

  async function handleUpdate(id, data) {
    const existing = entries.find((e) => e.id === id);
    if (!existing) return { ok: false, error: 'Entry not found.' };
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    try {
      await upsertEntry(updated);
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
      return { ok: true };
    } catch (e) {
      console.error('update failed', e);
      return { ok: false, error: 'Update error: ' + (e?.message || String(e)) };
    }
  }

  async function handleDelete(id) {
    try {
      await deleteEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (e) {
      console.error('delete failed', e);
    }
  }

  async function handleSaveMoods(day, moods) {
    const next = { ...moodData };
    if (moods && moods.length) next[day] = [...moods];
    else delete next[day];
    setMoodData(next);
    try {
      await saveMoods(next);
    } catch (e) {
      console.error('mood save failed', e);
    }
    setMoodModalDay(null);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  const narrow = useIsNarrow(520);

  const TABS = [
    { key: 'form', icon: FileText, full: 'Fill Form', short: 'Form' },
    { key: 'log', icon: BookOpen, full: 'Keepsake Log', short: 'Log' },
    { key: 'tracker', icon: LayoutGrid, full: 'Mood Tracker', short: 'Tracker' },
    { key: 'summary', icon: BarChart3, full: 'Mood Summary', short: 'Summary' },
  ];

  const tabClass = (t) =>
    [
      'flex items-center justify-center border-b-2 -mb-px transition-colors whitespace-nowrap',
      narrow ? 'flex-1 gap-1 px-1 py-2 text-xs' : 'flex-shrink-0 gap-2 px-3 py-2 text-sm',
      tab === t
        ? 'border-gray-900 text-gray-900'
        : 'border-transparent text-gray-500 hover:text-gray-900',
    ].join(' ');

  return (
    <TooltipLayer>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <header className="mb-6 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Book of Shadows</h1>
              <p className="text-gray-500 text-xs mt-0.5">
                Digital working surface for to-dos, microblogging, and tracking
                mood in a Year in Pixels matrix
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex-shrink-0 text-xs text-gray-400 hover:text-gray-700 transition-colors"
            >
              Sign out
            </button>
          </header>

          {loadError && (
            <div className="mb-4 text-xs text-red-600 border border-red-200 bg-red-50 rounded-md px-3 py-2">
              {loadError}
            </div>
          )}

          <nav className="flex gap-1 border-b border-gray-200 mb-5">
            {TABS.map(({ key, icon: Icon, full, short }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={tabClass(key)}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{narrow ? short : full}</span>
                {key === 'log' && !narrow && entries.length > 0 && (
                  <span className="ml-1 text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                    {entries.length}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {loading ? (
            <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
          ) : tab === 'form' ? (
            <EntryForm entries={entries} onSave={handleCreate} submitLabel="Add to Log" />
          ) : tab === 'log' ? (
            <LogTab
              entries={entries}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
              moodData={moodData}
              onOpenMood={setMoodModalDay}
            />
          ) : tab === 'tracker' ? (
            <TrackerTab moodData={moodData} onOpenMood={setMoodModalDay} />
          ) : (
            <SummaryTab moodData={moodData} />
          )}
        </div>
      </div>

      {moodModalDay != null && (
        <MoodModal
          day={moodModalDay}
          initialMoods={moodData[moodModalDay] || []}
          onSave={handleSaveMoods}
          onClose={() => setMoodModalDay(null)}
        />
      )}
    </TooltipLayer>
  );
}
