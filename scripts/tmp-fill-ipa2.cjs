/** Phase 16-A: fill all empty IPA fields with reasonable American English IPA. */
const fs = require("fs");
const path = require("path");

const IPA_MAP = {
  "soundness-of-argument": "/ˈsaʊndnəs əv ði ˈɑːrɡjəmənt/",
  "burden-of-rebuttal": "/ˈbɜːrdn əv rɪˈbʌtl/",
  "longitudinal-study-design": "/ˌlɑːndʒɪˈtuːdɪnl ˈstʌdi dɪˈzaɪn/",
  "randomized-controlled-trial": "/ˈrændəmaɪzd kənˈtroʊld ˈtraɪəl/",
  "confounding-variable-issue": "/kənˈfaʊndɪŋ ˈveriəbl ˈɪʃuː/",
  "blinding-protocol-procedure": "/ˈblaɪndɪŋ ˈproʊtəkɔːl prəˈsiːdʒər/",
  "sampling-frame-definition": "/ˈsæmplɪŋ freɪm ˌdefɪˈnɪʃn/",
  "attrition-rate-tracking": "/əˈtrɪʃn reɪt ˈtrækɪŋ/",
  "ethics-review-board-approval": "/ˈeθɪks rɪˈvjuː bɔːrd əˈpruːvl/",
  "mixed-methods-research-approach": "/mɪkst ˈmeθədz riːˈsɜːrtʃ əˈproʊtʃ/",
  "statistical-power-analysis": "/stəˈtɪstɪkl ˈpaʊər əˈnæləsɪs/",
  "regression-to-the-mean-fallacy": "/rɪˈɡreʃn tə ðə miːn ˈfæləsi/",
  "outlier-handling-policy": "/ˈaʊtlaɪər ˈhændlɪŋ ˈpɑːləsi/",
  "confidence-interval-interpretation": "/ˈkɑːnfɪdəns ˈɪntərvl ɪnˌtɜːrprɪˈteɪʃn/",
  "selection-bias-in-samples": "/sɪˈlekʃn ˈbaɪəs ɪn ˈsæmplz/",
  "data-dredging-warning": "/ˈdeɪtə ˈdredʒɪŋ ˈwɔːrnɪŋ/",
  "baseline-covariate-adjustment": "/ˈbeɪslaɪn koʊˈveriət əˈdʒʌstmənt/",
  "effect-size-metric-choice": "/ɪˈfekt saɪz ˈmetrɪk tʃɔɪs/",
  "thesis-statement-craft": "/ˈθiːsɪs ˈsteɪtmənt kræft/",
  "topic-sentence-discipline": "/ˈtɑːpɪk ˈsentəns ˈdɪsəplɪn/",
  "counterclaim-integration": "/ˈkaʊntərkleɪm ˌɪntɪˈɡreɪʃn/",
  "citation-integrity-check": "/saɪˈteɪʃn ɪnˈteɡrəti tʃek/",
  "signposting-language-use": "/ˈsaɪnpoʊstɪŋ ˈlæŋɡwɪdʒ juːs/",
  "literature-gap-identification": "/ˈlɪtərətʃər ɡæp aɪˌdentɪfɪˈkeɪʃn/",
  "peer-feedback-incorporation": "/pɪr ˈfiːdbæk ɪnˌkɔːrpəˈreɪʃn/",
  "steelman-argument-practice": "/ˈstiːlmæn ˈɑːrɡjumənt ˈpræktɪs/",
  "falsifiability-criterion-test": "/ˌfɔːlsɪfaɪəˈbɪləti kraɪˈtɪriən test/",
  "inference-to-best-explanation": "/ˈɪnfərəns tə ðə best ˌekspləˈneɪʃn/",
  "second-order-effect-thinking": "/ˈsekənd ˈɔːrdər ɪˈfekt ˈθɪŋkɪŋ/",
  "base-rate-neglect-error": "/beɪs reɪt nɪˈɡlekt ˈerər/",
  "socratic-questioning-method": "/səˈkrætɪk ˈkwestʃənɪŋ ˈmeθəd/",
  "align-on-expectations": "/əˈlaɪn ɑːn ɪkˈspekteɪʃnz/",
  "escalate-issue-appropriately": "/ˈeskəleɪt ˈɪʃuː əˈproʊpriətli/",
  "close-the-loop-message": "/kloʊz ðə luːp ˈmesɪdʒ/",
  "circle-back-later-phrase": "/ˈsɜːkl bæk ˈleɪtər freɪz/",
  "give-a-heads-up": "/ɡɪv ə ˈhedz ʌp/",
  "take-this-offline": "/teɪk ðɪs ˌɔːfˈlaɪn/",
  "socialize-an-idea-internally": "/ˈsoʊʃəlaɪz æn aɪˈdiːə ɪnˈtɜːrnəli/",
  "delegate-authority-not-tasks": "/ˈdelɪɡeɪt ɔːˈθɒrəti nɑːt tæsks/",
  "lead-by-example-behavior": "/liːd baɪ ɪɡˈzæmpl bɪˈheɪvjər/",
  "psychological-safety-climate": "/ˌsaɪkəˈlɑːdʒɪkl ˈseɪfti ˈklaɪmət/",
  "empower-decision-making": "/ɪmˈpaʊər dɪˈsɪʒn ˈmeɪkɪŋ/",
  "succession-planning-pipeline": "/səkˈseʃn ˈplænɪŋ ˈpaɪplaɪn/",
  "vision-cascade-alignment": "/ˈvɪʒn kæˈskeɪd əˈlaɪnmənt/",
  "batna-walkaway-alternative": "/ˈbætnə ˈwɔːkəweɪ ɔːlˈtɜːrnətɪv/",
  "anchoring-offer-tactic": "/ˈæŋkərɪŋ ˈɔːfər ˈtæktɪk/",
  "logrolling-trade-offs-swap": "/ˈlɔːɡroʊlɪŋ ˈtreɪd ɔːfs swɒp/",
  "good-cop-bad-cop-routine": "/ɡʊd kɑːp bæd kɑːp ruːˈtiːn/",
  "reservation-price-floor": "/ˌrezərˈveɪʃn praɪs flɔːr/",
  "win-win-integrative-bargaining": "/wɪn wɪn ˈɪntɪɡrətɪv ˈbɑːrɡənɪŋ/",
  "operating-cadence-rhythm": "/ˈɒpəreɪtɪŋ ˈkeɪdns ˈrɪðəm/",
  "single-threaded-owner-model": "/ˈsɪŋɡl ˈθredɪd ˈoʊnər ˈmɑːdl/",
  "root-cause-analysis-session": "/ruːt kɔːz əˈnæləsɪs ˈseʃn/",
  "capacity-planning-exercise": "/kəˈpæsəti ˈplænɪŋ ˈeksərsaɪz/",
  "servant-leadership-philosophy": "/ˈsɜːrvənt ˈliːdərʃɪp fəˈlɑːsəfi/",
  "founder-market-fit-fit": "/ˈfaʊndər mɑːrkɪt fɪt fɪt/",
  "co-founder-equity-split-talk": "/koʊˈfaʊndər ˈekwəti splɪt tɔːk/",
  "customer-discovery-interviews": "/ˈkʌstəmər dɪˈskʌvəri ˈɪntərvjuːz/",
  "runway-extension-tactics": "/ˈrʌnweɪ ɪkˈstenʃn ˈtæktɪks/",
  "product-led-growth-motion": "/ˈprɒdʌkt led ɡroʊθ ˈmoʊʃn/",
  "amortization-schedule-table": "/ˌæmərtəˈzeɪʃn ˈskedʒuːl ˈteɪbl/",
  "compound-interest-math": "/ˈkɑːmpaʊnd ˈɪntrəst mæθ/",
  "diversification-portfolio-theory": "/daɪˌvɜːrsɪfɪˈkeɪʃn pɔːrtˈfoʊlioʊ ˈθɪri/",
  "emergency-fund-three-months": "/ɪˈmɜːrdʒənsi fʌnd θriː mʌnθs/",
  "index-fund-passive-investing": "/ˈɪndeks fʌnd ˈpæsɪv ˈɪnvɛstɪŋ/",
  "liquidity-crisis-warning-signs": "/lɪˈkwɪdəti ˈkraɪsɪs ˈwɔːrnɪŋ saɪnz/",
};

const dir = path.join(process.cwd(), "src/content/vocab/groups");
let filled = 0;
for (const f of fs.readdirSync(dir)) {
  if (!/^g1[6-9]\d-/.test(f) && !/^g20\d-/.test(f)) continue;
  const p = path.join(dir, f);
  const lines = fs.readFileSync(p, "utf8").split("\n");
  let fileFixed = 0;
  const out = lines.map((line) => {
    // Match: cv("word", "", ... -> fill empty ipa
    const match = line.match(/^(\s*)cv\("([a-z0-9'-]+)", "", /);
    if (match && IPA_MAP[match[2]]) {
      filled++;
      return line.replace('cv("' + match[2] + '", "",', 'cv("' + match[2] + '", "' + IPA_MAP[match[2]] + '",');
    }
    return line;
  });
  if (fileFixed > 0) {
    fs.writeFileSync(p, out.join("\n"), "utf8");
  }
}
console.log("IPA filled:", filled);
