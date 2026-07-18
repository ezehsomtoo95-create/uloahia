import type { LocationTreeState } from "@/lib/types";

/** Client-safe helpers over a DB-loaded location tree. No hardcoded catalog. */

export function getCitiesForState(tree: LocationTreeState[], stateNameOrId: string) {
  const state = tree.find(
    (entry) => entry.name === stateNameOrId || entry.id === stateNameOrId,
  );
  return state?.cities ?? [];
}

export function getAreasForCity(
  tree: LocationTreeState[],
  stateNameOrId: string,
  cityNameOrId: string,
) {
  const city = getCitiesForState(tree, stateNameOrId).find(
    (entry) => entry.name === cityNameOrId || entry.id === cityNameOrId,
  );
  return city?.areas ?? [];
}

export function findState(tree: LocationTreeState[], stateNameOrId: string) {
  return tree.find(
    (entry) => entry.name === stateNameOrId || entry.id === stateNameOrId,
  );
}
