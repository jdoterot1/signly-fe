export interface Role {
  id: string;
  name: string;
  description?: string;
  status: string;
permits: string;
}
