export interface Poll {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  creator_name: string;
  is_active: boolean;
  created_at: string;
  instructions: string | null;
  poll_type: 'rating' | 'single_choice' | 'multi_choice';
  max_choices: number;
}

export interface Choice {
  id: string;
  poll_id: string;
  name: string;
  sort_order: number;
}

export interface Criterion {
  id: string;
  poll_id: string;
  name: string;
  min_value: number;
  max_value: number;
  sort_order: number;
  emoji: string | null;
  exclude_from_total: boolean;
}

export interface Item {
  id: string;
  poll_id: string;
  name: string;
  subtitle: string | null;
  sort_order: number;
}

export interface Vote {
  id: string;
  poll_id: string;
  item_id: string;
  criterion_id: string;
  voter_id: string;
  voter_name: string;
  value: number;
  created_at: string;
  updated_at: string;
  choice_id: string | null;
}

export interface Voter {
  id: string;
  poll_id: string;
  name: string;
  created_at: string;
}

export interface ItemScore {
  item: Item;
  totalAvg: number;
  byCriterion: { criterion: Criterion; avg: number; voteCount: number }[];
  totalVoteCount: number;
}
