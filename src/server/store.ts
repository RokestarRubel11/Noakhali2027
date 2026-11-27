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

const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = IS_SERVERLESS
  ? path.join('/tmp', 'hns-society-data')
  : path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'society-db.json');

const DEFAULT_SETTINGS: SocietySettings = {
  societyNameEn: 'Hello Noakhali Savings and Investment Society',
  societyNameBn: 'হ্যালো নোয়াখালী সঞ্চয় ও বিনিয়োগ সমিতি',
  monthlyDepositAmount: 5000,
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
    passwordHash: bcrypt.hashSync(mainAdminPass, 8),
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
let supabaseWriteReady = false;
let lastSupabaseSyncError: string | null = null;
let initPromise: Promise<void> | null = null;
let hasHydratedOnce = false;
let lastHydratedAt = 0;

// Track per-table remote row counts to avoid redundant DELETE calls on empty tables
const lastSyncedCounts: Record<string, number | undefined> = {};

function recordSyncedCounts(db: SocietyDatabase): void {
  lastSyncedCounts.members = db.members.length;
  lastSyncedCounts.payments = db.payments.length;
  lastSyncedCounts.withdrawals = db.withdrawals.length;
  lastSyncedCounts.fines = db.fines.length;
  lastSyncedCounts.ledger = db.ledger.length;
  lastSyncedCounts.investments = db.investments.length;
  lastSyncedCounts.meetings = db.meetings.length;
  lastSyncedCounts.polls = db.polls.length;
}

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
  cachedDb = db;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpPath = `${DB_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tmpPath, DB_PATH);
  } catch (err) {
    console.warn('Local DB write skipped (using in-memory + Supabase):', err);
  }
}

function isMissingTableError(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === 'PGRST205' || Boolean(error.message?.includes('schema cache'));
}

function isMissingColumnError(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === 'PGRST204' || Boolean(error.message?.includes('Could not find'));
}

async function performSupabaseSync(db: SocietyDatabase): Promise<void> {
  try {
    let anyCoreTableReady = false;
    let firstWriteError: string | null = null;
    const trackErr = (err: { message?: string; code?: string } | null | undefined) => {
      if (err && !isMissingTableError(err) && !firstWriteError) {
        firstWriteError = err.message || err.code || 'Supabase write failed';
      }
    };

    const tasks: Promise<void>[] = [];

    tasks.push(
      (async () => {
        const { error: stateErr } = await supabaseServer.from('society_state').upsert({
          id: 1,
          data: db,
          updated_at: new Date().toISOString(),
        });
        if (!stateErr) {
          anyCoreTableReady = true;
        } else if (!isMissingTableError(stateErr)) {
          console.warn('Supabase society_state sync note:', stateErr.message);
          trackErr(stateErr);
        }
      })()
    );

    tasks.push(
      (async () => {
        const { error: settingsErr } = await supabaseServer.from('settings').upsert({
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
        if (!settingsErr) {
          anyCoreTableReady = true;
        } else if (!isMissingTableError(settingsErr)) {
          console.warn('Supabase settings sync note:', settingsErr.message);
          trackErr(settingsErr);
        }
      })()
    );

    if (db.admins.length > 0) {
      tasks.push(
        (async () => {
          const { error: adminErr } = await supabaseServer.from('admins').upsert(
            db.admins.map((a) => ({
              id: a.id,
              name: a.name,
              email: a.email,
              role: a.role,
              password_hash: a.passwordHash,
              created_at: a.createdAt,
            }))
          );
          if (!adminErr) {
            anyCoreTableReady = true;
          } else if (!isMissingTableError(adminErr)) {
            console.warn('Supabase admins sync note:', adminErr.message);
          }
        })()
      );
    }

    if (db.members.length > 0) {
      tasks.push(
        (async () => {
          const { error: memErr } = await supabaseServer.from('members').upsert(
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
          if (!memErr) {
            anyCoreTableReady = true;
            lastSyncedCounts.members = db.members.length;
          } else if (isMissingColumnError(memErr)) {
            const { error: memBaseErr } = await supabaseServer.from('members').upsert(
              db.members.map((m) => ({
                id: m.id,
                member_id: m.memberId,
                name: m.name,
                email: m.email || null,
                phone: m.phone || '',
                address: m.address || '',
                permanent_address: m.permanentAddress || '',
                occupation: m.occupation || '',
                nid: m.nid || '',
                nominee_name: m.nomineeName || '',
                nominee_relation: m.nomineeRelation || '',
                avatar_data_url: m.avatarDataUrl || '',
                monthly_target: m.monthlyTarget,
                total_savings: m.totalSavings,
                status: m.status,
                role: m.role,
                joined_at: m.joinedAt,
                password_hash: m.passwordHash,
              }))
            );
            if (!memBaseErr) {
              anyCoreTableReady = true;
              lastSyncedCounts.members = db.members.length;
            } else if (!isMissingTableError(memBaseErr)) {
              console.warn('Supabase members sync note:', memBaseErr.message);
            }
          } else if (!isMissingTableError(memErr)) {
            console.warn('Supabase members sync note:', memErr.message);
          }
        })()
      );
    } else if (lastSyncedCounts.members !== 0) {
      tasks.push(
        (async () => {
          const { error } = await supabaseServer.from('members').delete().neq('id', '__never__');
          if (!error) lastSyncedCounts.members = 0;
        })()
      );
    }

    if (db.payments.length > 0) {
      tasks.push(
        (async () => {
          const { error: payErr } = await supabaseServer.from('payments').upsert(
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
          if (!payErr) {
            lastSyncedCounts.payments = db.payments.length;
          } else if (!isMissingTableError(payErr)) {
            console.warn('Supabase payments sync note:', payErr.message);
          }
        })()
      );
    } else if (lastSyncedCounts.payments !== 0) {
      tasks.push(
        (async () => {
          const { error } = await supabaseServer.from('payments').delete().neq('id', '__never__');
          if (!error) lastSyncedCounts.payments = 0;
        })()
      );
    }

    if (db.withdrawals.length > 0) {
      tasks.push(
        (async () => {
          const { error: wErr } = await supabaseServer.from('withdrawals').upsert(
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
          if (!wErr) {
            lastSyncedCounts.withdrawals = db.withdrawals.length;
          } else if (!isMissingTableError(wErr)) {
            console.warn('Supabase withdrawals sync note:', wErr.message);
          }
        })()
      );
    } else if (lastSyncedCounts.withdrawals !== 0) {
      tasks.push(
        (async () => {
          const { error } = await supabaseServer.from('withdrawals').delete().neq('id', '__never__');
          if (!error) lastSyncedCounts.withdrawals = 0;
        })()
      );
    }

    if (db.fines.length > 0) {
      tasks.push(
        (async () => {
          const { error: fineErr } = await supabaseServer.from('fines').upsert(
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
          if (!fineErr) {
            lastSyncedCounts.fines = db.fines.length;
          } else if (!isMissingTableError(fineErr)) {
            console.warn('Supabase fines sync note:', fineErr.message);
          }
        })()
      );
    } else if (lastSyncedCounts.fines !== 0) {
      tasks.push(
        (async () => {
          const { error } = await supabaseServer.from('fines').delete().neq('id', '__never__');
          if (!error) lastSyncedCounts.fines = 0;
        })()
      );
    }

    if (db.ledger.length > 0) {
      tasks.push(
        (async () => {
          const { error: ledgerErr } = await supabaseServer.from('ledger').upsert(
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
          if (!ledgerErr) {
            lastSyncedCounts.ledger = db.ledger.length;
          } else if (!isMissingTableError(ledgerErr)) {
            console.warn('Supabase ledger sync note:', ledgerErr.message);
          }
        })()
      );
    } else if (lastSyncedCounts.ledger !== 0) {
      tasks.push(
        (async () => {
          const { error } = await supabaseServer.from('ledger').delete().neq('id', '__never__');
          if (!error) lastSyncedCounts.ledger = 0;
        })()
      );
    }

    if (db.investments.length > 0) {
      tasks.push(
        (async () => {
          const { error: invErr } = await supabaseServer.from('investments').upsert(
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
          if (!invErr) {
            lastSyncedCounts.investments = db.investments.length;
          } else if (!isMissingTableError(invErr)) {
            console.warn('Supabase investments sync note:', invErr.message);
          }
        })()
      );
    } else if (lastSyncedCounts.investments !== 0) {
      tasks.push(
        (async () => {
          const { error } = await supabaseServer.from('investments').delete().neq('id', '__never__');
          if (!error) lastSyncedCounts.investments = 0;
        })()
      );
    }

    if (db.meetings.length > 0) {
      tasks.push(
        (async () => {
          const { error: mtErr } = await supabaseServer.from('meetings').upsert(
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
          if (!mtErr) {
            lastSyncedCounts.meetings = db.meetings.length;
          } else if (!isMissingTableError(mtErr)) {
            console.warn('Supabase meetings sync note:', mtErr.message);
          }
        })()
      );
    } else if (lastSyncedCounts.meetings !== 0) {
      tasks.push(
        (async () => {
          const { error } = await supabaseServer.from('meetings').delete().neq('id', '__never__');
          if (!error) lastSyncedCounts.meetings = 0;
        })()
      );
    }

    if (db.polls.length > 0) {
      tasks.push(
        (async () => {
          const { error: pollErr } = await supabaseServer.from('polls').upsert(
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
          if (!pollErr) {
            lastSyncedCounts.polls = db.polls.length;
          } else if (!isMissingTableError(pollErr)) {
            console.warn('Supabase polls sync note:', pollErr.message);
          }
        })()
      );
    } else if (lastSyncedCounts.polls !== 0) {
      tasks.push(
        (async () => {
          const { error } = await supabaseServer.from('polls').delete().neq('id', '__never__');
          if (!error) lastSyncedCounts.polls = 0;
        })()
      );
    }

    await Promise.race([
      Promise.allSettled(tasks),
      new Promise<void>((resolve) => setTimeout(resolve, 2500)),
    ]);

    if (anyCoreTableReady) {
      supabaseSchemaReady = true;
      supabaseWriteReady = true;
      lastSupabaseSyncError = null;
    } else {
      supabaseWriteReady = false;
      if (firstWriteError) {
        lastSupabaseSyncError = firstWriteError;
      }
    }
  } catch (err) {
    lastSupabaseSyncError = err instanceof Error ? err.message : 'Supabase sync error';
    console.warn('Supabase background sync warning:', err);
  }
}

export function deleteSupabaseRow(table: string, id: string): void {
  supabaseSyncChain = supabaseSyncChain
    .then(async () => {
      await supabaseServer.from(table).delete().eq('id', id);
    })
    .catch(() => {});
}

export function isSupabaseSchemaReady(): boolean {
  return supabaseSchemaReady;
}

export function getSupabaseSyncStatus(): {
  schemaReady: boolean;
  writeReady: boolean;
  lastError: string | null;
} {
  return {
    schemaReady: supabaseSchemaReady,
    writeReady: supabaseWriteReady,
    lastError: lastSupabaseSyncError,
  };
}

export async function initDbFromSupabase(): Promise<void> {
  const local = loadDb();
  try {
    const queryPromise = supabaseServer
      .from('society_state')
      .select('data')
      .eq('id', 1)
      .maybeSingle();

    const timeoutPromise = new Promise<{ data: null; error: { message: string; code?: string } }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: 'Supabase init timeout' } }), 1500)
    );

    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

    if (!error) {
      supabaseSchemaReady = true;
      const remote = data?.data as SocietyDatabase | undefined;
      if (remote && Array.isArray(remote.admins) && Array.isArray(remote.members)) {
        const normalized = normalizeLoadedDb(remote);
        writeLocalDb(normalized);
        recordSyncedCounts(normalized);
        return;
      }
    }

    // Fallback: check 9-table schema directly (admins, members, settings)
    const tableCheckPromise = Promise.all([
      supabaseServer.from('members').select('*'),
      supabaseServer.from('settings').select('*').eq('id', 1).maybeSingle(),
      supabaseServer.from('payments').select('*'),
      supabaseServer.from('fines').select('*'),
      supabaseServer.from('ledger').select('*'),
      supabaseServer.from('investments').select('*'),
      supabaseServer.from('meetings').select('*'),
      supabaseServer.from('polls').select('*'),
    ]);
    const tableTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
    const tableResults = await Promise.race([tableCheckPromise, tableTimeout]);
    if (!tableResults) return;

    const [
      membersRes,
      settingsRes,
      paymentsRes,
      finesRes,
      ledgerRes,
      investmentsRes,
      meetingsRes,
      pollsRes,
    ] = tableResults;

    if (membersRes.error && isMissingTableError(membersRes.error)) {
      return;
    }
    supabaseSchemaReady = true;

    const remoteMembers = (membersRes.data || []) as Record<string, unknown>[];
    if ((IS_SERVERLESS || local.members.length === 0) && remoteMembers.length > 0) {
      const hydrated: SocietyDatabase = {
        ...local,
        members: remoteMembers.map((r) => ({
          id: String(r.id),
          memberId: String(r.member_id || 'HNS-0001'),
          name: String(r.name || ''),
          fatherName: String(r.father_name || ''),
          motherName: String(r.mother_name || ''),
          dateOfBirth: String(r.date_of_birth || ''),
          email: String(r.email || ''),
          phone: String(r.phone || ''),
          address: String(r.address || ''),
          permanentAddress: String(r.permanent_address || ''),
          occupation: String(r.occupation || ''),
          nid: String(r.nid || ''),
          membershipType:
            r.membership_type === 'honorable' || r.membership_type === 'other'
              ? r.membership_type
              : 'general',
          nomineeName: String(r.nominee_name || ''),
          nomineeRelation: String(r.nominee_relation || ''),
          avatarDataUrl: String(r.avatar_data_url || ''),
          signatureText: String(r.signature_text || ''),
          acceptedRules: Boolean(r.accepted_rules),
          registrationCompleted: Boolean(r.registration_completed),
          registrationStatus:
            r.registration_status === 'approved' ||
            r.registration_status === 'pending' ||
            r.registration_status === 'rejected'
              ? r.registration_status
              : 'unsubmitted',
          monthlyTarget: Number(r.monthly_target || 5000),
          totalSavings: Number(r.total_savings || 0),
          status:
            r.status === 'active' || r.status === 'suspended' ? r.status : 'pending',
          role: 'member',
          joinedAt: String(r.joined_at || new Date().toISOString().slice(0, 10)),
          passwordHash: String(r.password_hash || ''),
        })),
        payments: ((paymentsRes.data || []) as Record<string, unknown>[]).map((p) => ({
          id: String(p.id),
          memberDocId: String(p.member_doc_id || ''),
          memberId: String(p.member_id || ''),
          memberName: String(p.member_name || ''),
          paymentType: (p.payment_type as PaymentSubmission['paymentType']) || 'monthly_deposit',
          month: String(p.month || ''),
          amount: Number(p.amount || 0),
          method: (p.method as PaymentSubmission['method']) || 'bkash',
          senderAccount: String(p.sender_account || ''),
          transactionId: String(p.transaction_id || ''),
          note: String(p.note || ''),
          screenshotDataUrl: p.screenshot_data_url ? String(p.screenshot_data_url) : undefined,
          status: (p.status as PaymentSubmission['status']) || 'pending',
          rejectionReason: p.rejection_reason ? String(p.rejection_reason) : undefined,
          receiptNumber: p.receipt_number ? String(p.receipt_number) : undefined,
          verifiedBy: p.verified_by ? String(p.verified_by) : undefined,
          createdAt: String(p.created_at || new Date().toISOString()),
        })),
        fines: ((finesRes.data || []) as Record<string, unknown>[]).map((f) => ({
          id: String(f.id),
          memberDocId: String(f.member_doc_id || ''),
          memberId: String(f.member_id || ''),
          memberName: String(f.member_name || ''),
          reason: String(f.reason || ''),
          amount: Number(f.amount || 0),
          dueDate: String(f.due_date || ''),
          status: (f.status as FineRecord['status']) || 'unpaid',
          createdAt: String(f.created_at || new Date().toISOString()),
        })),
        ledger: ((ledgerRes.data || []) as Record<string, unknown>[]).map((l) => ({
          id: String(l.id),
          type: (l.type as LedgerEntry['type']) || 'income',
          category: String(l.category || ''),
          title: String(l.title || ''),
          amount: Number(l.amount || 0),
          date: String(l.date || ''),
          description: String(l.description || ''),
          recordedBy: String(l.recorded_by || ''),
          createdAt: String(l.created_at || new Date().toISOString()),
        })),
        investments: ((investmentsRes.data || []) as Record<string, unknown>[]).map((inv) => ({
          id: String(inv.id),
          titleEn: String(inv.title_en || ''),
          titleBn: String(inv.title_bn || ''),
          category: String(inv.category || ''),
          investedAmount: Number(inv.invested_amount || 0),
          expectedReturnRate: Number(inv.expected_return_rate || 0),
          actualReturnAmount: Number(inv.actual_return_amount || 0),
          startDate: String(inv.start_date || ''),
          maturityDate: String(inv.maturity_date || ''),
          descriptionEn: String(inv.description_en || ''),
          descriptionBn: String(inv.description_bn || ''),
          status: (inv.status as InvestmentProject['status']) || 'active',
          createdAt: String(inv.created_at || new Date().toISOString()),
        })),
        meetings: ((meetingsRes.data || []) as Record<string, unknown>[]).map((mt) => ({
          id: String(mt.id),
          titleEn: String(mt.title_en || ''),
          titleBn: String(mt.title_bn || ''),
          date: String(mt.date || ''),
          time: String(mt.time || ''),
          location: String(mt.location || ''),
          agendaEn: String(mt.agenda_en || ''),
          agendaBn: String(mt.agenda_bn || ''),
          minutesEn: String(mt.minutes_en || ''),
          minutesBn: String(mt.minutes_bn || ''),
          status: (mt.status as MeetingNotice['status']) || 'upcoming',
          createdAt: String(mt.created_at || new Date().toISOString()),
        })),
        polls: ((pollsRes.data || []) as Record<string, unknown>[]).map((pl) => ({
          id: String(pl.id),
          questionEn: String(pl.question_en || ''),
          questionBn: String(pl.question_bn || ''),
          deadline: String(pl.deadline || ''),
          status: (pl.status as VotePoll['status']) || 'open',
          options: Array.isArray(pl.options) ? (pl.options as VotePoll['options']) : [],
          votedMemberIds: Array.isArray(pl.voted_member_ids)
            ? (pl.voted_member_ids as string[])
            : [],
          createdAt: String(pl.created_at || new Date().toISOString()),
        })),
        settings: settingsRes.data
          ? {
              societyNameEn: String((settingsRes.data as Record<string, unknown>).society_name_en || local.settings.societyNameEn),
              societyNameBn: String((settingsRes.data as Record<string, unknown>).society_name_bn || local.settings.societyNameBn),
              monthlyDepositAmount: Number((settingsRes.data as Record<string, unknown>).monthly_deposit_amount || local.settings.monthlyDepositAmount),
              defaultLateFine: Number((settingsRes.data as Record<string, unknown>).default_late_fine || local.settings.defaultLateFine),
              graceDayOfMonth: Number((settingsRes.data as Record<string, unknown>).grace_day_of_month || local.settings.graceDayOfMonth),
              bkashNumber: String((settingsRes.data as Record<string, unknown>).bkash_number || local.settings.bkashNumber),
              bkashAccountType: String((settingsRes.data as Record<string, unknown>).bkash_account_type || local.settings.bkashAccountType),
              nagadNumber: String((settingsRes.data as Record<string, unknown>).nagad_number || local.settings.nagadNumber),
              nagadAccountType: String((settingsRes.data as Record<string, unknown>).nagad_account_type || local.settings.nagadAccountType),
              bankName: String((settingsRes.data as Record<string, unknown>).bank_name || local.settings.bankName),
              bankAccountName: String((settingsRes.data as Record<string, unknown>).bank_account_name || local.settings.bankAccountName),
              bankAccountNumber: String((settingsRes.data as Record<string, unknown>).bank_account_number || local.settings.bankAccountNumber),
              bankBranch: String((settingsRes.data as Record<string, unknown>).bank_branch || local.settings.bankBranch),
              bankRoutingNumber: String((settingsRes.data as Record<string, unknown>).bank_routing_number || local.settings.bankRoutingNumber),
            }
          : local.settings,
        nextMemberSeq: Math.max(
          local.nextMemberSeq,
          ...remoteMembers.map((r) => {
            const match = String(r.member_id || '').match(/(\d+)$/);
            return match ? Number(match[1]) + 1 : 1;
          }),
          remoteMembers.length + 1
        ),
      };
      const normalizedHydrated = normalizeLoadedDb(hydrated);
      writeLocalDb(normalizedHydrated);
      recordSyncedCounts(normalizedHydrated);
    } else if (local.members.length > 0 || local.payments.length > 0) {
      void performSupabaseSync(local);
    } else {
      recordSyncedCounts(local);
    }
  } catch (err) {
    console.warn('Supabase init fallback to local store:', err);
  } finally {
    lastHydratedAt = Date.now();
  }
}

export async function ensureDbReady(): Promise<void> {
  if (hasHydratedOnce && (!IS_SERVERLESS || Date.now() - lastHydratedAt < 15000)) {
    return;
  }
  if (!initPromise) {
    initPromise = initDbFromSupabase().finally(() => {
      hasHydratedOnce = true;
      initPromise = null;
    });
  }
  await initPromise;
}

export function loadDb(): SocietyDatabase {
  if (cachedDb) return cachedDb;
  try {
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
  } catch (err) {
    console.warn('Local DB load fallback to fresh memory store:', err);
    const initial = createInitialDb();
    cachedDb = initial;
    return initial;
  }
}

export function saveDb(db: SocietyDatabase): void {
  writeLocalDb(db);
  const snapshot = JSON.parse(JSON.stringify(db)) as SocietyDatabase;
  supabaseSyncChain = supabaseSyncChain
    .then(() => performSupabaseSync(snapshot))
    .catch(() => {});
}

export async function saveDbAsync(db: SocietyDatabase): Promise<void> {
  writeLocalDb(db);
  const snapshot = JSON.parse(JSON.stringify(db)) as SocietyDatabase;
  supabaseSyncChain = supabaseSyncChain
    .then(() => performSupabaseSync(snapshot))
    .catch(() => {});
  if (IS_SERVERLESS) {
    await supabaseSyncChain;
  }
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
