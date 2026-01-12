export type SyncScore = {
  musicId: string;
  cid?: number;
  chartIndex: number;
  type: string;
  chartPayload?: {
    level?: string;
    detailLevel?: number | null;
    charter?: string | null;
  } | null;
  songMetadata?: {
    title?: string;
    artist?: string;
    category?: string;
    isNew?: boolean;
    bpm?: number | string | null;
  } | null;
  dxScore?: string | null;
  score?: string | null;
  fs?: string | null;
  fc?: string | null;
  rating?: number | null;
  isNew?: boolean | null;
};
