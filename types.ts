// types.ts
export enum UserRole {
  ADMIN = 'ADMIN',
  AGENT = 'AGENT'
}

export enum ActivityType {
  PAYMENT = 'PAYMENT',
  REGISTRATION = 'REGISTRATION',
  SYSTEM_CONFIG = 'SYSTEM_CONFIG'
}

export interface Activity {
  id: string;
  agentId: string;
  type: ActivityType;
  description: string;
  date: string;
  amount?: number;
}

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface Agent {
  id: string;
  profileId: string; 
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  locationId: string;
  active: boolean;
}

export interface Item {
  id: string;
  name: string;
  price: number;
  boxValue: number;
  imageUrl?: string;
}

export interface Location {
  id: string;
  name: string;
}

export interface CustomerProduct {
  itemId: string;
  totalAmount: number;
  costBasis: number;
  balance: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  locationId: string;
  agentId: string;
  products: CustomerProduct[];
  registrationFeePaid: number;
  active: boolean;
}

export interface Payment {
  id: string;
  customerId: string;
  itemId: string;
  amount: number;
  agentId: string;
  date: string;
  boxCount?: number;
}

export interface SystemSettings {
  boxValue: number;
  registrationFee: number;
}