import { apiRequest } from "./api";

export enum CampaignTargetType {
  Global = 0,
  Book = 1,
  Category = 2
}

export enum CampaignSponsorType {
  Platform = 0,
  Author = 1
}

export type CampaignDto = {
  id: string;
  name: string;
  targetType: CampaignTargetType;
  targetId?: string | null;
  discountPercentage: number;
  sponsorType: CampaignSponsorType;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

export type WalletPackageDto = {
  id: string;
  tokens: number;
  price: number;
  icon: string;
  name: string;
  popular?: boolean;
  bestValue?: boolean;
  bonus: number;
  isActive: boolean;
  displayOrder: number;
};

export type TransactionDto = {
  id: string;
  amount: number;
  fiatAmount?: number | null;
  type: string;
  description: string;
  createdAt: string;
  referenceId?: string | null;
  invoiceFileUrl?: string | null;
  invoiceDocumentId?: string | null;
};

export type OrderDto = {
  id: string;
  userId: string;
  buyerEmail: string;
  packageName: string;
  pricePaid: number;
  coinAmount: number;
  status: OrderStatus;
  invoiceFileUrl?: string | null;
  invoiceDocumentId?: string | null;
  createdAt: string;
  paidAt?: string | null;
};

export enum OrderStatus {
  Pending = 0,
  Paid = 1,
  Failed = 2,
  Refunded = 3
}

export type TransactionResponse = {
  items: TransactionDto[];
  totalCount: number;
};

export type MyOrdersResponse = {
  items: OrderDto[];
  totalCount: number;
};

export async function getWalletTransactions(page: number = 1, pageSize: number = 20, search?: string, type?: string) {
  const query = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });
  if (search) query.set("search", search);
  if (type) query.set("type", type);

  return apiRequest<TransactionResponse>(`/wallet/transactions?${query.toString()}`, {
    method: "GET",
    credentials: "include",
  });
}

export async function getMyOrders(page: number = 1, pageSize: number = 10) {
  const query = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });

  return apiRequest<MyOrdersResponse>(`/wallet/orders/me?${query.toString()}`, {
    method: "GET",
    credentials: "include",
  });
}

export async function getWalletPackages() {
  return apiRequest<WalletPackageDto[]>("/wallet/packages", {
    method: "GET",
  });
}

export async function getAdminWalletPackages(params?: { page?: number, pageSize?: number, search?: string }) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", params.page.toString());
  if (params?.pageSize) query.set("pageSize", params.pageSize.toString());
  if (params?.search) query.set("search", params.search);

  return apiRequest<{ items: WalletPackageDto[], totalCount: number }>(`/wallet/admin/packages${query.toString() ? `?${query.toString()}` : ""}`, {
    method: "GET",
    credentials: "include",
  });
}

export async function createWalletPackage(data: { name: string, price: number, tokens: number, bonus: number, icon: string, displayOrder: number, isBestValue: boolean }) {
  return apiRequest<string>("/wallet/admin/packages", {
    method: "POST",
    body: JSON.stringify({
      name: data.name,
      price: data.price,
      amount: data.tokens,
      bonusAmount: data.bonus,
      icon: data.icon,
      displayOrder: data.displayOrder,
      isBestValue: data.isBestValue
    }),
    credentials: "include",
  });
}

export async function updateWalletPackage(id: string, data: Partial<WalletPackageDto>) {
  return apiRequest<boolean>(`/wallet/admin/packages/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      id,
      name: data.name,
      price: data.price,
      amount: data.tokens,
      bonusAmount: data.bonus,
      icon: data.icon,
      displayOrder: data.displayOrder,
      isActive: data.isActive,
      isBestValue: data.bestValue
    }),
    credentials: "include",
  });
}

export async function deleteWalletPackage(id: string) {
  return apiRequest<boolean>(`/wallet/admin/packages/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
}

// Campaign Management
export async function getAdminCampaigns(params?: { page?: number, pageSize?: number, search?: string }) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", params.page.toString());
  if (params?.pageSize) query.set("pageSize", params.pageSize.toString());
  if (params?.search) query.set("search", params.search);

  return apiRequest<{ items: CampaignDto[], totalCount: number }>(`/wallet/admin/campaigns${query.toString() ? `?${query.toString()}` : ""}`, {
    method: "GET",
    credentials: "include",
  });
}

export async function createCampaign(data: Omit<CampaignDto, "id" | "isActive">) {
  return apiRequest<string>("/wallet/admin/campaigns", {
    method: "POST",
    body: JSON.stringify(data),
    credentials: "include",
  });
}

export async function updateCampaign(id: string, data: Partial<CampaignDto>) {
  return apiRequest<boolean>(`/wallet/admin/campaigns/${id}`, {
    method: "PUT",
    body: JSON.stringify({ ...data, id }),
    credentials: "include",
  });
}

export async function deleteCampaign(id: string) {
  return apiRequest<boolean>(`/wallet/admin/campaigns/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
}

export async function getAdminOrders(params?: { page?: number, pageSize?: number, search?: string }) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", params.page.toString());
  if (params?.pageSize) query.set("pageSize", params.pageSize.toString());
  if (params?.search) query.set("search", params.search);

  return apiRequest<{ items: OrderDto[], totalCount: number }>(`/wallet/admin/orders${query.toString() ? `?${query.toString()}` : ""}`, {
    method: "GET",
    credentials: "include",
  });
}

export async function uploadInvoice(orderId: string, documentId: string) {
  return apiRequest<string>(`/wallet/admin/orders/${orderId}/invoice`, {
    method: "POST",
    body: JSON.stringify({ orderId, invoiceDocumentId: documentId }),
    credentials: "include",
  });
}

export async function createManualOrder(data: { userId: string, buyerEmail: string, pricePaid: number, coinAmount: number, description: string, invoiceDocumentId?: string | null }) {
  return apiRequest<string>("/wallet/admin/orders/manual", {
    method: "POST",
    body: JSON.stringify(data),
    credentials: "include",
  });
}

// Withdrawal Management
export enum WithdrawStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  Completed = 3
}

export type WithdrawDto = {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  iban: string;
  accountHolderName: string;
  status: WithdrawStatus;
  createdAt: string;
  adminNote?: string;
  receiptDocumentId?: string;
};

export type WithdrawResponse = {
  items: WithdrawDto[];
  totalCount: number;
};

export async function getAdminWithdrawals(params: { page?: number, pageSize?: number, status?: WithdrawStatus, search?: string }) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", params.page.toString());
  if (params.pageSize) query.set("pageSize", params.pageSize.toString());
  if (params.status !== undefined) query.set("status", params.status.toString());
  if (params.search) query.set("search", params.search);

  return apiRequest<WithdrawResponse>(`/wallet/admin/withdrawals?${query.toString()}`, {
    method: "GET",
    credentials: "include",
  });
}

export async function processWithdrawal(id: string, status: WithdrawStatus, note?: string, receiptDocumentId?: string) {
  return apiRequest<boolean>(`/wallet/admin/withdrawals/${id}/process`, {
    method: "POST",
    body: JSON.stringify({ id, status, note, receiptDocumentId }),
    credentials: "include",
  });
}

export type InitializePurchaseResponse = {
  checkoutFormContent: string;
  token: string;
};

export async function initializeCoinPurchase(packageId: string) {
  return apiRequest<InitializePurchaseResponse>("/wallet/orders/initialize", {
    method: "POST",
    body: JSON.stringify({ coinPackageId: packageId }),
    credentials: "include",
  });
}

export type WalletBalanceDto = {
  coinBalance: number;
  revenueBalance: number;
};

export async function getWalletBalance() {
  return apiRequest<WalletBalanceDto>("/wallet/balance", {
    method: "GET",
    credentials: "include",
  });
}

export async function purchaseChapter(chapterId: string) {
  return apiRequest<string>("/wallet/purchase-chapter", {
    method: "POST",
    body: JSON.stringify({ chapterId }),
    credentials: "include",
  });
}

