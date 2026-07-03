import type { EasternState } from "@/lib/types";

export type CityConfig = {
  name: string;
  areas: string[];
};

export type StateConfig = {
  state: EasternState;
  cities: CityConfig[];
};

export const EASTERN_NIGERIA_LOCATIONS: StateConfig[] = [
  {
    state: "Anambra",
    cities: [
      {
        name: "Onitsha",
        areas: ["Fegge", "GRA", "Inland Town", "Nkpor", "Omagba", "Woliwo"],
      },
      {
        name: "Awka",
        areas: ["Aroma", "Ifite", "Okpuno", "Temp Site", "Unizik Junction"],
      },
      {
        name: "Nnewi",
        areas: ["Akudo", "Nnewi Central", "Otolo", "Uruagu", "Umudim"],
      },
      {
        name: "Ekwulobia",
        areas: ["Ekwulobia Central", "Umuchiana", "Aguata"],
      },
    ],
  },
  {
    state: "Enugu",
    cities: [
      {
        name: "Enugu",
        areas: ["Abakpa", "GRA", "Independence Layout", "New Haven", "Trans-Ekulu", "Uwani"],
      },
    ],
  },
  {
    state: "Imo",
    cities: [
      {
        name: "Owerri",
        areas: ["Aladinma", "Ikenegbu", "New Owerri", "Orji", "World Bank"],
      },
    ],
  },
  {
    state: "Abia",
    cities: [
      {
        name: "Aba",
        areas: ["Ariaria", "Ogbor Hill", "Osisioma", "Umuungasi", "World Bank"],
      },
      {
        name: "Umuahia",
        areas: ["Afara", "Low Cost", "Mission Hill", "Umuahia Central", "World Bank"],
      },
    ],
  },
  {
    state: "Ebonyi",
    cities: [
      {
        name: "Abakaliki",
        areas: ["Azuiyiokwu", "CAS Campus", "Kpirikpiri", "Presco", "Water Works"],
      },
    ],
  },
];

export const EASTERN_STATES = EASTERN_NIGERIA_LOCATIONS.map(
  (location) => location.state,
);

export function getCitiesForState(state: EasternState) {
  return (
    EASTERN_NIGERIA_LOCATIONS.find((location) => location.state === state)
      ?.cities ?? []
  );
}

export function getAreasForCity(state: EasternState, city: string) {
  return getCitiesForState(state).find((entry) => entry.name === city)?.areas ?? [];
}
