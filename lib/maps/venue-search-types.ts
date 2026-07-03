export type PlacePrediction = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  /** Populated for OSM results; Google fills via place-details on select. */
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

export type VenueSearchProvider = "google" | "osm";

export type VenueAutocompleteResult = {
  items: PlacePrediction[];
  provider: VenueSearchProvider;
};
