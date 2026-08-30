const fs = require("fs");

const IPAS = {
  "a-piece-of-cake": "/ə ˌpiːs əv ˈkeɪk/",
  "under-the-weather": "/ˈʌndər ðə ˈweðər/",
  "on-the-fence": "/ɑːn ðə fens/",
  "hit-the-books": "/hɪt ðə bʊks/",
  "once-in-a-blue-moon": "/wʌns ɪn ə ˈbluː muːn/",
  "the-ball-is-in-your-court": "/bɔːl ɪn jʊr kɔːrt/",
  "bite-the-bullet": "/baɪt ðə ˈbʊlɪt/",
  "break-the-ice": "/breɪk ði aɪs/",
  "call-it-a-day": "/kɔːl ɪt ə deɪ/",
  "cut-corner": "/kʌt ˈkɔːrnər/",
  "get-out-of-hand": "/ɡet aʊt əv hænd/",
  "give-someone-a-hand": "/ɡɪv ˈsʌmwʌn ə hænd/",
  "in-the-long-run-n2": "/ɪn ðə lɔːŋ rʌn/",
  "keep-an-eye-on": "/kiːp ən aɪ ɑːn/",
  "learn-by-heart": "/lɜːrn baɪ hɑːrt/",
  "make-up-your-mind": "/meɪk ʌp jɔːr maɪnd/",
  "no-pain-no-gain": "/noʊ peɪn noʊ ɡeɪn/",
  "off-the-top-of-my-head": "/ɔːf ðə tɑːp əv maɪ hed/",
  "on-purpose-adv": "/ɑːn ˈpɜːrpəs/",
  "out-of-order-sign": "/aʊt əv ˈɔːrdər/",
  "pull-someone's-leg": "/pʊl ˈsʌmwʌnz leɡ/",
  "rain-check-invite": "/ˈreɪn tʃek/",
  "see-eye-to-eye-v": "/siː aɪ tu ˈaɪ/",
  "so-far-so-good-n2": "/soʊ fɑːr soʊ ˈɡʊd/",
  "take-it-easy-v": "/teɪk ɪt ˈiːzi/",
  "paycheck-to-paycheck": "/ˈpeɪtʃek tə ˈpeɪtʃek/",
  "mlk-holiday": "/ˈmɑːrtɪn ˈluːðər kɪŋ deɪ/",
  "ssn": "/ˌɛs ɛs ˈɛn/",
  "out-of-office-reply": "/aʊt əv ˈɔːfɪs rɪˈplaɪ/",
  "one-on-one-meeting": "/wʌn ɑːn wʌn ˈmiːtɪŋ/",
  "parking-lot-list": "/ˈpɑːrkɪŋ lɑːt lɪst/",
  "vote-by-show-of-hands": "/voʊt baɪ ʃoʊ əv ˈhændz/",
  "give-credit-where-due": "/ɡɪv ˈkredɪt wer ˈduː/",
  "problem-solving-skills": "/ˈprɑːbləm ˈsɑːlvɪŋ skɪlz/",
  "self-review-habit": "/ˌself rɪˈvjuː ˈhæbɪt/",
  "time-management-tools": "/taɪm ˈmænɪdʒmənt tuːlz/",
};

const FILES = [
  "src/content/vocab/groups/g93-idioms-chunks1.ts",
  "src/content/vocab/groups/g94-finance-household.ts",
  "src/content/vocab/groups/g95-culture-usa1.ts",
  "src/content/vocab/groups/g97-business-email.ts",
  "src/content/vocab/groups/g98-meetings-negotiation.ts",
  "src/content/vocab/groups/g99-career-skills2.ts",
];

let fixed = 0;
for (const p of FILES) {
  let s = fs.readFileSync(p, "utf8");
  for (const [id, ipa] of Object.entries(IPAS)) {
    // Pattern: v("id", "zh", "pos  -> insert ipa before pos when missing.
    const re = new RegExp(`(v\\("${id}",\\s*"[^"]*",\\s*)(?!\\/)("?[a-z.]+")`);
    const next = s.replace(re, `$1"${ipa}", $2`);
    if (next !== s) { s = next; fixed++; }
  }
  fs.writeFileSync(p, s, "utf8");
}
console.log("ipa fields inserted:", fixed);
