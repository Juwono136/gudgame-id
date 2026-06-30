export type DashboardSportOption = {
  id: string;
  slug: string;
  name: string;
};

export type DashboardSportContext = {
  sportSlug: string;
  sportId: string;
  availableSports: DashboardSportOption[];
};
