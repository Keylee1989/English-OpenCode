/**
 * Vocabulary Model v0 - merged lexical index (Phase 5: dynamically chunked).
 *
 * Sources:
 *  1. Day 1-7 lesson words (canonical - day content references these ids)
 *  2. Core vocabulary groups, shipped as FIVE dynamic chunks (chunk-a..e)
 *     resolved via top-level await. The public API below stays fully
 *     synchronous so Knowledge Model / SRS / Planner / Error Analysis /
 *     AI Context Builder are untouched.
 *  3. Minimal-pair confusion links auto-injected from the Phonics System
 *
 * Guarantees (enforced by tests):
 *  - >= 5000 unique entries once loaded
 *  - every entry has zh/ipa/example/collocations
 *  - ZERO dangling relation endpoints
 */
import { DAYS } from "@/content/days";
import { MINIMAL_PAIRS } from "@/phonics/rules";
import type { LexicalEntryV2, VocabRow } from "@/content/vocab/types";
import { toVocabRow } from "@/content/vocab/c2-types";
import { internationalRelationsRows } from "@/content/vocab/groups/g226-international-relations";
import { mediaStudiesRows } from "@/content/vocab/groups/g227-media-studies";
import { linguisticsRows } from "@/content/vocab/groups/g228-linguistics";
import { dataScienceRows } from "@/content/vocab/groups/g229-data-science";
import { architectureDesignRows } from "@/content/vocab/groups/g230-architecture-design";
import { politicalScienceRows } from "@/content/vocab/groups/g231-political-science";
import { economicsAdvancedRows } from "@/content/vocab/groups/g232-economics-advanced";
import { neuroscienceRows } from "@/content/vocab/groups/g233-neuroscience";
import { marineScienceRows } from "@/content/vocab/groups/g234-marine-science";
import { educationPedagogyRows } from "@/content/vocab/groups/g235-education-pedagogy";
import { legalTheoryRows } from "@/content/vocab/groups/g236-legal-theory";
import { healthcareSystemsRows } from "@/content/vocab/groups/g237-healthcare-systems";
import { philosophyScienceRows } from "@/content/vocab/groups/g238-philosophy-science";
import { urbanStudiesRows } from "@/content/vocab/groups/g239-urban-studies";
import { behavioralScienceRows } from "@/content/vocab/groups/g240-behavioral-science";
import { mathematicsRows } from "@/content/vocab/groups/g241-mathematics";
import { chemistryRows } from "@/content/vocab/groups/g242-chemistry";
import { physicsRows } from "@/content/vocab/groups/g243-physics";
import { materialsScienceRows } from "@/content/vocab/groups/g244-materials-science";
import { astronomyRows } from "@/content/vocab/groups/g245-astronomy";
import { computerScienceRows } from "@/content/vocab/groups/g246-computer-science";
import { businessStrategyRows } from "@/content/vocab/groups/g247-business-strategy";
import { cognitivePsychologyRows } from "@/content/vocab/groups/g248-cognitive-psychology";
import { geographyRows } from "@/content/vocab/groups/g249-geography";
import { performingArtsRows } from "@/content/vocab/groups/g250-performing-arts";
import { musicTheoryRows } from "@/content/vocab/groups/g251-music-theory";
import { environmentalChemistryRows } from "@/content/vocab/groups/g252-environmental-chemistry";
import { developmentStudiesRows } from "@/content/vocab/groups/g253-development-studies";
import { informationTheoryRows } from "@/content/vocab/groups/g254-information-theory";
import { sociologyKnowledgeRows } from "@/content/vocab/groups/g255-sociology-knowledge";
import { roboticsRows } from "@/content/vocab/groups/g256-robotics";
import { biomedicalEngineeringRows } from "@/content/vocab/groups/g257-biomedical-engineering";
import { organizationalBehaviorRows } from "@/content/vocab/groups/g258-organizational-behavior";
import { quantumComputingRows } from "@/content/vocab/groups/g259-quantum-computing";
import { mediaProductionRows } from "@/content/vocab/groups/g260-media-production";
import { photographyRows } from "@/content/vocab/groups/g261-photography";
import { cryptographyRows } from "@/content/vocab/groups/g262-cryptography";
import { econometricsRows } from "@/content/vocab/groups/g263-econometrics";
import { anthropologyRows } from "@/content/vocab/groups/g264-anthropology";
import { civilEngineeringRows } from "@/content/vocab/groups/g265-civil-engineering";
import { foodScienceRows } from "@/content/vocab/groups/g266-food-science";
import { journalismRows } from "@/content/vocab/groups/g267-journalism";
import { linguisticsAppliedRows } from "@/content/vocab/groups/g268-linguistics-applied";
import { supplyChainRows } from "@/content/vocab/groups/g269-supply-chain";
import { realEstateRows } from "@/content/vocab/groups/g270-real-estate";
import { militaryScienceRows } from "@/content/vocab/groups/g271-military-science";
import { filmStudiesRows } from "@/content/vocab/groups/g272-film-studies";
import { ecologyRows } from "@/content/vocab/groups/g273-ecology";
import { philosophyMindRows } from "@/content/vocab/groups/g274-philosophy-mind";
import { renewableEnergyRows } from "@/content/vocab/groups/g275-renewable-energy";
import { archaeologyRows } from "@/content/vocab/groups/g276-archaeology";
import { telecommunicationsRows } from "@/content/vocab/groups/g277-telecommunications";
import { publicHealthRows } from "@/content/vocab/groups/g278-public-health";
import { graphicDesignRows } from "@/content/vocab/groups/g279-graphic-design";
import { socialWorkRows } from "@/content/vocab/groups/g280-social-work";
import { transportationRows } from "@/content/vocab/groups/g281-transportation";
import { comparativeLiteratureRows } from "@/content/vocab/groups/g282-comparative-literature";
import { biostatisticsRows } from "@/content/vocab/groups/g283-biostatistics";
import { chemicalEngineeringRows } from "@/content/vocab/groups/g284-chemical-engineering";
import { ethicsTechnologyRows } from "@/content/vocab/groups/g285-ethics-technology";
import { cognitiveNeuroscienceRows } from "@/content/vocab/groups/g286-cognitive-neuroscience";
import { projectManagementRows } from "@/content/vocab/groups/g287-project-management";
import { advancedStatisticsRows } from "@/content/vocab/groups/g288-statistics";
import { urbanPlanningRows } from "@/content/vocab/groups/g289-urban-planning";
import { forensicScienceRows } from "@/content/vocab/groups/g290-forensic-science";
import { materialsEngineeringRows } from "@/content/vocab/groups/g291-materials-engineering";
import { advancedAccountingRows } from "@/content/vocab/groups/g292-accounting";
import { astrobiologyRows } from "@/content/vocab/groups/g293-astrobiology";
import { operationsResearchRows } from "@/content/vocab/groups/g294-operations-research";
import { phoneticsPhonologyRows } from "@/content/vocab/groups/g295-linguistics-phonetics";
import { healthInformaticsRows } from "@/content/vocab/groups/g296-health-informatics";
import { theaterDesignRows } from "@/content/vocab/groups/g297-theater-design";
import { nanotechnologyRows } from "@/content/vocab/groups/g298-nanotechnology";
import { intellectualHistoryRows } from "@/content/vocab/groups/g299-intellectual-history";
import { sportsScienceRows } from "@/content/vocab/groups/g300-sports-science";
import { organicChemistryRows } from "@/content/vocab/groups/g301-organic-chemistry";
import { chinaStudiesRows } from "@/content/vocab/groups/g302-china-studies";
import { microbiologyRows } from "@/content/vocab/groups/g303-microbiology";
import { technologyEthicsPolicyRows } from "@/content/vocab/groups/g304-technology-ethics";
import { pureMathematicsRows } from "@/content/vocab/groups/g305-pure-mathematics";
import { japanStudiesRows } from "@/content/vocab/groups/g306-japan-studies";
import { sustainableDesignRows } from "@/content/vocab/groups/g307-sustainable-design";
import { scienceCommunicationRows } from "@/content/vocab/groups/g308-science-communication";
import { cognitiveLinguisticsRows } from "@/content/vocab/groups/g309-cognitive-linguistics";
import { quantitativeFinanceRows } from "@/content/vocab/groups/g310-quantitative-finance";
import { politicalPhilosophyRows } from "@/content/vocab/groups/g311-philosophy-politics";
import { algorithmicFairnessRows } from "@/content/vocab/groups/g312-algorithmic-fairness";
import { medicalImagingRows } from "@/content/vocab/groups/g313-medical-imaging";
import { geopoliticsRows } from "@/content/vocab/groups/g314-geopolitics";
import { soilScienceRows } from "@/content/vocab/groups/g315-soil-science";
import { aestheticsRows } from "@/content/vocab/groups/g316-philosophy-aesthetics";
import { socialNetworkAnalysisRows } from "@/content/vocab/groups/g317-social-networks";
import { waterResourcesRows } from "@/content/vocab/groups/g318-water-resources";
import { opticsRows } from "@/content/vocab/groups/g319-optics";
import { publicAdministrationRows } from "@/content/vocab/groups/g320-public-administration";
import { electricalEngineeringRows } from "@/content/vocab/groups/g321-electrical-engineering";
import { syntaxGrammarTheoryRows } from "@/content/vocab/groups/g322-linguistics-syntax";
import { genomicsBioinformaticsRows } from "@/content/vocab/groups/g323-genomics";
import { culturalStudiesRows } from "@/content/vocab/groups/g324-cultural-studies";
import { computerNetworkingRows } from "@/content/vocab/groups/g325-networking";
import { demographyPopulationStudiesRows } from "@/content/vocab/groups/g326-demography";
import { civilRightsSocialJusticeRows } from "@/content/vocab/groups/g327-civil-rights";
import { glaciologyCryosphereRows } from "@/content/vocab/groups/g328-glaciology";
import { entrepreneurshipInnovationRows } from "@/content/vocab/groups/g329-entrepreneurship";
import { museumStudiesCuratorialRows } from "@/content/vocab/groups/g330-museum-studies";
import { remoteSensingRows } from "@/content/vocab/groups/g331-remote-sensing";
import { philosophyMindRows2 } from "@/content/vocab/groups/g332-philosophy-mind";
import { advancedMaterialsScienceRows } from "@/content/vocab/groups/g333-materials-science";
import { moralPhilosophyRows } from "@/content/vocab/groups/g334-philosophy-ethics";
import { semanticsPragmaticsRows } from "@/content/vocab/groups/g335-linguistics-semantics";
import { geophysicsRows } from "@/content/vocab/groups/g336-geophysics";
import { urbanGeographyRows } from "@/content/vocab/groups/g337-urban-geography";
import { neuropharmacologyRows } from "@/content/vocab/groups/g338-neuropharmacology";
import { philosophyLanguageRows } from "@/content/vocab/groups/g339-philosophy-language";
import { rockMechanicsRows } from "@/content/vocab/groups/g340-rock-mechanics";
import { professionalPhotographyRows } from "@/content/vocab/groups/g341-photography";
import { chemicalSafetyRows } from "@/content/vocab/groups/g342-chemical-safety";
import { culturalAnthropologyRows } from "@/content/vocab/groups/g343-cultural-anthropology";
import { supplyChainManagementRows } from "@/content/vocab/groups/g344-supply-chain";
import { educationalPsychologyRows } from "@/content/vocab/groups/g345-educational-psychology";
import { paleontologyRows } from "@/content/vocab/groups/g346-paleontology";
import { quantumInformationRows } from "@/content/vocab/groups/g347-quantum-information";
import { translationStudiesRows } from "@/content/vocab/groups/g348-translation-studies";
import { ecosystemEcologyRows } from "@/content/vocab/groups/g349-ecosystem-ecology";
import { publicHealthEpidemiologyRows } from "@/content/vocab/groups/g350-public-health";
import { criminologyRows } from "@/content/vocab/groups/g351-criminology";
import { roboticsMechatronicsRows } from "@/content/vocab/groups/g352-robotics";
import { internationalLawRows } from "@/content/vocab/groups/g353-international-law";
import { computationalLinguisticsRows } from "@/content/vocab/groups/g354-computational-linguistics";
import { complexityScienceRows } from "@/content/vocab/groups/g355-complexity-science";
import { biomaterialsBiomedicalRows } from "@/content/vocab/groups/g356-advanced-materials";
import { economicGeographyRows } from "@/content/vocab/groups/g357-economic-geography";
import { mathematicalPhysicsRows } from "@/content/vocab/groups/g358-mathematical-physics";
import { foodScienceRows as foodScienceAdvancedRows } from "@/content/vocab/groups/g359-food-science";
import { transportPlanningRows } from "@/content/vocab/groups/g360-transport-planning";
import { veterinaryMedicineRows } from "@/content/vocab/groups/g361-veterinary-medicine";
import { materialsProcessingRows } from "@/content/vocab/groups/g362-materials-processing";
import { musicTheoryCompositionRows } from "@/content/vocab/groups/g363-music-theory";
import { microfluidicsRows } from "@/content/vocab/groups/g364-microfluidics";
import { robotEthicsRows } from "@/content/vocab/groups/g365-robot-ethics";
import { environmentalJusticeRows } from "@/content/vocab/groups/g366-environmental-justice";
import { textileEngineeringRows } from "@/content/vocab/groups/g367-textile-engineering";
import { distributedSystemsRows } from "@/content/vocab/groups/g368-distributed-systems";
import { astronomyAstrophysicsRows } from "@/content/vocab/groups/g369-astrology-astronomy";
import { writingStudiesRhetoricRows } from "@/content/vocab/groups/g370-writing-studies";
import { hapticsRows } from "@/content/vocab/groups/g371-haptics";
import { nutritionScienceRows } from "@/content/vocab/groups/g372-nutrition-science";
import { syntheticBiologyRows } from "@/content/vocab/groups/g373-synthetic-biology";
import { lawEconomicsRows } from "@/content/vocab/groups/g374-law-economics";
import { behavioralEconomicsRows } from "@/content/vocab/groups/g375-behavioral-economics";
import { infectiousDiseaseRows } from "@/content/vocab/groups/g376-infectious-disease";
import { cosmologyRows } from "@/content/vocab/groups/g377-cosmology";
import { forestryRows } from "@/content/vocab/groups/g378-forestry";
import { affectiveComputingRows } from "@/content/vocab/groups/g379-affective-computing";
import { pharmaceuticalScienceRows } from "@/content/vocab/groups/g380-pharmaceutical-science";
import { pedagogyRows } from "@/content/vocab/groups/g381-pedagogy";
import { quantumChemistryRows } from "@/content/vocab/groups/g382-quantum-chemistry";
import { soundEngineeringRows } from "@/content/vocab/groups/g383-sound-engineering";
import { regulatoryScienceRows } from "@/content/vocab/groups/g384-regulatory-science";
import { graphTheoryRows } from "@/content/vocab/groups/g385-graph-theory";
import { dataGovernanceRows } from "@/content/vocab/groups/g386-data-governance";
import { boundaryLayerRows } from "@/content/vocab/groups/g387-boundary-layers";
import { philosophyOfScienceRows } from "@/content/vocab/groups/g388-philosophy-science";
import { photonicEngineeringRows } from "@/content/vocab/groups/g389-photonic-engineering";
import { rehabilitationEngineeringRows } from "@/content/vocab/groups/g390-rehabilitation-engineering";
import { bioethicsRows } from "@/content/vocab/groups/g391-bioethics";
import { ceramicsRows } from "@/content/vocab/groups/g392-ceramics";
import { decisionTheoryRows } from "@/content/vocab/groups/g393-decision-theory";
import { isotopeGeochemistryRows } from "@/content/vocab/groups/g394-isotope-geochemistry";
import { consultingRows } from "@/content/vocab/groups/g395-consulting";
import { quantumMaterialsRows } from "@/content/vocab/groups/g396-quantum-materials";
import { designThinkingRows } from "@/content/vocab/groups/g397-design-thinking";
import { polymerChemistryRows } from "@/content/vocab/groups/g398-polymer-chemistry";
import { cyberneticsRows } from "@/content/vocab/groups/g399-cybernetics";
import { urbanResilienceRows } from "@/content/vocab/groups/g400-urban-resilience";
import { foodEngineeringRows } from "@/content/vocab/groups/g401-food-engineering";
import { linguisticAnthropologyRows } from "@/content/vocab/groups/g402-linguistic-anthropology";
import { photonDetectionRows } from "@/content/vocab/groups/g403-photon-detection";
import { animalBehaviorRows } from "@/content/vocab/groups/g404-animal-behavior";
import { dataEthicsRows } from "@/content/vocab/groups/g405-data-ethics";
import { carbonMaterialsRows } from "@/content/vocab/groups/g406-carbon-materials";
import { computationalSocialScienceRows } from "@/content/vocab/groups/g407-computational-social-science";
import { erosionScienceRows } from "@/content/vocab/groups/g408-erosion-science";
import { ecosystemServicesRows } from "@/content/vocab/groups/g409-ecosystem-services";
import { pharmacoepidemiologyRows } from "@/content/vocab/groups/g410-pharmacoepidemiology";
import { neuroethicsRows } from "@/content/vocab/groups/g411-neuroethics";
import { stratigraphyRows } from "@/content/vocab/groups/g412-stratigraphy";
import { socialPsychologyRows } from "@/content/vocab/groups/g413-social-psychology";
import { materialsCharacterizationRows } from "@/content/vocab/groups/g414-materials-characterization";
import { sustainableAgricultureRows } from "@/content/vocab/groups/g415-sustainable-agriculture";
import { advancedComputingRows } from "@/content/vocab/groups/g416-advanced-computing";
import { healthEconomicsRows } from "@/content/vocab/groups/g417-health-economics";
import { advancedMathRows } from "@/content/vocab/groups/g418-advanced-math";
import { sportsMedicineRows } from "@/content/vocab/groups/g419-sports-medicine";
import { sustainableEnergyRows } from "@/content/vocab/groups/g420-sustainable-energy";
import { culturalHeritageRows } from "@/content/vocab/groups/g421-cultural-heritage";
import { biogeographyRows } from "@/content/vocab/groups/g422-biogeography";
import { renewableMaterialsRows } from "@/content/vocab/groups/g423-renewable-materials";
import { crisisManagementRows } from "@/content/vocab/groups/g424-crisis-management";
import { advancedPhotonicsRows } from "@/content/vocab/groups/g425-advanced-photonics";
import { neuroengineeringRows } from "@/content/vocab/groups/g426-neuroengineering";
import { emergingTechRows } from "@/content/vocab/groups/g427-emerging-tech";

/** Collocations for the original Day 1-7 words. */
const DAY_COLLOCATIONS: Record<string, string> = {
  hi: "say hi",
  hello: "hello everyone",
  bye: "bye for now",
  thanks: "many thanks",
  OK: "feel OK",
  name: "full name",
  my: "my house",
  your: "your turn",
  please: "yes please",
  sorry: "so sorry",
  one: "one time",
  two: "two hours",
  three: "three times",
  four: "four seasons",
  five: "five stars",
  old: "an old friend",
  family: "family members",
  mom: "my mom",
  dad: "my dad",
  he: "he says",
  she: "she says",
  color: "favorite color",
  red: "deep red",
  blue: "dark blue",
  green: "green tea",
  white: "white shirt",
  black: "black coffee",
  water: "drink water",
  coffee: "hot coffee",
  tea: "iced tea",
  milk: "a glass of milk",
  want: "want more",
  drink: "something to drink",
  nice: "nice work",
  meet: "meet up",
  you: "thank you",
  too: "me too",
  good: "good job",
};

const [chunkA, chunkB, chunkC, chunkD, chunkE, chunkF, chunkG, chunkH, chunkI, chunkJ, chunkK, chunkL, chunkM, chunkN, chunkO1, chunkO2, chunkO3, chunkP, chunkQ, chunkR, chunkS] =
  await Promise.all([
    import("@/content/vocab/chunks/chunk-a"),
    import("@/content/vocab/chunks/chunk-b"),
    import("@/content/vocab/chunks/chunk-c"),
    import("@/content/vocab/chunks/chunk-d"),
    import("@/content/vocab/chunks/chunk-e"),
    import("@/content/vocab/chunks/chunk-f"),
    import("@/content/vocab/chunks/chunk-g"),
    import("@/content/vocab/chunks/chunk-h"),
    // Phase 15-A: C1/C2 expansion (chunks i/j/k carry C2VocabRow rows).
    import("@/content/vocab/chunks/chunk-i"),
    import("@/content/vocab/chunks/chunk-j"),
    import("@/content/vocab/chunks/chunk-k"),
    // Phase 16-A: C2 expansion wave 2 (chunks l/m/n/o1/o2/o3).
    import("@/content/vocab/chunks/chunk-l"),
    import("@/content/vocab/chunks/chunk-m"),
    import("@/content/vocab/chunks/chunk-n"),
    import("@/content/vocab/chunks/chunk-o1"),
    import("@/content/vocab/chunks/chunk-o2"),
    import("@/content/vocab/chunks/chunk-o3"),
    // Phase 18: C2 expansion wave 3 (chunk p).
    import("@/content/vocab/chunks/chunk-p"),
    // Phase 18: C2 expansion wave 4 (chunks q/r/s — 13 new domains).
    import("@/content/vocab/chunks/chunk-q"),
    import("@/content/vocab/chunks/chunk-r"),
    import("@/content/vocab/chunks/chunk-s"),
  ]);

const GROUP_ROWS: readonly VocabRow[] = [
  ...chunkA.ROWS,
  ...chunkB.ROWS,
  ...chunkC.ROWS,
  ...chunkD.ROWS,
  ...chunkE.ROWS,
  ...chunkF.ROWS,
  ...chunkG.ROWS,
  ...chunkH.ROWS,
];

// Phase 15-A: C2 rows are merged into `byId` after GROUP_ROWS below.

function fromDayEntry(entry: {
  id: string;
  word: string;
  zh: string;
  ipa: string;
  pos: string;
  difficulty: number;
  example: { en: string; zh: string };
}): LexicalEntryV2 {
  const col = DAY_COLLOCATIONS[entry.word];
  return {
    id: entry.id,
    word: entry.word,
    zh: entry.zh,
    ipa: entry.ipa,
    pos: entry.pos,
    frequencyBand: 2,
    difficulty: entry.difficulty,
    example: entry.example,
    collocations: col ? [col] : [],
    wordFamilyIds: [],
    synonymIds: [],
    antonymIds: [],
    confusionPairIds: [],
  };
}

function fromRow(row: VocabRow): LexicalEntryV2 {
  const id = `w:${row.word.toLowerCase()}`;
  return {
    id,
    word: row.word,
    zh: row.zh,
    ipa: row.ipa,
    pos: row.pos,
    frequencyBand: row.band,
    difficulty: row.diff,
    example: { en: row.exEn, zh: row.exZh },
    collocations: [row.col],
    wordFamilyIds: (row.extra?.fam ?? []).map((w) => `w:${w.toLowerCase()}`),
    synonymIds: (row.extra?.syn ?? []).map((w) => `w:${w.toLowerCase()}`),
    antonymIds: (row.extra?.ant ?? []).map((w) => `w:${w.toLowerCase()}`),
    confusionPairIds: [],
  };
}

const byId = new Map<string, LexicalEntryV2>();
for (const day of DAYS) {
  for (const entry of day.vocab) {
    if (!byId.has(entry.id)) byId.set(entry.id, fromDayEntry(entry));
  }
}
for (const row of GROUP_ROWS) {
  const entry = fromRow(row);
  if (!byId.has(entry.id)) byId.set(entry.id, entry);
}

// Phase 15-A + 16-A: C2 rows merged via toVocabRow(), with the CEFR display
// layer (level/register/usage/nuance) attached for the Library UI.
for (const chunk of [
  chunkI.C2_ROWS_I,
  chunkJ.C2_ROWS_J,
  chunkK.C2_ROWS_K,
  chunkL.C2_ROWS_L,
  chunkM.C2_ROWS_M,
  chunkN.C2_ROWS_N,
  chunkO1.C2_ROWS_O1,
  chunkO2.C2_ROWS_O2,
  chunkO3.C2_ROWS_O3,
  chunkP.C2_ROWS_P,
  chunkQ.C2_ROWS_Q,
  chunkR.C2_ROWS_R,
  chunkS.C2_ROWS_S,
  internationalRelationsRows,
  mediaStudiesRows,
  linguisticsRows,
  dataScienceRows,
  architectureDesignRows,
  politicalScienceRows,
  economicsAdvancedRows,
  neuroscienceRows,
  marineScienceRows,
  educationPedagogyRows,
  legalTheoryRows,
  healthcareSystemsRows,
  philosophyScienceRows,
  urbanStudiesRows,
  behavioralScienceRows,
  mathematicsRows,
  chemistryRows,
  physicsRows,
  materialsScienceRows,
  astronomyRows,
  computerScienceRows,
  businessStrategyRows,
  cognitivePsychologyRows,
  geographyRows,
  performingArtsRows,
  musicTheoryRows,
  environmentalChemistryRows,
  developmentStudiesRows,
  informationTheoryRows,
  sociologyKnowledgeRows,
  roboticsRows,
  biomedicalEngineeringRows,
  organizationalBehaviorRows,
  quantumComputingRows,
  mediaProductionRows,
  photographyRows,
  cryptographyRows,
  econometricsRows,
  anthropologyRows,
  civilEngineeringRows,
  foodScienceRows,
  journalismRows,
  linguisticsAppliedRows,
  supplyChainRows,
  realEstateRows,
  militaryScienceRows,
  filmStudiesRows,
  ecologyRows,
  philosophyMindRows,
  renewableEnergyRows,
  archaeologyRows,
  telecommunicationsRows,
  publicHealthRows,
  graphicDesignRows,
  socialWorkRows,
  transportationRows,
  comparativeLiteratureRows,
  biostatisticsRows,
  chemicalEngineeringRows,
  ethicsTechnologyRows,
  cognitiveNeuroscienceRows,
  projectManagementRows,
  advancedStatisticsRows,
  urbanPlanningRows,
  forensicScienceRows,
  materialsEngineeringRows,
  advancedAccountingRows,
  astrobiologyRows,
  operationsResearchRows,
  phoneticsPhonologyRows,
  healthInformaticsRows,
  theaterDesignRows,
  nanotechnologyRows,
  intellectualHistoryRows,
  sportsScienceRows,
  organicChemistryRows,
  chinaStudiesRows,
  microbiologyRows,
  technologyEthicsPolicyRows,
  pureMathematicsRows,
  japanStudiesRows,
  sustainableDesignRows,
  scienceCommunicationRows,
  cognitiveLinguisticsRows,
  quantitativeFinanceRows,
  politicalPhilosophyRows,
  algorithmicFairnessRows,
  medicalImagingRows,
  geopoliticsRows,
  soilScienceRows,
  aestheticsRows,
  socialNetworkAnalysisRows,
  waterResourcesRows,
  opticsRows,
  publicAdministrationRows,
  electricalEngineeringRows,
  syntaxGrammarTheoryRows,
  genomicsBioinformaticsRows,
  culturalStudiesRows,
  computerNetworkingRows,
  demographyPopulationStudiesRows,
  civilRightsSocialJusticeRows,
  glaciologyCryosphereRows,
  entrepreneurshipInnovationRows,
  museumStudiesCuratorialRows,
  remoteSensingRows,
  philosophyMindRows2,
  advancedMaterialsScienceRows,
  moralPhilosophyRows,
  semanticsPragmaticsRows,
  geophysicsRows,
  urbanGeographyRows,
  neuropharmacologyRows,
  philosophyLanguageRows,
  rockMechanicsRows,
  professionalPhotographyRows,
  chemicalSafetyRows,
  culturalAnthropologyRows,
  supplyChainManagementRows,
  educationalPsychologyRows,
  paleontologyRows,
  quantumInformationRows,
  translationStudiesRows,
  ecosystemEcologyRows,
  publicHealthEpidemiologyRows,
  criminologyRows,
  roboticsMechatronicsRows,
  internationalLawRows,
  computationalLinguisticsRows,
  complexityScienceRows,
  biomaterialsBiomedicalRows,
  economicGeographyRows,
  mathematicalPhysicsRows,
  foodScienceAdvancedRows,
  transportPlanningRows,
  veterinaryMedicineRows,
  materialsProcessingRows,
  musicTheoryCompositionRows,
  microfluidicsRows,
  robotEthicsRows,
  environmentalJusticeRows,
  textileEngineeringRows,
  distributedSystemsRows,
  astronomyAstrophysicsRows,
  writingStudiesRhetoricRows,
  hapticsRows,
  nutritionScienceRows,
  syntheticBiologyRows,
  lawEconomicsRows,
  behavioralEconomicsRows,
  infectiousDiseaseRows,
  cosmologyRows,
  forestryRows,
  affectiveComputingRows,
  pharmaceuticalScienceRows,
  pedagogyRows,
  quantumChemistryRows,
  soundEngineeringRows,
  regulatoryScienceRows,
  graphTheoryRows,
  dataGovernanceRows,
  boundaryLayerRows,
  philosophyOfScienceRows,
  photonicEngineeringRows,
  rehabilitationEngineeringRows,
  bioethicsRows,
  ceramicsRows,
  decisionTheoryRows,
  isotopeGeochemistryRows,
  consultingRows,
  quantumMaterialsRows,
  designThinkingRows,
  polymerChemistryRows,
  cyberneticsRows,
  urbanResilienceRows,
  foodEngineeringRows,
  linguisticAnthropologyRows,
  photonDetectionRows,
  animalBehaviorRows,
  dataEthicsRows,
  carbonMaterialsRows,
  computationalSocialScienceRows,
  erosionScienceRows,
  ecosystemServicesRows,
  pharmacoepidemiologyRows,
  neuroethicsRows,
  stratigraphyRows,
  socialPsychologyRows,
  materialsCharacterizationRows,
  sustainableAgricultureRows,
  advancedComputingRows,
  healthEconomicsRows,
  advancedMathRows,
  sportsMedicineRows,
  sustainableEnergyRows,
  culturalHeritageRows,
  biogeographyRows,
  renewableMaterialsRows,
  crisisManagementRows,
  advancedPhotonicsRows,
  neuroengineeringRows,
  emergingTechRows,
]) {
  for (const c2row of chunk) {
    const mapped = toVocabRow(c2row);
    const id = `w:${mapped.word.toLowerCase()}`;
    if (!byId.has(id)) {
      byId.set(id, {
        id,
        word: mapped.word,
        zh: mapped.zh,
        ipa: mapped.ipa,
        pos: mapped.pos,
        frequencyBand: mapped.band,
        difficulty: mapped.diff,
        example: { en: mapped.exEn, zh: mapped.exZh },
        collocations: [mapped.col],
        wordFamilyIds: [],
        // Phase 23 (P0-7): subset-wire the C2 display-layer synonyms/antonyms
        // into the ID graph. Only words that resolve to an EXISTING lexical id
        // are linked (no new words invented); unresolvable display strings are
        // left out so getDanglingRelations() stays empty. This is honest
        // partial closure of the Phase-22 relation-graph gap.
        synonymIds: resolveRelationIds(byId, c2row.synonyms),
        antonymIds: resolveRelationIds(byId, c2row.antonyms),
        confusionPairIds: [],
        level: c2row.level,
        register: c2row.register,
        usage: c2row.usage,
        meaningNuance: c2row.meaningNuance,
      });
    }
  }
}

/**
 * Resolve a list of display-layer relation words to lexical ids, keeping only
 * entries that already exist in `byId`. Deterministic and dangling-free.
 */
function resolveRelationIds(
  byIdMap: Map<string, LexicalEntryV2>,
  words: readonly string[],
): string[] {
  const out: string[] = [];
  for (const w of words) {
    if (!w) continue;
    const id = `w:${w.toLowerCase()}`;
    if (byIdMap.has(id) && !out.includes(id)) out.push(id);
  }
  return out;
}

// Auto-link minimal pairs (both endpoints must exist; validated by tests).
for (const pair of MINIMAL_PAIRS) {
  const a = byId.get(`w:${pair.aWord}`);
  const b = byId.get(`w:${pair.bWord}`);
  if (a && b) {
    a.confusionPairIds.push(b.id);
    b.confusionPairIds.push(a.id);
  }
}

export const ALL_LEXICAL: readonly LexicalEntryV2[] = [...byId.values()].sort((a, b) =>
  a.id.localeCompare(b.id),
);

const LEXICAL_BY_ID = new Map(ALL_LEXICAL.map((entry) => [entry.id, entry]));

export function findLexical(idOrWord: string): LexicalEntryV2 | null {
  const key = idOrWord.startsWith("w:") ? idOrWord.toLowerCase() : `w:${idOrWord.toLowerCase()}`;
  return LEXICAL_BY_ID.get(key) ?? null;
}

export function allLexical(): readonly LexicalEntryV2[] {
  return ALL_LEXICAL;
}

export function lexicalCount(): number {
  return ALL_LEXICAL.length;
}

/** Audit helper - tests assert this is always empty. */
export function getDanglingRelations(): string[] {
  const bad: string[] = [];
  for (const entry of ALL_LEXICAL) {
    const groups: Array<[string, readonly string[]]> = [
      ["fam", entry.wordFamilyIds],
      ["syn", entry.synonymIds],
      ["ant", entry.antonymIds],
      ["conf", entry.confusionPairIds],
    ];
    for (const [label, targets] of groups) {
      for (const target of targets) {
        if (!LEXICAL_BY_ID.has(target)) bad.push(`${entry.id}:${label}->${target}`);
      }
    }
  }
  return bad;
}

/**
 * Resolves once every vocabulary chunk has been registered. Already true at
 * module-eval time (top-level await), but kept as the single seam for future
 * true on-demand loading and for async callers to await explicitly.
 */
export async function ensureVocabularyLoaded(): Promise<void> {
  // Top-level await above already registered all chunks; nothing left to do.
}

export type { LexicalEntryV2 };
