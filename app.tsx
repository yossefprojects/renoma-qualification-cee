import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  FileText,
  Home,
  Mail,
  MapPin,
  Phone,
  Printer,
  Thermometer,
  User,
  XCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Renoma Energy — Qualification Prospect / Simulateur de qualification CEE   */
/*                                                                            */
/*  Wizard 7 étapes :                                                         */
/*   1. Type de site   2. Identification   3. Questions techniques            */
/*   4. Qualification CEE (analyse auto)   5. Résultats                       */
/*   6. Rapport (récap + documents)        7. Rapport formel imprimable       */
/*                                                                            */
/*  ⚠️ Le CATALOGUE de fiches CEE (codes, seuils, conditions, documents) est  */
/*     centralisé dans RULES ci-dessous. Les seuils visibles sur les          */
/*     maquettes sont repris ; les codes/fiches non confirmés sont à valider  */
/*     avec la base de référence RENOMA (marqués « à valider »).              */
/* -------------------------------------------------------------------------- */

const HEADING = { fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" } as const;
const COMPANY_NAME = "RENOMA ENERGY";
const COMPANY_TAGLINE = "Changer l'énergie ensemble";

/* ----------------------------------- Steps -------------------------------- */

const STEPS = [
  { name: "Type de site", icon: MapPin },
  { name: "Identification", icon: User },
  { name: "Questions techniques", icon: Thermometer },
  { name: "Qualification CEE", icon: CheckCircle2 },
  { name: "Résultats", icon: CheckCircle2 },
  { name: "Rapport", icon: FileText },
  { name: "", icon: FileText },
] as const;

const ZONES = [
  { key: "metropole", label: "Métropole", icon: Home },
  { key: "dom-tom", label: "DOM-TOM", icon: MapPin },
] as const;

interface SiteType {
  key: string;
  label: string;
  emoji: string;
}

const SITE_TYPES: SiteType[] = [
  { key: "hotellerie", label: "Hôtellerie", emoji: "🏨" },
  { key: "hospitalier", label: "Établissement hospitalier", emoji: "🏥" },
  { key: "distribution", label: "Grande Distribution Alimentaire", emoji: "🛒" },
  { key: "entrepot_non_refrigere", label: "Entrepôt Non Réfrigéré", emoji: "📦" },
  { key: "entrepot_frigorifique", label: "Entrepôt Frigorifique", emoji: "❄️" },
  { key: "centre_commercial", label: "Centre Commercial", emoji: "🏬" },
  { key: "datacenter", label: "Datacenter", emoji: "🖥️" },
  { key: "bureaux", label: "Immeuble de Bureaux", emoji: "🏢" },
  { key: "agricole", label: "Site Agricole", emoji: "🌾" },
  { key: "scolaire", label: "Établissement Scolaire", emoji: "🎓" },
  { key: "industriel", label: "Site Industriel", emoji: "🏭" },
];

/* --------------------------------- Fields --------------------------------- */

type Field =
  | { kind: "select"; key: string; label: string; options: string[]; placeholder?: string; span?: "full" }
  | { kind: "boolselect"; key: string; label: string; span?: "full" }
  | { kind: "number"; key: string; label: string; placeholder?: string; span?: "full" }
  | { kind: "text"; key: string; label: string; placeholder?: string; span?: "full" }
  | { kind: "bool"; key: string; label: string; span?: "full" }
  | { kind: "checkgroup"; key: string; label: string; options: string[]; span?: "full" }
  | { kind: "group"; key: string; label: string; fields: Field[]; showIf?: string; tone?: "sky" }
  | { kind: "spacer"; key: string };

const CHAUFFAGE = [
  "Gaz naturel",
  "Fioul",
  "Électrique",
  "Réseau de chaleur urbain",
  "Vapeur",
  "Aucun",
];

const FLUIDES = ["CO₂ (R744)", "Ammoniac (R717)", "HFC (R404A, R134a…)", "HFO", "Autre"];
const POSITIONNEMENT_GF = ["Intérieur", "Extérieur / toiture", "Mixte"];
const USAGE_CHALEUR = [
  "Chauffage des locaux",
  "Eau chaude sanitaire",
  "Réseau de chaleur",
  "Process industriel",
  "Aucun usage identifié",
];
const EMETTEURS = [
  "Radiateurs eau chaude",
  "Plancher chauffant",
  "Ventilo-convecteurs",
  "Aérothermes",
  "Air pulsé (CTA)",
  "Mixte",
];
const ESPACE_TECHNIQUE = ["Local intérieur", "Cabane extérieure possible", "Non"];

/* Questions techniques (étape 3) — un jeu par type de site.
   Les libellés reprennent les seuils visibles sur les maquettes. */
const TECH_FIELDS: Record<string, Field[]> = {
  hotellerie: [
    { kind: "number", key: "nbChambres", label: "Nombre de chambres (seuil: 200)", placeholder: "Ex: 250" },
    { kind: "number", key: "surface", label: "Surface chauffée totale (m²)", placeholder: "Ex: 5000" },
    { kind: "select", key: "chauffage", label: "Mode de chauffage actuel", options: CHAUFFAGE },
    {
      kind: "bool",
      key: "groupesFroids",
      label: "Présence de groupes froids (climatisation, cuisine froide) ?",
      span: "full",
    },
    {
      kind: "checkgroup",
      key: "equipements",
      label: "Équipements de l'hôtel",
      options: ["Restaurant", "Laverie / Lingerie", "Spa / Bien-être", "Piscine"],
      span: "full",
    },
  ],
  hospitalier: [
    {
      kind: "select",
      key: "typeEtablissement",
      label: "Type d'établissement",
      options: ["CHU", "Clinique privée", "EHPAD", "Centre de soins", "Autre"],
    },
    { kind: "number", key: "surface", label: "Surface totale chauffée (m²)", placeholder: "Ex: 8000" },
    {
      kind: "checkgroup",
      key: "equipements",
      label: "Équipements spécifiques présents",
      options: ["Salle d'opération", "IRM", "Morgue", "Radiologie", "Aucun"],
      span: "full",
    },
    { kind: "bool", key: "groupesFroids", label: "Présence de groupes froids ?", span: "full" },
    {
      kind: "group",
      key: "froidHospi",
      label: "",
      tone: "sky",
      showIf: "groupesFroids",
      fields: [
        { kind: "number", key: "puissanceCompresseurs", label: "Puissance compresseurs (kW)", placeholder: "Ex: 120" },
        {
          kind: "select",
          key: "usagePrincipal",
          label: "Usage principal",
          options: ["Process médical", "Confort", "Mixte"],
        },
        { kind: "bool", key: "recuperateur", label: "Récupérateur déjà installé ?" },
      ],
    },
    { kind: "select", key: "chauffage", label: "Mode de chauffage", options: CHAUFFAGE },
    { kind: "boolselect", key: "gtb", label: "GTB/GTC existante ?" },
  ],
  distribution: [
    { kind: "number", key: "surfaceVente", label: "Surface de vente (m²) - seuil: 1200 m²", placeholder: "Ex: 2500" },
    { kind: "number", key: "hauteur", label: "Hauteur sous plafond (m)", placeholder: "Ex: 6" },
    {
      kind: "select",
      key: "centraleCO2",
      label: "Centrale CO2 transcritique ?",
      options: ["Oui", "Non", "Je ne sais pas"],
    },
    { kind: "bool", key: "centralesFroides", label: "Présence de centrales froides ?", span: "full" },
    { kind: "select", key: "chauffage", label: "Mode de chauffage", options: CHAUFFAGE },
    { kind: "boolselect", key: "gtb", label: "GTB/GTC existante ?" },
  ],
  entrepot_non_refrigere: [
    {
      kind: "number",
      key: "surface",
      label: "Surface chauffée (m²) - seuils: GTB 2000 / Destrat 1000",
      placeholder: "Ex: 5000",
    },
    { kind: "number", key: "hauteur", label: "Hauteur sous plafond (m) - seuil destrat: 4m", placeholder: "Ex: 8" },
    { kind: "select", key: "chauffage", label: "Mode de chauffage actuel", options: CHAUFFAGE },
    { kind: "text", key: "ageChaudiere", label: "Âge de la chaudière (si gaz/fioul)", placeholder: "Ex: 15 ans" },
    { kind: "boolselect", key: "gtb", label: "GTB/Régulation existante ?" },
  ],
  entrepot_frigorifique: [
    { kind: "number", key: "surfacePositive", label: "Surface réfrigérée positive (m²)", placeholder: "Ex: 2000" },
    { kind: "number", key: "surfaceNegative", label: "Surface réfrigérée négative (m²)", placeholder: "Ex: 500" },
    { kind: "number", key: "nbGroupesFroids", label: "Nombre de groupes froids", placeholder: "Ex: 4" },
    { kind: "number", key: "puissanceCompresseurs", label: "Puissance compresseurs totale (kW)", placeholder: "Ex: 200" },
    { kind: "select", key: "fluide", label: "Fluide frigorigène", options: FLUIDES },
    { kind: "bool", key: "recuperateur", label: "Récupérateur existant ?" },
    {
      kind: "group",
      key: "zoneChauffable",
      label: "Zone chauffable (bureaux, expédition…)",
      fields: [
        { kind: "number", key: "surfaceZone", label: "Surface zone chauffable (m²) - seuil: 800", placeholder: "Ex: 1000" },
        { kind: "number", key: "hauteurZone", label: "Hauteur zone chauffable (m)", placeholder: "Ex: 6" },
      ],
    },
    { kind: "select", key: "chauffageZone", label: "Mode de chauffage zone chauffable", options: CHAUFFAGE },
    { kind: "boolselect", key: "gtb", label: "GTB/GTC existante ?" },
  ],
  centre_commercial: [
    {
      kind: "number",
      key: "surfaceGalerie",
      label: "Surface galerie chauffée (m²) - seuil GTB: 5000",
      placeholder: "Ex: 8000",
    },
    { kind: "number", key: "hauteurGalerie", label: "Hauteur sous plafond galerie (m)", placeholder: "Ex: 5" },
    { kind: "select", key: "chauffage", label: "Mode de chauffage galerie", options: CHAUFFAGE },
    { kind: "boolselect", key: "gtc", label: "GTC existante ?" },
    {
      kind: "checkgroup",
      key: "equipementsPilotables",
      label: "Équipements pilotables présents",
      options: ["CVC", "Éclairage", "Ouvrants", "Escalators"],
      span: "full",
    },
  ],
  datacenter: [
    {
      kind: "group",
      key: "groupesFroids",
      label: "Groupes froids",
      fields: [
        { kind: "number", key: "nbGroupesFroids", label: "Nombre de groupes froids", placeholder: "Ex: 8" },
        { kind: "number", key: "puissanceCompresseurs", label: "Puissance compresseurs totale (kW)", placeholder: "Ex: 500" },
        { kind: "select", key: "positionnementGF", label: "Positionnement des GF", options: POSITIONNEMENT_GF },
        { kind: "select", key: "fluide", label: "Fluide frigorigène", options: FLUIDES },
        { kind: "bool", key: "recuperateur", label: "Récupérateur existant ?" },
      ],
    },
    { kind: "number", key: "puissanceIT", label: "Puissance IT installée (kW)", placeholder: "Ex: 1000" },
    { kind: "number", key: "surfaceChauffable", label: "Surface chauffable attenante (m²)", placeholder: "Ex: 2000" },
    { kind: "select", key: "usageChaleur", label: "Usage identifié pour la chaleur récupérée", options: USAGE_CHALEUR },
    { kind: "spacer", key: "_dc1" },
    { kind: "boolselect", key: "gtb", label: "GTB/GTC existante ?" },
    { kind: "spacer", key: "_dc2" },
  ],
  bureaux: [
    {
      kind: "number",
      key: "surface",
      label: "Surface chauffée (m²) - seuils: GTB 2000 / PAC 3000",
      placeholder: "Ex: 3500",
    },
    { kind: "select", key: "chauffage", label: "Mode de chauffage actuel", options: CHAUFFAGE },
    { kind: "boolselect", key: "gtb", label: "GTB/GTC existante ?" },
    { kind: "spacer", key: "_bx1" },
    { kind: "text", key: "ageChaudiere", label: "Âge de la chaudière (si gaz/fioul)", placeholder: "Ex: 15 ans" },
    { kind: "select", key: "emetteurs", label: "Émetteurs en place", options: EMETTEURS },
  ],
  agricole: [
    {
      kind: "select",
      key: "activite",
      label: "Type d'activité",
      options: ["Élevage bovin (lait)", "Élevage porcin", "Élevage avicole", "Maraîchage / serres", "Autre"],
    },
    { kind: "number", key: "surface", label: "Surface des bâtiments (m²)", placeholder: "Ex: 2000" },
    { kind: "bool", key: "tankLait", label: "Présence d'un tank à lait ?", span: "full" },
    { kind: "select", key: "chauffage", label: "Mode de chauffage", options: CHAUFFAGE },
    { kind: "boolselect", key: "recuperateur", label: "Pré-refroidisseur / récupérateur existant ?" },
  ],
  scolaire: [
    {
      kind: "select",
      key: "typeEtablissement",
      label: "Type d'établissement",
      options: ["École primaire", "Collège", "Lycée", "Université", "Centre de formation"],
    },
    { kind: "number", key: "surface", label: "Surface chauffée (m²) - seuil PAC: 3000", placeholder: "Ex: 4000" },
    { kind: "select", key: "chauffage", label: "Mode de chauffage actuel", options: CHAUFFAGE },
    { kind: "text", key: "ageChaudiere", label: "Âge de la chaudière (si gaz/fioul)", placeholder: "Ex: 20 ans" },
    { kind: "select", key: "espaceTechnique", label: "Espace technique disponible", options: ESPACE_TECHNIQUE },
    { kind: "bool", key: "gymnase", label: "Gymnase ou salle de sport présent(e) ?", span: "full" },
  ],
  industriel: [
    {
      kind: "group",
      key: "sources",
      label: "Sources de chaleur fatale",
      fields: [
        { kind: "number", key: "fourPuissance", label: "Fours — puissance (kW) - seuil: 400", placeholder: "Ex: 600" },
        { kind: "number", key: "fourQuantite", label: "Fours — quantité", placeholder: "Ex: 2" },
        { kind: "number", key: "groupeFroidPuissance", label: "Groupes froid — puissance (kW) - seuil: 300", placeholder: "Ex: 400" },
        { kind: "number", key: "groupeFroidQuantite", label: "Groupes froid — quantité", placeholder: "Ex: 3" },
        { kind: "number", key: "compresseurPuissance", label: "Compresseur d'air — puissance (kW) - seuil: 200", placeholder: "Ex: 250" },
        { kind: "number", key: "compresseurQuantite", label: "Compresseur d'air — quantité", placeholder: "Ex: 2" },
        { kind: "number", key: "toursAeroPuissance", label: "Tours aéroréfrigérantes — puissance (kW)", placeholder: "Ex: 150" },
        { kind: "number", key: "toursAeroQuantite", label: "Tours aéroréfrigérantes — quantité", placeholder: "Ex: 1" },
      ],
    },
    {
      kind: "group",
      key: "besoins",
      label: "Besoins thermiques valorisables",
      fields: [
        { kind: "number", key: "besoinChauffageSurface", label: "Chauffage — surface (m²) - seuil: 2000", placeholder: "Ex: 3000" },
        { kind: "number", key: "besoinEcsVolume", label: "ECS — volume (m³) - seuil: 10", placeholder: "Ex: 20" },
        { kind: "bool", key: "besoinProcess", label: "Besoin process industriel ?" },
      ],
    },
    { kind: "select", key: "chauffage", label: "Mode de chauffage actuel", options: CHAUFFAGE },
    { kind: "boolselect", key: "gtb", label: "GTB/GTC existante ?" },
  ],
};

/* ------------------------- Moteur de qualification ------------------------ */

type DataMap = Record<string, any>;
type Status = "eligible" | "a_verifier" | "non_eligible";
type EvalResult = { status: Status; reason?: string };
type Evaluator = (t: DataMap) => EvalResult;

interface OpRule {
  code: string;
  name: string;
  description: string;
  documents: string[];
  evaluate: Evaluator;
}

interface OpResult {
  code: string;
  name: string;
  description: string;
  documents: string[];
  status: Status;
  reason?: string;
}

function parseNum(v: unknown): number {
  const n = parseFloat(String(v ?? "").replace(/[^\d.,]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function getSurface(t: DataMap): number {
  for (const k of Object.keys(t)) {
    if (/surface/i.test(k)) {
      const n = parseNum(t[k]);
      if (n) return n;
    }
  }
  return 0;
}

/* Zonage climatique CEE (H1/H2/H3) déduit du code postal de l'adresse.
   H2 et H3 explicites ; tout autre département métropolitain = H1 ; DOM = aucune. */
const ZONE_H2 = new Set([
  "04", "07", "09", "12", "16", "17", "18", "22", "24", "26", "29", "31", "32", "33", "35", "36", "37",
  "40", "41", "44", "46", "47", "48", "49", "50", "53", "56", "64", "65", "72", "79", "81", "82", "84", "85", "86",
]);
const ZONE_H3 = new Set(["06", "11", "13", "20", "2A", "2B", "30", "34", "66", "83"]);

function deptFromAddress(addr: string): string {
  const m = (addr || "").match(/\b(\d{5})\b/);
  return m ? m[1].slice(0, 2) : "";
}

function climateZone(addr: string): "H1" | "H2" | "H3" | null {
  const d = deptFromAddress(addr);
  if (!d) return null;
  if (ZONE_H3.has(d)) return "H3";
  if (ZONE_H2.has(d)) return "H2";
  if (/^(0[1-9]|[1-8]\d|9[0-5])$/.test(d)) return "H1";
  return null;
}

const isReplaceable = (c?: string) => /gaz|fioul|électr|electr|vapeur/i.test(c || "");
const gtbExisting = (t: DataMap): string => (t.gtb as string) || (t.gtc as string) || "Non";

function evalPAC(t: DataMap, surfaceKey?: string, seuil?: number): EvalResult {
  const surface = surfaceKey ? parseNum(t[surfaceKey]) : getSurface(t);
  const chauffage = (t.chauffage as string) || (t.chauffageZone as string) || "";
  if (!surface) return { status: "a_verifier", reason: "À confirmer : Surface chauffée à renseigner" };
  if (seuil && surface < seuil)
    return { status: "non_eligible", reason: `Surface inférieure au seuil PAC (${seuil} m²)` };
  if (!chauffage || /aucun/i.test(chauffage))
    return { status: "a_verifier", reason: "À confirmer : mode de chauffage à préciser" };
  if (isReplaceable(chauffage)) return { status: "eligible" };
  return { status: "a_verifier", reason: "À confirmer selon l'énergie de chauffage en place" };
}

function evalGTB(surfaceKey: string, seuil: number): Evaluator {
  return (t) => {
    if (gtbExisting(t) === "Oui") return { status: "non_eligible", reason: "GTB/GTC déjà en place" };
    const surface = parseNum(t[surfaceKey]) || getSurface(t);
    if (!surface) return { status: "a_verifier", reason: "À confirmer : surface à renseigner" };
    if (surface >= seuil) return { status: "eligible" };
    return { status: "non_eligible", reason: `Surface inférieure au seuil (${seuil} m²)` };
  };
}

function evalDestrat(t: DataMap): EvalResult {
  const s = parseNum(t.surface);
  const h = parseNum(t.hauteur);
  if (!s || !h) return { status: "a_verifier", reason: "À confirmer : surface et hauteur à renseigner" };
  if (h < 4) return { status: "non_eligible", reason: "Hauteur sous plafond < 4 m" };
  if (s >= 1000) return { status: "eligible" };
  return { status: "non_eligible", reason: "Surface inférieure au seuil (1000 m²)" };
}

function fichePAC(surfaceKey?: string, seuil?: number): OpRule {
  return {
    code: "BAT-TH-163/164",
    name: "Pompe à chaleur de type air/eau ou eau/eau",
    description: "Remplacement du chauffage par une pompe à chaleur",
    documents: ["Plans du local technique / chaufferie"],
    evaluate: (t) => evalPAC(t, surfaceKey, seuil),
  };
}

function ficheGTB(surfaceKey: string, seuil: number): OpRule {
  return {
    code: "BAT-TH-116",
    name: "Système de gestion technique du bâtiment",
    description: "Mise en place d'une gestion technique du bâtiment (classe A/B)",
    documents: ["Synoptique CVC / schéma de principe", "Inventaire des points de comptage"],
    evaluate: evalGTB(surfaceKey, seuil),
  };
}

function ficheGTBrooms(seuil: number): OpRule {
  return {
    code: "BAT-TH-116",
    name: "Système de gestion technique du bâtiment",
    description: "Mise en place d'une gestion technique du bâtiment (classe A/B)",
    documents: ["Synoptique CVC / schéma de principe", "Inventaire des points de comptage"],
    evaluate: (t) => {
      if (gtbExisting(t) === "Oui") return { status: "non_eligible", reason: "GTB/GTC déjà en place" };
      const n = parseNum(t.nbChambres);
      if (!n) return { status: "a_verifier", reason: "À confirmer : nombre de chambres à renseigner" };
      if (n >= seuil) return { status: "eligible" };
      return { status: "non_eligible", reason: `Nombre de chambres inférieur au seuil (${seuil})` };
    },
  };
}

const FICHE_DESTRAT: OpRule = {
  code: "BAT-TH-142",
  name: "Système de déstratification d'air",
  description: "Installation de déstratificateurs ou brasseurs d'air",
  documents: ["Plan de l'entrepôt avec hauteurs sous plafond"],
  evaluate: evalDestrat,
};

const FICHE_MEUBLES: OpRule = {
  code: "BAT-EQ-124",
  name: "Fermeture des meubles frigorifiques de vente à température positive",
  description: "Pose de portes/fermetures sur meubles frigorifiques de vente",
  documents: ["Linéaire et inventaire des meubles froids"],
  evaluate: (t) => {
    if (!t.centralesFroides) return { status: "a_verifier", reason: "À confirmer : présence de meubles/centrales froides" };
    return { status: "eligible" };
  },
};

const FICHE_RECUP: OpRule = {
  code: "IND-UT-139",
  name: "Système de stockage de chaleur fatale",
  description: "Récupération et valorisation de la chaleur fatale du froid",
  documents: ["Schéma frigorifique", "Puissances et régimes des groupes froids"],
  evaluate: (t) => {
    if (t.recuperateur) return { status: "non_eligible", reason: "Récupérateur déjà installé" };
    const p = parseNum(t.puissanceCompresseurs);
    if (!p) return { status: "a_verifier", reason: "À confirmer : puissance compresseurs à renseigner" };
    return { status: "eligible" };
  },
};

const FICHE_VEV: OpRule = {
  code: "IND-UT-102",
  name: "Variation électronique de vitesse (VEV) sur moteur asynchrone",
  description: "Variateur électronique de vitesse sur moteur de compresseur",
  documents: ["Fiches techniques des compresseurs"],
  evaluate: (t) => {
    const p = parseNum(t.puissanceCompresseurs);
    if (!p) return { status: "a_verifier", reason: "À confirmer : puissance compresseurs à renseigner" };
    return { status: "eligible" };
  },
};

const FICHE_RECUP_DC: OpRule = {
  code: "IND-UT-139",
  name: "Système de stockage de chaleur fatale",
  description: "Récupération et valorisation de la chaleur fatale des groupes froids / IT",
  documents: ["Bilan thermique IT", "Schéma de récupération de chaleur"],
  evaluate: (t) => {
    if (t.recuperateur) return { status: "non_eligible", reason: "Récupérateur déjà installé" };
    const p = parseNum(t.puissanceCompresseurs) || parseNum(t.puissanceIT);
    if (!p) return { status: "a_verifier", reason: "À confirmer : puissance à renseigner" };
    if (!t.usageChaleur || /aucun/i.test(t.usageChaleur as string))
      return { status: "a_verifier", reason: "À confirmer : usage de la chaleur récupérée à identifier" };
    return { status: "eligible" };
  },
};

function ficheRecupFatale(opts: { presenceKey?: string; powerKey: string }): OpRule {
  return {
    code: "IND-UT-139",
    name: "Système de stockage de chaleur fatale",
    description: "Récupération et valorisation de la chaleur fatale des groupes froids",
    documents: ["Schéma frigorifique", "Puissances et régimes des groupes froids"],
    evaluate: (t) => {
      if (opts.presenceKey && !t[opts.presenceKey])
        return { status: "non_eligible", reason: "Pas de groupe de production de froid" };
      if (t.recuperateur) return { status: "non_eligible", reason: "Récupérateur déjà installé" };
      const p = parseNum(t[opts.powerKey]);
      if (!p) return { status: "a_verifier", reason: "À confirmer : puissance compresseurs à renseigner" };
      return { status: "eligible" };
    },
  };
}

const FICHE_GTB_DC: OpRule = {
  code: "BAT-TH-116",
  name: "Système de gestion technique du bâtiment",
  description: "Gestion technique du bâtiment (datacenter)",
  documents: ["Synoptique CVC / schéma de principe"],
  evaluate: (t) => {
    if (gtbExisting(t) === "Oui") return { status: "non_eligible", reason: "GTB/GTC déjà en place" };
    if (!parseNum(t.puissanceIT)) return { status: "a_verifier", reason: "À confirmer : puissance IT à renseigner" };
    return { status: "eligible" };
  },
};

const FICHE_PREREFROID: OpRule = {
  code: "AGRI-TH-103",
  name: "Pré-refroidisseur de lait",
  description: "Installation d'un pré-refroidisseur de lait",
  documents: ["Caractéristiques du tank à lait"],
  evaluate: (t) => {
    if (!t.tankLait) return { status: "non_eligible", reason: "Pas de tank à lait" };
    if (t.recuperateur) return { status: "non_eligible", reason: "Récupérateur déjà installé" };
    return { status: "eligible" };
  },
};

/* Haute pression flottante (régulation condensation sur groupe de froid).
   Même opération, code par secteur : BAT-TH-134 (tertiaire), IND-UT-116
   (industrie), AGRI-UT-104 (agricole). */
function ficheHPF(code: string, opts: { boolKey?: string; numKey?: string; missing?: string }): OpRule {
  return {
    code,
    name: "Régulation haute pression flottante sur groupe de production de froid",
    description: "Système de régulation permettant une haute pression flottante (condensation optimisée)",
    documents: [
      "Étude technique (besoins de froid, puissance nominale)",
      "Fiche technique du système de régulation",
    ],
    evaluate: (t) => {
      if (opts.boolKey) {
        if (!t[opts.boolKey]) return { status: "non_eligible", reason: "Pas de groupe de production de froid" };
        return { status: "eligible" };
      }
      const v = parseNum(t[opts.numKey as string]);
      if (!v)
        return { status: "a_verifier", reason: opts.missing || "À confirmer : groupe de production de froid à renseigner" };
      return { status: "eligible" };
    },
  };
}

/* Condensation frigorifique à haute efficacité (IND-UT-113) — condenseur seul,
   tour seule, ou condenseur + tour. S'applique aux centrales froides et aux
   tours aéroréfrigérantes. */
function ficheCondensationHE(opts: { boolKey?: string; numKey?: string; missing?: string }): OpRule {
  return {
    code: "IND-UT-113",
    name: "Système de condensation frigorifique à haute efficacité",
    description: "Condenseur / tour aéroréfrigérante à haute efficacité (faible ΔT de condensation)",
    documents: [
      "Étude technique (puissance frigorifique nominale)",
      "Fiche technique du condenseur / de la tour",
    ],
    evaluate: (t) => {
      if (opts.boolKey) {
        if (!t[opts.boolKey]) return { status: "non_eligible", reason: "Pas de centrale / production de froid" };
        return { status: "eligible" };
      }
      const v = parseNum(t[opts.numKey as string]);
      if (!v) return { status: "a_verifier", reason: opts.missing || "À confirmer : puissance à renseigner" };
      return { status: "eligible" };
    },
  };
}

/* Sites industriels — récupération de chaleur fatale : une source (≥ seuil de
   puissance) doit être valorisée vers un besoin (≥ seuil). Fiches : IND-UT-103
   (compresseur d'air), IND-UT-118 (four), IND-UT-139 (stockage / valorisation de
   la chaleur fatale), IND-UT-113 (condensation HE / tours aéro). HP flottante :
   BAT-TH-134 / IND-UT-116 / AGRI-UT-104. */
function indusNeeds(t: DataMap): string[] {
  const needs: string[] = [];
  if (parseNum(t.besoinChauffageSurface) >= 2000) needs.push("Chauffage (≥ 2000 m²)");
  if (parseNum(t.besoinEcsVolume) >= 10) needs.push("ECS (≥ 10 m³)");
  if (t.besoinProcess) needs.push("Process industriel");
  return needs;
}

function ficheRecupSource(o: {
  code: string;
  name: string;
  source: string;
  powerKey?: string;
  seuil?: number;
  boolKey?: string;
}): OpRule {
  return {
    code: o.code,
    name: o.name,
    description: `Récupération de chaleur sur ${o.source}, valorisée vers un besoin (chauffage, ECS ou process)`,
    documents: [
      "Bilan des puissances et températures des sources",
      "Schéma de récupération / besoins thermiques",
    ],
    evaluate: (t) => {
      if (o.boolKey) {
        if (!t[o.boolKey]) return { status: "non_eligible", reason: "Source non présente sur le site" };
      } else {
        const p = parseNum(t[o.powerKey as string]);
        if (!p) return { status: "a_verifier", reason: "À confirmer : puissance à renseigner" };
        if (p < (o.seuil as number))
          return { status: "non_eligible", reason: `Puissance inférieure au seuil (${o.seuil} kW)` };
      }
      const needs = indusNeeds(t);
      if (needs.length === 0)
        return {
          status: "a_verifier",
          reason: "Source éligible — besoin à confirmer (chauffage ≥ 2000 m², ECS ≥ 10 m³ ou process)",
        };
      return { status: "eligible", reason: `Valorisable vers : ${needs.join(", ")}` };
    },
  };
}

/* Catalogue par type de site (seuils repris des maquettes). */
const FICHE_CONFINEMENT: OpRule = {
  code: "BAT-TH-153",
  name: "Confinement des allées froides / chaudes (Data Center)",
  description: "Système de confinement des allées froides et allées chaudes dans un data center",
  documents: ["Plan de la salle informatique", "Descriptif du système de confinement"],
  evaluate: (t) => {
    if (!parseNum(t.surfaceIT))
      return { status: "a_verifier", reason: "À confirmer : surface salle informatique à renseigner" };
    return { status: "eligible" };
  },
};

/* Un site relève d'UN seul secteur : tertiaire (BAT), industrie (IND) ou
   agricole (AGRI). On ne mélange jamais les préfixes de fiches dans un type. */
const RULES: Record<string, OpRule[]> = {
  /* ---------- Tertiaire (BAT) ---------- */
  hotellerie: [fichePAC(), ficheGTBrooms(200), ficheHPF("BAT-TH-134", { boolKey: "groupesFroids" })],
  hospitalier: [fichePAC(), ficheHPF("BAT-TH-134", { boolKey: "groupesFroids" })],
  distribution: [
    ficheGTB("surfaceVente", 1200),
    FICHE_MEUBLES,
    ficheHPF("BAT-TH-134", { boolKey: "centralesFroides" }),
    fichePAC("surfaceVente"),
  ],
  entrepot_non_refrigere: [ficheGTB("surface", 2000), FICHE_DESTRAT, fichePAC()],
  centre_commercial: [
    ficheGTB("surfaceGalerie", 5000),
    ficheHPF("BAT-TH-134", { boolKey: "groupesFroids" }),
    fichePAC("surfaceGalerie"),
  ],
  bureaux: [ficheGTB("surface", 2000), fichePAC("surface", 3000)],
  scolaire: [fichePAC("surface", 3000)],
  entrepot_frigorifique: [
    ficheHPF("BAT-TH-134", { numKey: "nbGroupesFroids", missing: "À confirmer : nombre de groupes froids à renseigner" }),
    ficheGTB("surfaceZone", 800),
    fichePAC("surfaceZone"),
  ],
  datacenter: [
    ficheHPF("BAT-TH-134", { numKey: "puissanceCompresseurs", missing: "À confirmer : puissance compresseurs à renseigner" }),
    ficheGTB("surfaceIT", 1000),
    FICHE_CONFINEMENT,
  ],
  /* ---------- Industrie (IND) — uniquement le Site Industriel ---------- */
  industriel: [
    ficheRecupSource({
      code: "IND-UT-118",
      name: "Brûleur avec récupération de chaleur sur un four industriel",
      source: "fours",
      powerKey: "fourPuissance",
      seuil: 400,
    }),
    ficheRecupSource({
      code: "IND-UT-139",
      name: "Système de stockage de chaleur fatale",
      source: "groupes froid",
      powerKey: "groupeFroidPuissance",
      seuil: 300,
    }),
    ficheRecupSource({
      code: "IND-UT-103",
      name: "Système de récupération de chaleur sur un compresseur d'air",
      source: "compresseur d'air",
      powerKey: "compresseurPuissance",
      seuil: 200,
    }),
    ficheCondensationHE({
      numKey: "toursAeroPuissance",
      missing: "À confirmer : puissance tours aéroréfrigérantes à renseigner",
    }),
    ficheHPF("IND-UT-116", {
      numKey: "groupeFroidPuissance",
      missing: "À confirmer : puissance groupes froid à renseigner",
    }),
  ],
  /* ---------- Agricole (AGRI) ---------- */
  agricole: [FICHE_PREREFROID, ficheHPF("AGRI-UT-104", { boolKey: "tankLait" })],
};

function qualify(siteType: string, t: DataMap): OpResult[] {
  const rules = RULES[siteType] || [];
  return rules.map((r) => {
    const { status, reason } = r.evaluate(t);
    return { code: r.code, name: r.name, description: r.description, documents: r.documents, status, reason };
  });
}

/* ------------------------------- UI primitives ---------------------------- */

function Field({
  label,
  required,
  span,
  children,
}: {
  label?: string;
  required?: boolean;
  span?: "full";
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", span === "full" && "md:col-span-2")}>
      {label && (
        <label className="block text-sm font-semibold text-slate-800">
          {label}
          {required && <span className="text-sky-700"> *</span>}
        </label>
      )}
      {children}
    </div>
  );
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-[5px] border transition-colors",
        checked ? "border-sky-700 bg-sky-700 text-white" : "border-slate-300 bg-white",
      )}
    >
      {checked && <Check className="size-3.5" strokeWidth={3} />}
    </span>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white h-11 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100";

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  icon: Icon,
  required,
  span,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "numeric" | "text" | "email" | "tel";
  icon?: typeof Phone;
  required?: boolean;
  span?: "full";
}) {
  return (
    <Field label={label} required={required} span={span}>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />}
        <input
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(inputCls, Icon ? "pl-9 pr-3.5" : "px-3.5")}
        />
      </div>
    </Field>
  );
}

function DateField({
  label,
  value,
  onChange,
  span,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  span?: "full";
}) {
  return (
    <Field label={label} span={span}>
      <div className="relative">
        <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputCls, "pl-9 pr-3.5")}
        />
      </div>
    </Field>
  );
}

function TimeField({
  label,
  value,
  onChange,
  span,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  span?: "full";
}) {
  return (
    <Field label={label} span={span}>
      <div className="relative">
        <Clock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputCls, "pl-9 pr-3.5")}
        />
      </div>
    </Field>
  );
}

const ZONE_BADGE: Record<"H1" | "H2" | "H3", string> = {
  H1: "bg-sky-50 text-sky-700 ring-sky-200",
  H2: "bg-amber-50 text-amber-700 ring-amber-200",
  H3: "bg-red-50 text-red-700 ring-red-200",
};

function ZoneClimatique({ adresse }: { adresse: string }) {
  const z = climateZone(adresse);
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm md:col-span-2">
      <span className="text-slate-500">Zone climatique (auto) :</span>
      {z ? (
        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1", ZONE_BADGE[z])}>
          {z}
        </span>
      ) : (
        <span className="text-xs text-slate-400">à déterminer — ajoutez le code postal dans l'adresse</span>
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "Sélectionnez",
  span,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  span?: "full";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <Field label={label} span={span}>
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex h-11 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3.5 text-left text-sm outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100",
            open && "border-sky-500 ring-2 ring-sky-100",
          )}
        >
          <span className={value ? "text-slate-900" : "text-slate-400"}>{value || placeholder}</span>
          <ChevronDown className={cn("size-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div className="absolute left-0 right-0 z-20 mt-1.5 max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={cn(
                  "block w-full px-3.5 py-2 text-left text-sm transition-colors hover:bg-sky-50",
                  value === opt ? "bg-sky-50 font-medium text-sky-700" : "text-slate-700",
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </Field>
  );
}

function BoolRow({
  label,
  checked,
  onChange,
  span,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  span?: "full";
}) {
  if (span === "full") {
    return (
      <div className="md:col-span-2">
        <button
          type="button"
          onClick={() => onChange(!checked)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3.5 py-3.5 text-left text-sm font-medium transition-colors",
            checked ? "bg-sky-50 text-sky-900 ring-1 ring-sky-200" : "bg-slate-50 text-slate-700 hover:bg-slate-100",
          )}
        >
          <CheckBox checked={checked} />
          <span>{label}</span>
        </button>
      </div>
    );
  }
  return (
    <div>
      <div className="mb-1.5 h-5" />
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="flex h-11 w-full items-center gap-2.5 text-left text-sm font-medium text-slate-700"
      >
        <CheckBox checked={checked} />
        <span>{label}</span>
      </button>
    </div>
  );
}

function CheckGroup({
  label,
  options,
  value,
  onChange,
  span,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  span?: "full";
}) {
  const isNone = (o: string) => /^aucun/i.test(o);
  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else if (isNone(opt)) onChange([opt]);
    else onChange([...value.filter((v) => !isNone(v)), opt]);
  };
  return (
    <div className={cn("space-y-2", span === "full" && "md:col-span-2")}>
      <label className="block text-sm font-semibold text-slate-800">{label}</label>
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {options.map((opt) => {
          const checked = value.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3.5 py-3 text-left text-sm font-medium transition-colors",
                checked ? "bg-sky-50 text-sky-900 ring-1 ring-sky-200" : "bg-slate-50 text-slate-700 hover:bg-slate-100",
              )}
            >
              <CheckBox checked={checked} />
              <span>{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FieldRenderer({
  field,
  data,
  setData,
}: {
  field: Field;
  data: DataMap;
  setData: Dispatch<SetStateAction<DataMap>>;
}) {
  const set = (v: any) => setData((prev) => ({ ...prev, [field.key]: v }));
  switch (field.kind) {
    case "select":
      return (
        <SelectField
          span={field.span}
          label={field.label}
          options={field.options}
          placeholder={field.placeholder}
          value={(data[field.key] as string) ?? ""}
          onChange={set}
        />
      );
    case "boolselect":
      return (
        <SelectField
          span={field.span}
          label={field.label}
          options={["Non", "Oui"]}
          value={(data[field.key] as string) ?? "Non"}
          onChange={set}
        />
      );
    case "number":
      return (
        <TextField
          span={field.span}
          label={field.label}
          placeholder={field.placeholder}
          inputMode="numeric"
          value={(data[field.key] as string) ?? ""}
          onChange={set}
        />
      );
    case "text":
      return (
        <TextField
          span={field.span}
          label={field.label}
          placeholder={field.placeholder}
          value={(data[field.key] as string) ?? ""}
          onChange={set}
        />
      );
    case "bool":
      return <BoolRow span={field.span} label={field.label} checked={!!data[field.key]} onChange={set} />;
    case "checkgroup":
      return (
        <CheckGroup
          span={field.span}
          label={field.label}
          options={field.options}
          value={(data[field.key] as string[]) ?? []}
          onChange={set}
        />
      );
    case "group": {
      if (field.showIf && !data[field.showIf]) return null;
      const sky = field.tone === "sky";
      return (
        <div
          className={cn(
            "rounded-xl border p-4 md:col-span-2",
            sky ? "border-sky-200 bg-sky-50/70" : "border-slate-200 bg-slate-50/70",
          )}
        >
          {field.label && (
            <h4 className="mb-3 text-sm font-bold text-slate-900" style={HEADING}>
              {field.label}
            </h4>
          )}
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
            {field.fields.map((f) => (
              <FieldRenderer key={f.key} field={f} data={data} setData={setData} />
            ))}
          </div>
        </div>
      );
    }
    case "spacer":
      return <div className="hidden md:block" aria-hidden="true" />;
    default:
      return null;
  }
}

function renderFields(fields: Field[], data: DataMap, setData: Dispatch<SetStateAction<DataMap>>) {
  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
      {fields.map((f) => (
        <FieldRenderer key={f.key} field={f} data={data} setData={setData} />
      ))}
    </div>
  );
}

/* --------------------------------- Branding ------------------------------- */

function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const mark = size === "lg" ? "size-12" : "size-10";
  const word = size === "lg" ? "text-2xl" : "text-xl";
  const gid = `renoma-roof-${size}`;
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 64 64" fill="none" className={mark} aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1A9DD9" />
            <stop offset="1" stopColor="#46C0EF" />
          </linearGradient>
        </defs>
        <path d="M5 32 L32 8 L59 32" stroke="#1A9DD9" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M13 28 L13 56 L27 56 L27 42"
          stroke="#1A9DD9"
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M51 28 L51 56 L37 56 L37 42"
          stroke={`url(#${gid})`}
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="leading-[1.05]">
        <div className={cn("font-extrabold tracking-tight text-[#1A9DD9]", word)} style={HEADING}>
          Renoma
        </div>
        <div className={cn("font-extrabold tracking-tight text-[#2E4756]", word)} style={HEADING}>
          Energy
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Result helpers ---------------------------- */

const STATUS_LABEL: Record<Status, string> = {
  eligible: "Éligible",
  a_verifier: "À vérifier",
  non_eligible: "Non éligible",
};

const STATUS_TONE: Record<
  Status,
  { card: string; code: string; name: string; desc: string; reason: string; icon: typeof CheckCircle2; iconColor: string }
> = {
  eligible: {
    card: "border-emerald-200 bg-emerald-50",
    code: "text-emerald-800",
    name: "text-emerald-900",
    desc: "text-emerald-700",
    reason: "text-emerald-600",
    icon: CheckCircle2,
    iconColor: "text-emerald-600",
  },
  a_verifier: {
    card: "border-amber-200 bg-amber-50",
    code: "text-amber-800",
    name: "text-amber-900",
    desc: "text-amber-700",
    reason: "text-amber-600",
    icon: AlertTriangle,
    iconColor: "text-amber-600",
  },
  non_eligible: {
    card: "border-slate-200 bg-slate-50",
    code: "text-slate-600",
    name: "text-slate-700",
    desc: "text-slate-500",
    reason: "text-slate-400",
    icon: XCircle,
    iconColor: "text-slate-400",
  },
};

function OpCard({ op }: { op: OpResult }) {
  const t = STATUS_TONE[op.status];
  return (
    <div className={cn("rounded-xl border p-4", t.card)}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className={cn("font-bold", t.code)} style={HEADING}>
          {op.code}
        </span>
        <span className={cn("text-sm font-medium", t.name)}>{op.name}</span>
      </div>
      <p className={cn("mt-1 text-sm", t.desc)}>{op.description}</p>
      {op.reason && <p className={cn("mt-1.5 text-xs", t.reason)}>{op.reason}</p>}
    </div>
  );
}

function Bucket({ status, ops }: { status: Status; ops: OpResult[] }) {
  if (!ops.length) return null;
  const t = STATUS_TONE[status];
  const Icon = t.icon;
  return (
    <div className="space-y-3">
      <div className={cn("flex items-center gap-2 font-bold", t.iconColor)} style={HEADING}>
        <Icon className="size-5" />
        {STATUS_LABEL[status]} ({ops.length})
      </div>
      <div className="space-y-3">
        {ops.map((op) => (
          <OpCard key={op.code + op.name} op={op} />
        ))}
      </div>
    </div>
  );
}

/* --------------------------------- Sections ------------------------------- */

function sectionMeta(step: number, site: SiteType | undefined): { title: string; desc: string } | null {
  switch (step) {
    case 1:
      return { title: "Type de site", desc: "Sélectionnez la zone géographique et le type de site" };
    case 2:
      return { title: "Identification du prospect", desc: "Renseignez les informations de contact" };
    case 3:
      return {
        title: `Questions techniques${site ? ` - ${site.label}` : ""}`,
        desc: "Répondez aux questions spécifiques à ce type de site",
      };
    case 4:
      return { title: "Qualification des opérations CEE", desc: "Analyse automatique basée sur vos réponses" };
    case 6:
      return { title: "Résultats et documents", desc: "Récapitulatif de la qualification et documents à collecter" };
    default:
      return null;
  }
}

/* Résumé technique pour le rapport (étape 7) */
function techniqueSummary(fields: Field[], t: DataMap): Array<{ label: string; value: string }> {
  const out: Array<{ label: string; value: string }> = [];
  const clean = (l: string) => l.replace(/\s*[-(]\s*seuils?\s*:.*$/i, "").trim();
  const walk = (fs: Field[]) => {
    for (const f of fs) {
      if (f.kind === "group") {
        walk(f.fields);
        continue;
      }
      if (f.kind === "spacer") continue;
      const v = t[f.key];
      if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) continue;
      let val: string;
      if (Array.isArray(v)) val = v.join(", ");
      else if (f.kind === "bool") val = v ? "Oui" : "Non";
      else val = String(v);
      out.push({ label: clean(f.label), value: val });
    }
  };
  walk(fields);
  return out;
}

/* ---------------------------------- App ----------------------------------- */

const EMPTY_IDENT = {
  raisonSociale: "",
  contact: "",
  fonctionContact: "",
  adresse: "",
  telephone: "",
  email: "",
  dateRappel: "",
  heureRappel: "",
};

export default function RenomaQualificationProspect() {
  const [step, setStep] = useState(1);
  const [zone, setZone] = useState("");
  const [siteType, setSiteType] = useState("");
  const [ident, setIdent] = useState({ ...EMPTY_IDENT });
  const [technique, setTechnique] = useState<DataMap>({});
  const [remarque, setRemarque] = useState("");

  const site = SITE_TYPES.find((s) => s.key === siteType);
  const techFields = (siteType && TECH_FIELDS[siteType]) || [];
  const meta = sectionMeta(step, site);
  const HeaderIcon = STEPS[step - 1].icon;
  const stepName = STEPS[step - 1].name;

  const qualifiedOps = useMemo(() => qualify(siteType, technique), [siteType, technique]);
  const eligible = qualifiedOps.filter((o) => o.status === "eligible");
  const aVerifier = qualifiedOps.filter((o) => o.status === "a_verifier");
  const nonEligible = qualifiedOps.filter((o) => o.status === "non_eligible");
  const identified = [...eligible, ...aVerifier];
  const documents = Array.from(new Set(identified.flatMap((o) => o.documents)));

  const canNext =
    step === 1
      ? !!zone && !!siteType
      : step === 2
        ? ident.raisonSociale.trim() !== "" && ident.adresse.trim() !== ""
        : true;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const goNext = () => {
    if (canNext && step < 7) setStep(step + 1);
  };
  const goPrev = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-sky-50/60 via-slate-50 to-slate-50 px-4 py-8 font-sans sm:px-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-7 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Logo />
          <div className="hidden h-9 w-px bg-slate-200 sm:block" />
          <div>
            <h1 className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl" style={HEADING}>
              Qualification Prospect
            </h1>
            <p className="text-sm text-slate-500">Simulateur de qualification CEE</p>
          </div>
        </header>

        {/* Progress */}
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-sky-700">Étape {step} / 7</span>
            {stepName && <span className="text-sm text-slate-400">{stepName}</span>}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-sky-100">
            <div
              className="h-full rounded-full bg-sky-700 transition-all duration-500"
              style={{ width: `${(step / 7) * 100}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {meta && (
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <HeaderIcon className="size-5 text-sky-700" />
                <h2 className="text-lg font-bold text-slate-900" style={HEADING}>
                  {meta.title}
                </h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">{meta.desc}</p>
            </div>
          )}

          {/* Step 1 — Type de site */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-base font-bold text-slate-900" style={HEADING}>
                  Zone géographique
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {ZONES.map((z) => {
                    const Icon = z.icon;
                    const active = zone === z.key;
                    return (
                      <button
                        key={z.key}
                        type="button"
                        onClick={() => setZone(z.key)}
                        className={cn(
                          "flex h-[68px] items-center justify-center gap-2.5 rounded-xl border text-base font-medium transition-colors",
                          active
                            ? "border-sky-700 bg-sky-700 text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50/50",
                        )}
                      >
                        <Icon className="size-5" />
                        {z.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {zone && (
                <div>
                  <h3 className="mb-3 text-base font-bold text-slate-900" style={HEADING}>
                    Type de site
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {SITE_TYPES.map((s) => {
                      const active = siteType === s.key;
                      return (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => {
                            setSiteType(s.key);
                            setTechnique({});
                          }}
                          className={cn(
                            "flex h-[64px] items-center gap-3 rounded-xl border px-4 text-left text-[15px] font-medium transition-colors",
                            active
                              ? "border-sky-600 bg-sky-50 text-sky-900 ring-1 ring-sky-200"
                              : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50/40",
                          )}
                        >
                          <span className="text-xl leading-none">{s.emoji}</span>
                          <span>{s.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2 — Identification */}
          {step === 2 && (
            <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
              <TextField
                label="Nom / Raison sociale"
                required
                value={ident.raisonSociale}
                onChange={(v) => setIdent({ ...ident, raisonSociale: v })}
                placeholder="Ex: Hôtel Le Grand Paris"
              />
              <TextField
                label="Nom du contact"
                value={ident.contact}
                onChange={(v) => setIdent({ ...ident, contact: v })}
                placeholder="Ex: Jean Dupont"
              />
              <TextField
                label="Fonction du contact"
                value={ident.fonctionContact}
                onChange={(v) => setIdent({ ...ident, fonctionContact: v })}
                placeholder="Ex: Directeur technique"
              />
              <TextField
                span="full"
                label="Adresse du site"
                required
                value={ident.adresse}
                onChange={(v) => setIdent({ ...ident, adresse: v })}
                placeholder="Ex: 15 rue de la Paix, 75001 Paris"
              />
              <ZoneClimatique adresse={ident.adresse} />
              <TextField
                label="Téléphone"
                icon={Phone}
                inputMode="tel"
                value={ident.telephone}
                onChange={(v) => setIdent({ ...ident, telephone: v })}
                placeholder="01 23 45 67 89"
              />
              <TextField
                label="Email"
                icon={Mail}
                type="email"
                inputMode="email"
                value={ident.email}
                onChange={(v) => setIdent({ ...ident, email: v })}
                placeholder="contact@hotel.com"
              />
              <DateField
                label="Date de rappel"
                value={ident.dateRappel}
                onChange={(v) => setIdent({ ...ident, dateRappel: v })}
              />
              <TimeField
                label="Heure de rappel"
                value={ident.heureRappel}
                onChange={(v) => setIdent({ ...ident, heureRappel: v })}
              />
            </div>
          )}

          {/* Step 3 — Questions techniques */}
          {step === 3 && renderFields(techFields, technique, setTechnique)}

          {/* Step 4 — Qualification CEE */}
          {step === 4 && (
            <div className="space-y-6">
              {qualifiedOps.length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Aucune fiche CEE n'est paramétrée pour ce type de site.
                </p>
              ) : (
                <>
                  <Bucket status="eligible" ops={eligible} />
                  <Bucket status="a_verifier" ops={aVerifier} />
                  <Bucket status="non_eligible" ops={nonEligible} />
                </>
              )}
            </div>
          )}

          {/* Step 5 — Résultats */}
          {step === 5 &&
            (eligible.length === 0 ? (
              <div className="rounded-xl border border-red-200 bg-red-50/40 p-5">
                <div className="flex items-center gap-2 font-bold text-red-600" style={HEADING}>
                  <XCircle className="size-5" />
                  Aucune opération éligible
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Aucune opération CEE n'a été identifiée comme éligible pour ce prospect. Vous pouvez tout de même
                  générer un rapport récapitulatif.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-bold text-emerald-600" style={HEADING}>
                  <CheckCircle2 className="size-5" />
                  Opérations éligibles ({eligible.length})
                </div>
                {eligible.map((op) => (
                  <OpCard key={op.code + op.name} op={op} />
                ))}
                {aVerifier.length > 0 && (
                  <p className="pt-1 text-sm text-slate-500">
                    {aVerifier.length} opération(s) à vérifier — complétez les questions techniques pour les confirmer.
                  </p>
                )}
              </div>
            ))}

          {/* Step 6 — Rapport (récap + documents) */}
          {step === 6 && (
            <div className="space-y-5">
              <div className="rounded-xl bg-slate-50 p-5">
                <h3 className="mb-3 text-base font-bold text-slate-900" style={HEADING}>
                  Prospect
                </h3>
                <div className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
                  <ReportLine label="Nom" value={ident.raisonSociale || "—"} />
                  <ReportLine label="Site" value={site?.label ?? "—"} />
                  <ReportLine label="Adresse" value={ident.adresse || "—"} />
                  <ReportLine label="Tel" value={ident.telephone || "Non renseigné"} />
                  <ReportLine label="Contact" value={ident.contact || "—"} />
                  <ReportLine label="Fonction" value={ident.fonctionContact || "—"} />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-5">
                <h3 className="mb-3 text-base font-bold text-slate-900" style={HEADING}>
                  Opérations CEE identifiées
                </h3>
                {identified.length === 0 ? (
                  <p className="text-sm text-slate-500">Aucune opération identifiée.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {identified.map((op) => {
                      const t = STATUS_TONE[op.status];
                      const Icon = t.icon;
                      return (
                        <li key={op.code + op.name} className="flex items-start gap-2.5 text-sm">
                          <Icon className={cn("mt-0.5 size-4 shrink-0", t.iconColor)} />
                          <span>
                            <span className="font-bold text-slate-800" style={HEADING}>
                              {op.code}
                            </span>{" "}
                            <span className="text-slate-600">{op.name}</span>
                            {op.status === "a_verifier" && (
                              <span className="ml-1.5 text-xs font-medium text-amber-600">(à confirmer)</span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="rounded-xl bg-sky-50 p-5">
                <h3 className="mb-3 text-base font-bold text-sky-900" style={HEADING}>
                  Documents à demander au prospect
                </h3>
                {documents.length === 0 ? (
                  <p className="text-sm text-sky-900/70">Aucun document requis pour le moment.</p>
                ) : (
                  <ul className="space-y-2">
                    {documents.map((doc) => (
                      <li key={doc} className="flex items-center gap-2.5 text-sm text-sky-900">
                        <FileText className="size-4 shrink-0 text-sky-700" />
                        {doc}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 p-5">
                <h3 className="mb-3 text-base font-bold text-slate-900" style={HEADING}>
                  Remarque finale
                </h3>
                <textarea
                  value={remarque}
                  onChange={(e) => setRemarque(e.target.value)}
                  rows={5}
                  placeholder="Observations, recommandations, points d'attention pour ce prospect…"
                  className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </div>
            </div>
          )}

          {/* Step 7 — Rapport formel */}
          {step === 7 && (
            <ReportView
              site={site}
              ident={ident}
              identified={identified}
              documents={documents}
              techSummary={techniqueSummary(techFields, technique)}
              remarque={remarque}
            />
          )}
        </div>

        {/* Nav */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goPrev}
            disabled={step === 1}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-lg border px-5 text-sm font-medium transition-colors",
              step === 1
                ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            <ArrowLeft className="size-4" />
            Précédent
          </button>

          {step < 7 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canNext}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-sky-700 px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-sky-700"
            >
              Suivant
              <ArrowRight className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-sky-700 px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-800"
            >
              <Download className="size-4" />
              Télécharger le rapport
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Report (st.7) ---------------------------- */

function ReportLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="text-slate-500">{label}: </span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}

function ReportView({
  site,
  ident,
  identified,
  documents,
  techSummary,
  remarque,
}: {
  site: SiteType | undefined;
  ident: typeof EMPTY_IDENT;
  identified: OpResult[];
  documents: string[];
  techSummary: Array<{ label: string; value: string }>;
  remarque: string;
}) {
  return (
    <div className="space-y-7">
      {/* En-tête rapport */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-3">
          <Logo size="lg" />
          <div className="border-l border-slate-200 pl-3">
            <div className="text-base font-bold text-slate-900" style={HEADING}>
              Rapport de Qualification Prospect
            </div>
            <div className="text-sm text-slate-500">
              {COMPANY_NAME} — {COMPANY_TAGLINE}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-sky-700 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-800"
        >
          <Printer className="size-4" />
          Imprimer
        </button>
      </div>

      {/* 1. Identification */}
      <section>
        <h3 className="mb-4 border-b border-slate-200 pb-2 text-base font-bold text-slate-900" style={HEADING}>
          1. Identification du prospect
        </h3>
        <div className="grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-2">
          <ReportLine label="Nom / Raison sociale" value={ident.raisonSociale || "-"} />
          <div className="text-sm">
            <span className="text-slate-500">Type de site: </span>
            <span className="font-medium text-slate-900">
              {site ? `${site.emoji} ${site.label}` : "-"}
            </span>
          </div>
          <ReportLine label="Adresse" value={ident.adresse || "-"} />
          <ReportLine label="Zone climatique" value={climateZone(ident.adresse) || "-"} />
          <ReportLine label="Téléphone" value={ident.telephone || "-"} />
          <ReportLine label="Contact" value={ident.contact || "-"} />
          <ReportLine label="Fonction" value={ident.fonctionContact || "-"} />
          <ReportLine label="Email" value={ident.email || "-"} />
          <ReportLine label="Date de rappel" value={ident.dateRappel || "À planifier"} />
          <ReportLine label="Heure de rappel" value={ident.heureRappel || "-"} />
        </div>
      </section>

      {/* 2. Résumé technique */}
      <section className="rounded-xl border border-slate-200 p-5">
        <h3 className="border-b border-slate-200 pb-2 text-base font-bold text-slate-900" style={HEADING}>
          2. Résumé technique (pour validation)
        </h3>
        {techSummary.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-x-10 gap-y-2 sm:grid-cols-2">
            {techSummary.map((r) => (
              <ReportLine key={r.label} label={r.label} value={r.value} />
            ))}
          </div>
        )}
      </section>

      {/* 3. Opérations CEE identifiées */}
      <section>
        <h3 className="mb-4 border-b border-slate-200 pb-2 text-base font-bold text-slate-900" style={HEADING}>
          3. Opérations CEE identifiées
        </h3>
        {identified.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune opération identifiée.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-3 py-2 font-semibold">Code</th>
                <th className="px-3 py-2 font-semibold">Opération</th>
                <th className="px-3 py-2 font-semibold">Statut</th>
                <th className="px-3 py-2 font-semibold">Potentiel</th>
              </tr>
            </thead>
            <tbody>
              {identified.map((op) => (
                <tr key={op.code + op.name} className="border-b border-slate-100">
                  <td className="px-3 py-2.5 font-medium text-slate-900">{op.code}</td>
                  <td className="px-3 py-2.5 text-slate-700">{op.name}</td>
                  <td
                    className={cn(
                      "px-3 py-2.5 font-medium",
                      op.status === "eligible" ? "text-emerald-600" : "text-amber-600",
                    )}
                  >
                    {STATUS_LABEL[op.status]}
                  </td>
                  <td className="px-3 py-2.5 text-slate-400">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* 3. Documents à collecter (numérotation reprise des maquettes) */}
      <section>
        <h3 className="mb-4 border-b border-slate-200 pb-2 text-base font-bold text-slate-900" style={HEADING}>
          3. Documents à collecter
        </h3>
        {documents.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun document requis pour le moment.</p>
        ) : (
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
            {documents.map((doc) => (
              <li key={doc}>{doc}</li>
            ))}
          </ul>
        )}
      </section>

      {remarque.trim() && (
        <section>
          <h3 className="mb-3 border-b border-slate-200 pb-2 text-base font-bold text-slate-900" style={HEADING}>
            Remarque
          </h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{remarque}</p>
        </section>
      )}

      {/* Signatures */}
      <div className="grid grid-cols-1 gap-8 border-t border-slate-200 pt-6 sm:grid-cols-2">
        <div>
          <div className="text-sm text-slate-500">Date et signature apporteur:</div>
          <div className="mt-8 border-b border-slate-300" />
        </div>
        <div>
          <div className="text-sm text-slate-500">Validation RENOMA:</div>
          <div className="mt-8 border-b border-slate-300" />
        </div>
      </div>
    </div>
  );
}
