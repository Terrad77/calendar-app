export interface UserState {
  refreshToken: string | null;
  user?: {
    _id: string;
  };
}
