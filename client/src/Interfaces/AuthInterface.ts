import type { User } from "./index";

export type UserDetails = User;

export interface LoginCredentialsErrorFields {
  username?: string[];
  password?: string[];
}