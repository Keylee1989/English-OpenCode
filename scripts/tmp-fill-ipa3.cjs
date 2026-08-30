/** Fill ALL remaining empty IPA fields in g169+ files. */
const fs = require("fs");
const path = require("path");

const IPA = {
  "soundness-of-argument": "/ˈsaʊndnəs/",
  "burden-of-rebuttal": "/ˈbɜːrdn əv rɪˈbʌtl/",
  "longitudinal-study-design": "/lɑːnˈdʒɪːtuːdɪnl stʌˈdi diˈzaɪn/",
  "randomized-controlled-trial": "/ˈræn.də.maɪzd kənˈtroʊld ˈtraɪ.əl/",
  "confounding-variable-issue": "/kənˈfaʊn.dɪŋ ˈvɛə.ri.ə.bəl ˈɪʃ.uː/",
  "blinding-protocol-procedure": "/ˈblaɪn.dɪŋ ˈproʊ.tə.kɔːl prəˈsiː.dʒər/",
  "sampling-frame-definition": "/ˈsæm.plɪŋ freɪm ˌdef.ɪˈnɪʃ.ən/",
  "attrition-rate-tracking": "/əˈtrɪʃ.ən reɪt ˈtræk.ɪŋ/",
  "ethics-review-board-approval": "/ˈeθ.ɪks rɪˈvjuː bɔːrd əˈpruː.vəl/",
  "mixed-methods-research-approach": "/mɪkst ˈmeθ.ədz rɪˈsɜːrtʃ əˈproʊtʃ/",
  "statistical-power-analysis": "/stəˈtɪs.tɪ.kəl ˈpaʊ.ər əˈnæl.ə.sɪs/",
  "regression-to-the-mean-fallacy": "/rɪˈɡreʃ.ən tə ðə miːn ˈfæl.ə.si/",
  "outlier-handling-policy": "/ˈaʊtˌlaɪ.ər ˈhæn.dlɪŋ ˈpɑː.lɪ.si/",
  "confidence-interval-interpretation": "/ˈkɒn.fɪ.dəns ˈɪn.tər.vəl ɪnˌtɜːr.prɪˈteɪ.ʃən/",
  "selection-bias-in-samples": "/sɪˈlek.ʃən ˈbaɪ.əs ɪn ˈsæm.pəlz/",
  "data-dredging-warning": "/ˈdeɪ.tə ˈdrɛdʒ.ɪŋ ˈwɔːr.nɪŋ/",
  "baseline-covariate-adjustment": "/ˈbeɪs.laɪn koʊˈvɛə.ri.ət əˈdʒʌst.mənt/",
  "effect-size-metric-choice": "/ɪˈfekt saɪz ˈme.trɪk tʃɔɪs/",
  "thesis-statement-craft": "/ˈθiː.sɪs ˈsteɪt.mənt kræft/",
  "topic-sentence-discipline": "/ˈtoʊ.pɪk ˈsen.təns ˈdɪ.sə.plɪn/",
  "counterclaim-integration": "/ˈkaʊn.tər.kleɪm ˌɪn.tɪˈɡreɪ.ʃən/",
  "citation-integrity-check": "/saɪˈteɪ.ʃən ɪnˈteɡ.rə.ti tʃek/",
  "signposting-language-use": "/ˈsaɪn.poʊ.stɪŋ ˈlæŋ.ɡwɪdʒ juːs/",
  "literature-gap-identification": "/ˈlɪ.trə.tʃʊr ɡæp aɪˌden.tɪ.fɪˈkeɪ.ʃən/",
  "peer-feedback-incorporation": "/pɪr ˈfiːd.bæk ɪn.kɔːr.pəˈreɪ.ʃən/",
  "steelman-argument-practice": "/ˈstiːl.mæn ˈɑːr.ɡjə.mənt ˈpræk.tɪs/",
  "falsifiability-criterion-test": "/ˌfɔːl.sɪ.faɪ.əˈbɪl.ə.ti kraɪˈtɪə.ri.ən test/",
  "inference-to-best-explanation": "/ˈɪn.fər.əns tə ðə best ˌeks.pləˈneɪ.ʃən/",
  "second-order-effect-thinking": "/ˈsek.ənd ˈɔːr.dər ɪˈfekt ˈθɪŋ.kɪŋ/",
  "base-rate-neglect-error": "/beɪs reɪt nɪˈɡlekt ˈer.ər/",
  "socratic-questioning-method": "/səˈkræt.ɪk ˈkwestʃ.ə.nɪŋ ˈmeθ.əd/",
  "align-on-expectations": "/əˈlaɪn ɒn ɪkˈspek.teɪ.ʃənz/",
  "escalate-issue-appropriately": "/ˈes.kə.leɪt ˈɪʃ.uː əˈproʊ.pri.ət.li/",
  "close-the-loop-message": "/kloʊz ðə luːp ˈmes.ɪdʒ/",
  "circle-back-later-phrase": "/ˈsɜːr.kəl bæk ˈleɪ.tər freɪz/",
  "give-a-heads-up": "/ɡɪv ə ˈhedz ʌp/",
  "take-this-offline": "/teɪk ðɪs ˌɔːfˈlaɪn/",
  "socialize-an-idea-internally": "/ˈsoʊ.ʃə.laɪz æn aɪˈdiː.ə ɪnˈtɜː.nə.li/",
  "delegate-authority-not-tasks": "/ˈdel.ɪ.ɡeɪt ɔːˈθɒr.ə.ti nɑːt tæsks/",
  "lead-by-example-behavior": "/liːd baɪ ɪɡˈzæm.pəl bɪˈheɪ.vjər/",
  "psychological-safety-climate": "/ˌsaɪ.kəˈlɒdʒ.ɪ.kəl ˈseɪf.ti ˈklaɪ.mət/",
  "empower-decision-making": "/ɪmˈpaʊ.ər dɪˈsɪʒ.ən ˈmeɪ.kɪŋ/",
  "succession-planning-pipeline": "/səkˈseʃ.ən ˈplæn.ɪŋ ˈpaɪp.laɪn/",
  "vision-cascade-alignment": "/ˈvɪ.ʒən kæˈskeɪd əˈlaɪn.mənt/",
  "batna-walkaway-alternative": "/ˈbæt.nə ˈwɔː.kə.weɪ ɔːlˈtɜː.nə.tɪv/",
  "anchoring-offer-tactic": "/ˈæŋ.kər.ɪŋ ˈɒf.ər ˈtæk.tɪk/",
  "logrolling-trade-offs-swap": "/ˈlɔːɡ.roʊ.lɪŋ ˈtreɪd ɔːfs swɒp/",
  "good-cop-bad-cop-routine": "/ɡʊd kɑːp bæd kɑːp ruːˈtiːn/",
  "reservation-price-floor": "/ˌrez.ərˈveɪ.ʃən praɪs flɔːr/",
  "win-win-integrative-bargaining": "/wɪn wɪn ˈɪn.tɪ.ɡreɪ.tɪv ˈbɑːr.ɡən.ɪŋ/",
  "operating-cadence-rhythm": "/ˈɒp.ə.reɪ.tɪŋ kəˈdɛns ˈrɪð.əm/",
  "single-threaded-owner-model": "/ˈsɪŋ.ɡəl ˈθred.ɪd ˈoʊ.nər ˈmɑː.dəl/",
  "root-cause-analysis-session": "/ruːt kɔːz əˈnæl.ə.sɪs ˈseʃ.ən/",
  "capacity-planning-exercise": "/kəˈpæ.sɪ.ti ˈplæn.ɪŋ ˈek.sər.saɪz/",
  "servant-leadership-philosophy": "/ˈsɜːr.vənt ˈliː.dər.ʃɪp fɪˈlɒs.ə.fi/",
  "founder-market-fit-fit": "/ˈfaʊn.der ˈmɑːr.kɪt fɪt fɪt/",
  "co-founder-equity-split-talk": "/koʊˈfaʊn.der ˈek.wɪ.ti splɪt tɔːk/",
  "customer-discovery-interviews": "/ˈkʌs.tə.mər dɪˈskʌv.ər.i ˈɪn.tər.vjuːz/",
  "runway-extension-tactics": "/ˈrʌn.weɪ ɪkˈten.ʃən ˈtæk.tɪks/",
  "product-led-growth-motion": "/ˈprɒd.ʌkt led ɡroʊθ ˈmoʊ.ʃən/",
  "amortization-schedule-table": "/ˌæm.ər.tɪˈzeɪ.ʃən ˈskedʒ.uːl ˈteɪ.bəl/",
  "compound-interest-math": "/ˈkɒm.paʊnd ˈɪn.trəst mæθ/",
  "diversification-portfolio-theory": "/daɪˌvɜː.sɪ.fɪˈkeɪ.ʃən pɔːrtˈfoʊ.li.oʊ ˈθɪə.ri/",
  "emergency-fund-three-months": "/ɪˈmɜː.dʒən.si fʌnd θriː mʌnθs/",
  "index-fund-passive-investing": "/ˈɪn.deks fʌnd ˈpæs.ɪv ˈɪn.vest.ɪŋ/",
  "liquidity-crisis-warning-signs": "/lɪˈkwɪd.ɪ.ti ˈkraɪ.sɪs ˈwɔːr.nɪŋ saɪnz/",
  "admit-vs-acknowledge-nuance": "/ədˈmɪt vs ˌæk.nɒl.ɪdʒ nuː.ɑːns/",
  "slim-vs-slight-chance": "/slɪm vs slaɪt tʃɑːns/",
  "convince-vs-persuade-distinction": "/kənˈvɪns vs pərˈsweɪd dɪˈstɪŋk.ʃən/",
  "historic-vs-historical-difference": "/hɪˈstɔːr.ɪk vs hɪˈstɔːr.ɪ.kəl ˈdɪf.ər.əns/",
  "sensible-vs-sensitive-mix-up": "/ˈsen.sə.bəl vs ˈsen.sɪ.tɪv mɪks ʌp/",
  "economic-vs-economical-use": "/ˌiː.kəˈnɒm.ɪk vs ˌiː.kəˈnɒm.ɪ.kəl juːs/",
};

const dir = path.join(process.cwd(), "src/content/vocab/groups");
let filled = 0;
let stillEmpty = [];
for (const f of fs.readdirSync(dir)) {
  if (!/^g1[6-9]\d-/.test(f) && !/^g20\d-/.test(f)) continue;
  const p = path.join(dir, f);
  const lines = fs.readFileSync(p, "utf8").split("\n");
  const out = lines.map((line, i) => {
    const m = line.match(/^(\s*)cv\("([a-z0-9'-]+)", "", /);
    if (!m) return line;
    const ipa = IPA[m[2]];
    if (!ipa) {
      stillEmpty.push(f + ":" + (i + 1) + " " + m[2]);
      return line;
    }
    filled++;
    return line.replace('cv("' + m[2] + '", "",', 'cv("' + m[2] + '", "' + ipa + '",');
  });
  fs.writeFileSync(p, out.join("\n"), "utf8");
}
console.log("filled:", filled);
if (stillEmpty.length > 0) {
  console.log("STILL EMPTY:", stillEmpty.join(", "));
}
