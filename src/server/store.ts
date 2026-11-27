import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { supabaseServer } from './supabaseServer.ts';
import type {
  AdminUserPublic,
  FineRecord,
  InvestmentProject,
  LedgerEntry,
  MeetingNotice,
  MemberPublic,
  PaymentSubmission,
  SocietySettings,
  VotePoll,
  WithdrawalRequest,
} from '../types.ts';

interface AdminStored extends AdminUserPublic {
  passwordHash: string;
}

interface MemberStored extends MemberPublic {
  passwordHash: string;
}

export interface SocietyDatabase {
  admins: AdminStored[];
  members: MemberStored[];
  payments: PaymentSubmission[];
  withdrawals: WithdrawalRequest[];
  fines: FineRecord[];
  ledger: LedgerEntry[];
  investments: InvestmentProject[];
  meetings: MeetingNotice[];
  polls: VotePoll[];
  settings: SocietySettings;
  nextMemberSeq: number;
  nextReceiptSeq: number;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'society-db.json');

const DEFAULT_SETTINGS: SocietySettings = {
  societyNameEn: 'Hello Noakhali Savings and Investment Society',
  societyNameBn: 'হ্যালো নোয়াখালী সঞ্চয় ও বিনিয়োগ সমিতি',
  monthlyDepositAmount: 1000,
  defaultLateFine: 100,
  graceDayOfMonth: 10,
  bkashNumber: '01800-000000',
  bkashAccountType: 'Merchant / Personal',
  nagadNumber: '01700-000000',
  nagadAccountType: 'Personal',
  bankName: 'Islami Bank Bangladesh PLC',
  bankAccountName: 'Hello Noakhali Savings and Investment Society',
  bankAccountNumber: '2050-0000-0000-0001',
  bankBranch: 'Maijdee Court Branch, Noakhali',
  bankRoutingNumber: '125751096',
};

export const SOLE_ADMIN_EMAIL = 'noakhali2027@gmail.com';

function createMainAdmin(): AdminStored {
  const mainAdminPass = process.env.MAIN_ADMIN_PASSWORD || 'Hello2027';
  return {
    id: 'adm_main',
    name: 'Main Administrator',
    email: SOLE_ADMIN_EMAIL,
    role: 'admin',
    passwordHash: bcrypt.hashSync(mainAdminPass, 10),
    createdAt: new Date().toISOString(),
  };
}

function createInitialDb(): SocietyDatabase {
  return {
    admins: [createMainAdmin()],
    members: [],
    payments: [],
    withdrawals: [],
    fines: [],
    ledger: [],
    investments: [],
    meetings: [],
    polls: [],
    settings: DEFAULT_SETTINGS,
    nextMemberSeq: 1,
    nextReceiptSeq: 1,
  };
}

let cachedDb: SocietyDatabase | null = null;
let supabaseSyncChain: Promise<void> = Promise.resolve();
let supabaseSchemaReady = false;

function normalizeLoadedDb(parsed: SocietyDatabase): SocietyDatabase {
  const mainAdminPass = process.env.MAIN_ADMIN_PASSWORD || 'Hello2027';
  const isExactSoleAdmin =
    Array.isArray(parsed.admins) &&
    parsed.admins.length === 1 &&
    parsed.admins[0].email?.toLowerCase() === SOLE_ADMIN_EMAIL &&
    typeof parsed.admins[0].passwordHash === 'string' &&
    bcrypt.compareSync(mainAdminPass, parsed.admins[0].passwordHash);
  if (!isExactSoleAdmin) {
    parsed.admins = [createMainAdmin()];
  }
  if (!Array.isArray(parsed.members)) parsed.members = [];
  if (!Array.isArray(parsed.payments)) parsed.payments = [];
  if (!Array.isArray(parsed.withdrawals)) parsed.withdrawals = [];
  if (!Array.isArray(parsed.fines)) parsed.fines = [];
  if (!Array.isArray(parsed.ledger)) parsed.ledger = [];
  if (!Array.isArray(parsed.investments)) parsed.investments = [];
  if (!Array.isArray(parsed.meetings)) parsed.meetings = [];
  if (!Array.isArray(parsed.polls)) parsed.polls = [];
  if (!parsed.settings) parsed.settings = DEFAULT_SETTINGS;
  if (typeof parsed.nextMemberSeq !== 'number') parsed.nextMemberSeq = 1;
  if (typeof parsed.nextReceiptSeq !== 'number') parsed.nextReceiptSeq = 1;
  return parsed;
}

function writeLocalDb(db: SocietyDatabase): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpPath, DB_PATH);
  cachedDb = db;
}

async function performSupabaseSync(db: SocietyDatabase): Promise<void> {
  try {
    const { error: stateErr } = await supabaseServer.from('society_state').upsert({
      id: 1,
      data: db,
      updated_at: new Date().toISOString(),
    });
    if (stateErr) {
      if (!stateErr.message?.includes('schema cache') && stateErr.code !== 'PGRST205') {
        console.warn('Supabase sync note:', stateErr.message);
      }
      return;
    }
    supabaseSchemaReady = true;

    await supabaseServer.from('settings').upsert({
      id: 1,
      society_name_en: db.settings.societyNameEn,
      society_name_bn: db.settings.societyNameBn,
      monthly_deposit_amount: db.settings.monthlyDepositAmount,
      default_late_fine: db.settings.defaultLateFine,
      grace_day_of_month: db.settings.graceDayOfMonth,
      bkash_number: db.settings.bkashNumber,
      bkash_account_type: db.settings.bkashAccountType,
      nagad_number: db.settings.nagadNumber,
      nagad_account_type: db.settings.nagadAccountType,
      bank_name: db.settings.bankName,
      bank_account_name: db.settings.bankAccountName,
      bank_account_number: db.settings.bankAccountNumber,
      bank_branch: db.settings.bankBranch,
      bank_routing_number: db.settings.bankRoutingNumber,
    });

    if (db.admins.length > 0) {
      await supabaseServer.from('admins').upsert(
        db.admins.map((a) => ({
          id: a.id,
          name: a.name,
          email: a.email,
          role: a.role,
          password_hash: a.passwordHash,
          created_at: a.createdAt,
        }))
      );
    }

    if (db.members.length > 0) {
      await supabaseServer.from('members').upsert(
        db.members.map((m) => ({
          id: m.id,
          member_id: m.memberId,
          name: m.name,
          father_name: m.fatherName || '',
          mother_name: m.motherName || '',
          date_of_birth: m.dateOfBirth || '',
          email: m.email || null,
          phone: m.phone || '',
          address: m.address || '',
          permanent_address: m.permanentAddress || '',
          occupation: m.occupation || '',
          nid: m.nid || '',
          membership_type: m.membershipType || 'general',
          nominee_name: m.nomineeName || '',
          nominee_relation: m.nomineeRelation || '',
          avatar_data_url: m.avatarDataUrl || '',
          signature_text: m.signatureText || '',
          accepted_rules: Boolean(m.acceptedRules),
          registration_completed: Boolean(m.registrationCompleted),
          registration_status: m.registrationStatus || 'unsubmitted',
          monthly_target: m.monthlyTarget,
          total_savings: m.totalSavings,
          status: m.status,
          role: m.role,
          joined_at: m.joinedAt,
          password_hash: m.passwordHash,
        }))
      );
    }

    if (db.payments.length > 0) {
      await supabaseServer.from('payments').upsert(
        db.payments.map((p) => ({
          id: p.id,
          member_doc_id: p.memberDocId,
          member_id: p.memberId,
          member_name: p.memberName,
          payment_type: p.paymentType,
          month: p.month,
          amount: p.amount,
          method: p.method,
          sender_account: p.senderAccount,
          transaction_id: p.transactionId,
          note: p.note || '',
          screenshot_data_url: p.screenshotDataUrl || null,
          status: p.status,
          rejection_reason: p.rejectionReason || null,
          receipt_number: p.receiptNumber || null,
          verified_by: p.verifiedBy || null,
          created_at: p.createdAt,
        }))
      );
    }

    if (db.withdrawals.length > 0) {
      await supabaseServer.from('withdrawals').upsert(
        db.withdrawals.map((w) => ({
          id: w.id,
          member_doc_id: w.memberDocId,
          member_id: w.memberId,
          member_name: w.memberName,
          amount: w.amount,
          method: w.method,
          account_details: w.accountDetails,
          reason: w.reason || '',
          status: w.status,
          rejection_reason: w.rejectionReason || null,
          approved_by: w.approvedBy || null,
          processed_at: w.processedAt || null,
          created_at: w.createdAt,
        }))
      );
    }

    if (db.fines.length > 0) {
      await supabaseServer.from('fines').upsert(
        db.fines.map((f) => ({
          id: f.id,
          member_doc_id: f.memberDocId,
          member_id: f.memberId,
          member_name: f.memberName,
          reason: f.reason,
          amount: f.amount,
          due_date: f.dueDate,
          status: f.status,
          created_at: f.createdAt,
        }))
      );
    }

    if (db.ledger.length > 0) {
      await supabaseServer.from('ledger').upsert(
        db.ledger.map((l) => ({
          id: l.id,
          type: l.type,
          category: l.category,
          title: l.title,
          amount: l.amount,
          date: l.date,
          description: l.description || '',
          recorded_by: l.recordedBy || '',
          created_at: l.createdAt,
        }))
      );
    }

    if (db.investments.length > 0) {
      await supabaseServer.from('investments').upsert(
        db.investments.map((inv) => ({
          id: inv.id,
          title_en: inv.titleEn,
          title_bn: inv.titleBn || '',
          category: inv.category || '',
          invested_amount: inv.investedAmount,
          expected_return_rate: inv.expectedReturnRate || 0,
          actual_return_amount: inv.actualReturnAmount || 0,
          start_date: inv.startDate || null,
          maturity_date: inv.maturityDate || null,
          description_en: inv.descriptionEn || '',
          description_bn: inv.descriptionBn || '',
          status: inv.status,
          created_at: inv.createdAt,
        }))
      );
    }

    if (db.meetings.length > 0) {
      await supabaseServer.from('meetings').upsert(
        db.meetings.map((mt) => ({
          id: mt.id,
          title_en: mt.titleEn,
          title_bn: mt.titleBn || '',
          date: mt.date,
          time: mt.time || '',
          location: mt.location || '',
          agenda_en: mt.agendaEn || '',
          agenda_bn: mt.agendaBn || '',
          minutes_en: mt.minutesEn || '',
          minutes_bn: mt.minutesBn || '',
          status: mt.status,
          created_at: mt.createdAt,
        }))
      );
    }

    if (db.polls.length > 0) {
      await supabaseServer.from('polls').upsert(
        db.polls.map((pl) => ({
          id: pl.id,
          question_en: pl.questionEn,
          question_bn: pl.questionBn || '',
          deadline: pl.deadline || null,
          status: pl.status,
          options: pl.options,
          voted_member_ids: pl.votedMemberIds,
          created_at: pl.createdAt,
        }))
      );
    }
  } catch (err) {
    console.warn('Supabase background sync warning:', err);
  }
}

export function isSupabaseSchemaReady(): boolean {
  return supabaseSchemaReady;
}

export async function initDbFromSupabase(): Promise<void> {
  const local = loadDb();
  try {
    const { data, error } = await supabaseServer
      .from('society_state')
      .select('data')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      if (error.code !== 'PGRST205' && !error.message?.includes('schema cache')) {
        console.warn('Supabase init check:', error.message);
      }
      return;
    }

    supabaseSchemaReady = true;
    const remote = data?.data as SocietyDatabase | undefined;
    if (remote && Array.isArray(remote.admins) && Array.isArray(remote.members)) {
      const normalized = normalizeLoadedDb(remote);
      writeLocalDb(normalized);
    } else {
      await performSupabaseSync(local);
    }
  } catch (err) {
    console.warn('Supabase init fallback to local store:', err);
  }
}

export function loadDb(): SocietyDatabase {
  if (cachedDb) return cachedDb;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const initial = createInitialDb();
    writeLocalDb(initial);
    return initial;
  }
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  const parsed = normalizeLoadedDb(JSON.parse(raw) as SocietyDatabase);
  writeLocalDb(parsed);
  return parsed;
}

export function saveDb(db: SocietyDatabase): void {
  writeLocalDb(db);
  const snapshot = JSON.parse(JSON.stringify(db)) as SocietyDatabase;
  supabaseSyncChain = supabaseSyncChain
    .then(() => performSupabaseSync(snapshot))
    .catch(() => {});
}

export function sanitizeAdmin(a: AdminStored): AdminUserPublic {
  return {
    id: a.id,
    name: a.name,
    email: a.email,
    role: 'admin',
    createdAt: a.createdAt,
  };
}

export function sanitizeMember(m: MemberStored): MemberPublic {
  return {
    id: m.id,
    memberId: m.memberId,
    name: m.name,
    fatherName: m.fatherName || '',
    motherName: m.motherName || '',
    dateOfBirth: m.dateOfBirth || '',
    email: m.email,
    phone: m.phone,
    address: m.address,
    permanentAddress: m.permanentAddress || '',
    occupation: m.occupation || '',
    nid: m.nid,
    membershipType: m.membershipType || 'general',
    nomineeName: m.nomineeName,
    nomineeRelation: m.nomineeRelation,
    avatarDataUrl: m.avatarDataUrl || '',
    signatureText: m.signatureText || '',
    acceptedRules: Boolean(m.acceptedRules),
    registrationCompleted: m.registrationCompleted !== false,
    registrationStatus:
      m.registrationStatus || (m.registrationCompleted ? 'approved' : 'unsubmitted'),
    monthlyTarget: m.monthlyTarget,
    totalSavings: m.totalSavings,
    status: m.status,
    role: 'member',
    joinedAt: m.joinedAt,
  };
}

export function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

export function formatMemberCode(seq: number): string {
  return `HNS-${String(seq).padStart(4, '0')}`;
}

export function formatReceiptCode(seq: number): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `RCP-${y}${m}${day}-${String(seq).padStart(4, '0')}`;
}
