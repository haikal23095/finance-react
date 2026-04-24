export interface Transaction {
  id: number;
  userId: number;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  userId: number;
}
