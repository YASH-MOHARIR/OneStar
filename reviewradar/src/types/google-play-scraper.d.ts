declare module "google-play-scraper" {
  export const sort: {
    NEWEST: number;
    RATING: number;
    HELPFULNESS: number;
  };

  export function search(opts: { term: string; num?: number }): Promise<Array<{
    appId: string;
    title: string;
    icon: string;
    score?: number;
    developer?: string;
    url?: string;
  }>>;

  export function app(opts: { appId: string }): Promise<{
    appId: string;
    title: string;
    icon?: string;
    score?: number;
    ratings?: number;
    genre?: string;
    developer?: string;
    url?: string;
  }>;

  export function reviews(opts: {
    appId: string;
    sort?: number;
    num?: number;
    lang?: string;
    country?: string;
    paginate?: boolean;
    nextPaginationToken?: string;
  }): Promise<{
    data: Array<{
      id?: string;
      score?: number;
      title?: string;
      text?: string;
      userName?: string;
      date?: string;
      version?: string;
      thumbsUp?: number;
    }>;
    nextPaginationToken?: string;
  }>;

  const gplay: {
    sort: typeof sort;
    search: typeof search;
    app: typeof app;
    reviews: typeof reviews;
  };

  export default gplay;
}
