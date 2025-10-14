export interface UserState {
  refreshToken: string | null;
  user?: {
    _id: string;
    // інші поля користувача
  };
  // інші властивості стану
}
