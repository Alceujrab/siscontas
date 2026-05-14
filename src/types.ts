export type LayoutMode = 'top' | 'sidebar' | 'modern-sidebar' | 'minimal';

export interface CompanyConfig {
  name: string;
  cnpj: string;
  address: string;
  phone: string;
  logoUrl: string;
  layout: LayoutMode;
}

export type EntryType = 'credit' | 'debit';

export interface Attachment {
  name: string;
  type: string;
  data: string; // Base64
}

export interface Vehicle {
  id: string;
  placa: string;
  nome: string;
}

export interface Client {
  id: string;
  nome: string;
  documento: string;
}

export interface Entry {
  id: string;
  clienteId?: string;
  placa: string;
  periodo: string; // e.g., '05/2026'
  descricao: string;
  observacoes?: string;
  valor: number;
  type: EntryType;
  createdAt: string;
  attachment?: Attachment;
}
