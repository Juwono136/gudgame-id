/** Minimum characters before calling Google Places autocomplete. */
export const VENUE_AUTOCOMPLETE_MIN_CHARS = 3;

export type PlacePrediction = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  /** Google fills coordinates via place-details on select (may be 0 until then). */
  latitude: number;
  longitude: number;
};

export type PlaceDetails = {
  placeId: string;
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  mapsUrl: string;
};

export type VenueSearchProvider = "google";

export type VenueAutocompleteResult = {
  items: PlacePrediction[];
  provider: VenueSearchProvider;
};
