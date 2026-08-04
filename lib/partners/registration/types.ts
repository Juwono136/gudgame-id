export type PartnerManageRegistrationRow = {
  id: string;
  status: string;
  teamName: string;
  feeIdr: number | null;
  createdAt: string;
  confirmedAt: string | null;
  paymentStatus: string | null;
  members: {
    fullName: string;
    email: string | null;
    phone: string | null;
    isCaptain: boolean;
    roleOrder: number;
  }[];
};
