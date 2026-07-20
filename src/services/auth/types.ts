export type MeUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  onboardingCompleted: boolean;
};

export type MeWorkspace = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

export type MeResponse = {
  user: MeUser;
  workspaces: MeWorkspace[];
};
