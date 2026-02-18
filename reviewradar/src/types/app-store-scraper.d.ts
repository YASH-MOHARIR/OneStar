declare module "app-store-scraper" {
  const store: {
    search: (opts: { term: string; num?: number; country?: string }) => Promise<Array<{
      id: number;
      title: string;
      icon: string;
      score: number;
      developer: string;
      url: string;
    }>>;
    app: (opts: { id: number }) => Promise<{
      id: number;
      title: string;
      icon: string;
      score: number;
      userRatingCount?: number;
      primaryGenreName?: string;
      developer: string;
      url: string;
    }>;
    reviews: (opts: {
      id: number;
      sort?: string;
      page?: number;
      country?: string;
    }) => Promise<Array<{
      id: string;
      userName?: string;
      score: number;
      title?: string;
      text: string;
      version?: string;
      updated?: string;
    }>>;
    sort: { RECENT: string; HELPFUL: string };
  };
  export default store;
}
