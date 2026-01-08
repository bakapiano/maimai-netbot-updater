export type JobStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'canceled';
export type JobStage = 'send_request' | 'wait_acceptance' | 'update_score';

import type { UserNetProfile } from '../users/user.types';
export type UserProfile = UserNetProfile;

export interface JobResponse {
  id: string;
  friendCode: string;
  skipUpdateScore: boolean;
  botUserFriendCode?: string | null;
  friendRequestSentAt?: string | null;
  status: JobStatus;
  stage: JobStage;
  result?: any;
  profile?: UserProfile;
  error?: string | null;
  executing?: boolean;
  createdAt: string;
  updatedAt: string;
}
