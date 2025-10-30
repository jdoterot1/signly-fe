
export interface User {
  id?: string;
  name?: string;
  email: string;
  password: string;
  status: string;
  workload: string;
  birthDate?: Date;
  rol: string;
  profileImage?: File;
}
