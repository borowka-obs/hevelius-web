/**
 * Filter as returned by GET /api/filters.
 * See openapi.yaml in api/.
 */
export interface Filter {
  filter_id: number;
  short_name: string;
  full_name?: string;
  url?: string;
  active: boolean;
}
