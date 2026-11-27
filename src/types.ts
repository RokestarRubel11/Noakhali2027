export type Language = 'en' | 'bn';

export type UserRole = 'admin' | 'member';

export interface SocietySettings {
  societyNameEn: string;
  societyNameBn: string;
  monthlyDepositAmount: number;
  defaultLateFine: number;
  graceDayOfMonth: number;
  bkashNumber: string;
  bkashAccountType: string;
  nagadNumber: string;
  nagadAccountType: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankBranch: string;
  bankRoutingNumber: string;
}

export interface AdminUserPublic {
  id: string;
  name: string;
  email: string;
  role: 'admin';
  createdAt: string;
}

export type RegistrationStatus = 'unsubmitted' | 'pending' | 'approved' | 'rejected';

export type MembershipType = 'general' | 'honorable' | 'other';

export interface MemberPublic {
  id: string;
  memberId: string;
  name: string;
  fatherName?: string;
  motherName?: string;
  dateOfBirth?: string;
  email: string;
  phone: string;
  address: string;
  permanentAddress?: string;
  occupation?: string;
  nid: string;
  membershipType?: MembershipType;
  nomineeName: string;
  nomineeRelation: string;
  avatarDataUrl?: string;
  signatureText?: string;
  acceptedRules?: boolean;
  registrationCompleted: boolean;
  registrationStatus?: RegistrationStatus;
  monthlyTarget: number;
  totalSavings: number;
  status: 'active' | 'pending' | 'suspended';
  role: 'member';
  joinedAt: string;
}

export type PaymentMethod = 'bkash' | 'nagad' | 'bank';
export type PaymentType = 'monthly_deposit' | 'fine_payment' | 'extra_savings';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export interface PaymentSubmission {
  id: string;
  memberDocId: string;
  memberId: string;
  memberName: string;
  paymentType: PaymentType;
  month: string;
  amount: number;
  method: PaymentMethod;
  senderAccount: string;
  transactionId: string;
  note: string;
  screenshotDataUrl?: string;
  status: PaymentStatus;
  receiptNumber?: string;
  rejectionReason?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
}

export type WithdrawalStatus = 'pending' | 'approved' | 'rejected';

export interface WithdrawalRequest {
  id: string;
  memberDocId: string;
  memberId: string;
  memberName: string;
  amount: number;
  method: PaymentMethod;
  accountDetails: string;
  reason: string;
  status: WithdrawalStatus;
  rejectionReason?: string;
  approvedBy?: string;
  processedAt?: string;
  createdAt: string;
}

export type FineStatus = 'unpaid' | 'paid' | 'waived';

export interface FineRecord {
  id: string;
  memberDocId: string;
  memberId: string;
  memberName: string;
  reason: string;
  amount: number;
  dueDate: string;
  status: FineStatus;
  paidAt?: string;
  createdAt: string;
}

export type LedgerType = 'income' | 'expense';

export interface LedgerEntry {
  id: string;
  type: LedgerType;
  category: string;
  title: string;
  amount: number;
  date: string;
  description: string;
  recordedBy: string;
  createdAt: string;
}

export type InvestmentStatus = 'active' | 'completed' | 'planned';

export interface InvestmentProject {
  id: string;
  titleEn: string;
  titleBn: string;
  category: string;
  investedAmount: number;
  expectedReturnRate: number;
  actualReturnAmount: number;
  startDate: string;
  maturityDate: string;
  status: InvestmentStatus;
  descriptionEn: string;
  descriptionBn: string;
  createdAt: string;
}

export type MeetingStatus = 'upcoming' | 'completed';

export interface MeetingNotice {
  id: string;
  titleEn: string;
  titleBn: string;
  date: string;
  time: string;
  location: string;
  agendaEn: string;
  agendaBn: string;
  minutesEn: string;
  minutesBn: string;
  status: MeetingStatus;
  createdAt: string;
}

export interface VoteOption {
  id: string;
  labelEn: string;
  labelBn: string;
  votes: number;
}

export interface VotePoll {
  id: string;
  questionEn: string;
  questionBn: string;
  options: VoteOption[];
  votedMemberIds: string[];
  deadline: string;
  status: 'open' | 'closed';
  createdAt: string;
}

export interface AdminOverviewResponse {
  admin: AdminUserPublic;
  settings: SocietySettings;
  stats: {
    totalMembers: number;
    activeMembers: number;
    totalSavings: number;
    totalVerifiedDeposits: number;
    thisMonthDeposits: number;
    pendingPaymentsCount: number;
    pendingPaymentsAmount: number;
    approvedWithdrawalsAmount: number;
    pendingWithdrawalsCount: number;
    totalInvested: number;
    activeInvestmentsCount: number;
    totalIncome: number;
    totalExpense: number;
    unpaidFinesAmount: number;
  };
  members: MemberPublic[];
  payments: PaymentSubmission[];
  withdrawals: WithdrawalRequest[];
  fines: FineRecord[];
  ledger: LedgerEntry[];
  investments: InvestmentProject[];
  meetings: MeetingNotice[];
  polls: VotePoll[];
  admins: AdminUserPublic[];
}

export interface SocietyMemberSummary {
  id: string;
  memberId: string;
  name: string;
  avatarDataUrl?: string;
  monthlyTarget: number;
  totalSavings: number;
  status: 'active' | 'pending' | 'suspended';
  joinedAt: string;
}

export interface SocietyPaymentSummary {
  id: string;
  memberDocId: string;
  paymentType: PaymentType;
  month: string;
  amount: number;
  status: PaymentStatus;
  createdAt: string;
}

export interface SocietyFineSummary {
  id: string;
  memberDocId: string;
  amount: number;
  dueDate: string;
  status: FineStatus;
}

export interface MemberOverviewResponse {
  member: MemberPublic;
  settings: SocietySettings;
  payments: PaymentSubmission[];
  withdrawals: WithdrawalRequest[];
  fines: FineRecord[];
  investments: InvestmentProject[];
  meetings: MeetingNotice[];
  polls: VotePoll[];
  societyMembers: SocietyMemberSummary[];
  societyPayments: SocietyPaymentSummary[];
  societyFines: SocietyFineSummary[];
}
