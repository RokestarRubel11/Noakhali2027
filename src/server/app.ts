import express from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import {
  SOLE_ADMIN_EMAIL,
  deleteSupabaseRow,
  ensureDbReady,
  formatMemberCode,
  formatReceiptCode,
  getSupabaseSyncStatus,
  isSupabaseSchemaReady,
  loadDb,
  makeId,
  sanitizeAdmin,
  sanitizeMember,
  saveDbAsync,
} from './store.ts';
import { SUPABASE_PROJECT_ID, SUPABASE_URL } from './supabaseServer.ts';
import type {
  AdminOverviewResponse,
  FineRecord,
  InvestmentProject,
  LedgerEntry,
  MeetingNotice,
  MemberOverviewResponse,
  PaymentSubmission,
  VotePoll,
  WithdrawalRequest,
} from '../types.ts';

const TOKEN_SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(process.cwd() + ':hns-society-secret-key').digest('hex');

interface TokenPayload {
  sub: string;
  role: 'admin' | 'member';
  exp: number;
}

function signToken(sub: string, role: 'admin' | 'member'): string {
  const payload: TokenPayload = {
    sub,
    role,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): TokenPayload | null {
  try {
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;
    const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(encoded).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as TokenPayload;
    if (!parsed.exp || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function getBearerToken(req: express.Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: Administrator access required' });
    return;
  }
  const db = loadDb();
  const admin = db.admins.find(
    (a) => a.id === payload.sub && a.email.toLowerCase() === SOLE_ADMIN_EMAIL
  );
  if (!admin) {
    res.status(403).json({ error: 'Forbidden: Admin account not found' });
    return;
  }
  (req as express.Request & { adminId: string }).adminId = admin.id;
  next();
}

function requireMember(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'member') {
    res.status(403).json({ error: 'Forbidden: Member access required' });
    return;
  }
  const db = loadDb();
  const member = db.members.find((m) => m.id === payload.sub);
  if (!member) {
    res.status(403).json({ error: 'Forbidden: Member account not found' });
    return;
  }
  if (member.status === 'pending') {
    res.status(403).json({
      error:
        'আপনার আইডি এখনও অ্যাডমিনের অনুমোদনের অপেক্ষায় রয়েছে। অ্যাডমিন অনুমোদন দিলে প্রবেশ করতে পারবেন। (Your ID is awaiting Admin approval.)',
    });
    return;
  }
  if (member.status !== 'active') {
    res.status(403).json({ error: 'Account suspended. Please contact society administration.' });
    return;
  }
  (req as express.Request & { memberDocId: string }).memberDocId = member.id;
  next();
}

function buildAdminOverview(adminId: string): AdminOverviewResponse {
  const db = loadDb();
  const admin = db.admins.find((a) => a.id === adminId)!;
  const totalSavings = db.members.reduce((sum, m) => sum + Number(m.totalSavings || 0), 0);
  const approvedPayments = db.payments.filter((p) => p.status === 'approved');
  const pendingPayments = db.payments.filter((p) => p.status === 'pending');
  const currentMonth = new Date().toISOString().slice(0, 7);
  const thisMonthDeposits = approvedPayments
    .filter((p) => p.month === currentMonth && p.paymentType !== 'fine_payment')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalVerifiedDeposits = approvedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const pendingPaymentsAmount = pendingPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const approvedWithdrawals = db.withdrawals.filter((w) => w.status === 'approved');
  const pendingWithdrawals = db.withdrawals.filter((w) => w.status === 'pending');
  const approvedWithdrawalsAmount = approvedWithdrawals.reduce(
    (sum, w) => sum + Number(w.amount || 0),
    0
  );
  const activeInvestments = db.investments.filter((i) => i.status === 'active');
  const totalInvested = activeInvestments.reduce((sum, i) => sum + Number(i.investedAmount || 0), 0);
  const totalIncome = db.ledger
    .filter((l) => l.type === 'income')
    .reduce((sum, l) => sum + Number(l.amount || 0), 0);
  const totalExpense = db.ledger
    .filter((l) => l.type === 'expense')
    .reduce((sum, l) => sum + Number(l.amount || 0), 0);
  const unpaidFinesAmount = db.fines
    .filter((f) => f.status === 'unpaid')
    .reduce((sum, f) => sum + Number(f.amount || 0), 0);

  return {
    admin: sanitizeAdmin(admin),
    settings: db.settings,
    stats: {
      totalMembers: db.members.length,
      activeMembers: db.members.filter((m) => m.status === 'active').length,
      totalSavings,
      totalVerifiedDeposits,
      thisMonthDeposits,
      pendingPaymentsCount: pendingPayments.length,
      pendingPaymentsAmount,
      approvedWithdrawalsAmount,
      pendingWithdrawalsCount: pendingWithdrawals.length,
      totalInvested,
      activeInvestmentsCount: activeInvestments.length,
      totalIncome,
      totalExpense,
      unpaidFinesAmount,
    },
    members: db.members.map(sanitizeMember),
    payments: [...db.payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    withdrawals: [...db.withdrawals].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    fines: [...db.fines].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    ledger: [...db.ledger].sort((a, b) => b.date.localeCompare(a.date)),
    investments: [...db.investments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    meetings: [...db.meetings].sort((a, b) => b.date.localeCompare(a.date)),
    polls: [...db.polls].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    admins: db.admins.map(sanitizeAdmin),
  };
}

function buildMemberOverview(memberDocId: string): MemberOverviewResponse {
  const db = loadDb();
  const member = db.members.find((m) => m.id === memberDocId)!;
  return {
    member: sanitizeMember(member),
    settings: db.settings,
    payments: db.payments
      .filter((p) => p.memberDocId === memberDocId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    withdrawals: db.withdrawals
      .filter((w) => w.memberDocId === memberDocId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    fines: db.fines
      .filter((f) => f.memberDocId === memberDocId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    investments: [...db.investments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    meetings: [...db.meetings].sort((a, b) => b.date.localeCompare(a.date)),
    polls: [...db.polls].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    societyMembers: db.members.map((m) => ({
      id: m.id,
      memberId: m.memberId,
      name: m.name || m.email || m.memberId,
      avatarDataUrl: m.avatarDataUrl || '',
      monthlyTarget: m.monthlyTarget,
      totalSavings: m.totalSavings,
      status: m.status,
      joinedAt: m.joinedAt,
    })),
    societyPayments: [...db.payments]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((p) => ({
        id: p.id,
        memberDocId: p.memberDocId,
        paymentType: p.paymentType,
        month: p.month,
        amount: p.amount,
        status: p.status,
        createdAt: p.createdAt,
      })),
    societyFines: db.fines.map((f) => ({
      id: f.id,
      memberDocId: f.memberDocId,
      amount: f.amount,
      dueDate: f.dueDate,
      status: f.status,
    })),
  };
}

export function createApiApp(): express.Express {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.use('/api', async (req, _res, next) => {
    if (req.path === '/health') {
      next();
      return;
    }
    try {
      await ensureDbReady();
    } catch {
      // ignore and fall back to in-memory store
    }
    next();
  });

  app.get('/api/health', async (_req, res) => {
    await ensureDbReady().catch(() => {});
    const sync = getSupabaseSyncStatus();
    res.json({
      ok: true,
      supabaseProjectId: SUPABASE_PROJECT_ID,
      supabaseUrl: SUPABASE_URL,
      supabaseTablesReady: isSupabaseSchemaReady(),
      supabaseWriteReady: sync.writeReady,
      supabaseLastError: sync.lastError,
    });
  });

  // Public society branding/info (non-sensitive)
  app.get('/api/public/info', (_req, res) => {
    const db = loadDb();
    res.json({
      societyNameEn: db.settings.societyNameEn,
      societyNameBn: db.settings.societyNameBn,
      monthlyDepositAmount: db.settings.monthlyDepositAmount,
    });
  });

  // ---------------- AUTHENTICATION ----------------

  app.post('/api/auth/login', (req, res) => {
    const { identifier, password } = req.body ?? {};
    if (typeof identifier !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Gmail and password are required' });
      return;
    }

    const db = loadDb();
    const clean = identifier.trim().toLowerCase();

    if (clean === SOLE_ADMIN_EMAIL) {
      const admin = db.admins.find((a) => a.email.toLowerCase() === SOLE_ADMIN_EMAIL);
      const passOk =
        !!admin &&
        (bcrypt.compareSync(password, admin.passwordHash) ||
          bcrypt.compareSync(password.trim(), admin.passwordHash));
      if (!admin || !passOk) {
        res.status(401).json({ error: 'Invalid administrator credentials' });
        return;
      }
      const token = signToken(admin.id, 'admin');
      res.json({ role: 'admin', token, admin: sanitizeAdmin(admin) });
      return;
    }

    const member = db.members.find(
      (m) =>
        m.memberId.toLowerCase() === clean ||
        (m.email && m.email.toLowerCase() === clean) ||
        (m.phone && m.phone.toLowerCase() === clean)
    );

    if (!member) {
      res.status(401).json({
        error:
          'এই জিমেইল বা আইডিতে কোনো সদস্য অ্যাকাউন্ট পাওয়া যায়নি। প্রথমে Create ID থেকে আইডি তৈরি করুন। (No account found — please use Create ID first.)',
      });
      return;
    }

    const memberPassOk =
      bcrypt.compareSync(password, member.passwordHash) ||
      bcrypt.compareSync(password.trim(), member.passwordHash);
    if (!memberPassOk) {
      res.status(401).json({ error: 'Incorrect password for this account' });
      return;
    }
    if (member.status === 'pending') {
      res.status(403).json({
        error:
          'আপনার আইডি এখনও অ্যাডমিনের অনুমোদনের অপেক্ষায় রয়েছে। অ্যাডমিন অনুমোদন দিলে প্রবেশ করতে পারবেন। (Your ID is awaiting Admin approval.)',
      });
      return;
    }
    if (member.status === 'suspended') {
      res.status(403).json({ error: 'Member account is suspended. Contact an administrator.' });
      return;
    }
    const token = signToken(member.id, 'member');
    res.json({ role: 'member', token, member: sanitizeMember(member) });
  });

  app.post('/api/auth/admin/login', (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    const db = loadDb();
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedEmail !== SOLE_ADMIN_EMAIL) {
      const isMemberEmail = db.members.some((m) => m.email.toLowerCase() === normalizedEmail);
      if (isMemberEmail) {
        res.status(403).json({ error: 'Access denied: Members cannot sign into the Admin Panel.' });
        return;
      }
      res.status(401).json({ error: 'Invalid administrator credentials' });
      return;
    }

    const admin = db.admins.find((a) => a.email.toLowerCase() === SOLE_ADMIN_EMAIL);
    const passOk =
      !!admin &&
      (bcrypt.compareSync(password, admin.passwordHash) ||
        bcrypt.compareSync(password.trim(), admin.passwordHash));
    if (!admin || !passOk) {
      res.status(401).json({ error: 'Invalid administrator credentials' });
      return;
    }
    const token = signToken(admin.id, 'admin');
    res.json({ token, admin: sanitizeAdmin(admin) });
  });

  app.post('/api/auth/member/login', (req, res) => {
    const { identifier, password } = req.body ?? {};
    if (typeof identifier !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Gmail or Member ID and password are required' });
      return;
    }
    const db = loadDb();
    const clean = identifier.trim().toLowerCase();

    if (clean === SOLE_ADMIN_EMAIL || db.admins.some((a) => a.email.toLowerCase() === clean)) {
      res.status(403).json({ error: 'Administrators must sign in with administrator credentials.' });
      return;
    }

    const member = db.members.find(
      (m) =>
        m.memberId.toLowerCase() === clean ||
        (m.email && m.email.toLowerCase() === clean) ||
        (m.phone && m.phone.toLowerCase() === clean)
    );

    if (!member) {
      res.status(401).json({
        error:
          'এই জিমেইল বা আইডিতে কোনো সদস্য অ্যাকাউন্ট পাওয়া যায়নি। প্রথমে Create ID থেকে আইডি তৈরি করুন। (No account found — please use Create ID first.)',
      });
      return;
    }

    const memberPassOk =
      bcrypt.compareSync(password, member.passwordHash) ||
      bcrypt.compareSync(password.trim(), member.passwordHash);
    if (!memberPassOk) {
      res.status(401).json({ error: 'Incorrect password for this account' });
      return;
    }
    if (member.status === 'pending') {
      res.status(403).json({
        error:
          'আপনার আইডি এখনও অ্যাডমিনের অনুমোদনের অপেক্ষায় রয়েছে। অ্যাডমিন অনুমোদন দিলে প্রবেশ করতে পারবেন। (Your ID is awaiting Admin approval.)',
      });
      return;
    }
    if (member.status === 'suspended') {
      res.status(403).json({ error: 'Member account is suspended. Contact an administrator.' });
      return;
    }
    const token = signToken(member.id, 'member');
    res.json({ token, member: sanitizeMember(member) });
  });

  // Registration endpoint (Create ID -> awaits Admin approval)
  app.post('/api/auth/member/register', async (req, res) => {
    const {
      name,
      fatherName,
      motherName,
      dateOfBirth,
      email,
      phone,
      password,
      nid,
      occupation,
      address,
      permanentAddress,
      membershipType,
      monthlyTarget,
      nomineeName,
      nomineeRelation,
      avatarDataUrl,
      signatureText,
      acceptedRules,
    } = req.body ?? {};
    const hasEmail = typeof email === 'string' && email.trim().length > 0;
    const hasPhone = typeof phone === 'string' && phone.trim().length > 0;
    if ((!hasEmail && !hasPhone) || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Gmail or Mobile number and password (min 6 chars) are required' });
      return;
    }

    const db = loadDb();
    const normalizedEmail = hasEmail ? email.trim().toLowerCase() : '';
    const cleanPhone = hasPhone ? phone.trim() : '';

    if (
      normalizedEmail &&
      (db.members.some((m) => m.email.toLowerCase() === normalizedEmail) ||
        db.admins.some((a) => a.email.toLowerCase() === normalizedEmail))
    ) {
      res.status(409).json({ error: 'An account with this Gmail already exists. Please use Sign In.' });
      return;
    }
    if (cleanPhone && db.members.some((m) => m.phone === cleanPhone)) {
      res.status(409).json({ error: 'An account with this phone number already exists' });
      return;
    }

    const memberCode = formatMemberCode(db.nextMemberSeq);
    db.nextMemberSeq += 1;
    const now = new Date().toISOString();
    const hasFullDetails =
      typeof name === 'string' &&
      name.trim().length > 0 &&
      typeof nid === 'string' &&
      nid.trim().length > 0;

    const newMember = {
      id: makeId('mem'),
      memberId: memberCode,
      name:
        typeof name === 'string' && name.trim()
          ? name.trim()
          : (normalizedEmail ? normalizedEmail.split('@')[0] : cleanPhone) || memberCode,
      fatherName: typeof fatherName === 'string' ? fatherName.trim() : '',
      motherName: typeof motherName === 'string' ? motherName.trim() : '',
      dateOfBirth: typeof dateOfBirth === 'string' ? dateOfBirth.trim() : '',
      email: normalizedEmail,
      phone: cleanPhone,
      address: typeof address === 'string' ? address.trim() : '',
      permanentAddress: typeof permanentAddress === 'string' ? permanentAddress.trim() : '',
      occupation: typeof occupation === 'string' ? occupation.trim() : '',
      nid: typeof nid === 'string' ? nid.trim() : '',
      membershipType:
        membershipType === 'honorable' || membershipType === 'other'
          ? (membershipType as 'honorable' | 'other')
          : ('general' as const),
      nomineeName: typeof nomineeName === 'string' ? nomineeName.trim() : '',
      nomineeRelation: typeof nomineeRelation === 'string' ? nomineeRelation.trim() : '',
      avatarDataUrl:
        typeof avatarDataUrl === 'string' && avatarDataUrl.length < 10_000_000 ? avatarDataUrl : '',
      signatureText: typeof signatureText === 'string' ? signatureText.trim() : '',
      acceptedRules: Boolean(acceptedRules),
      registrationCompleted: hasFullDetails,
      registrationStatus: hasFullDetails ? ('pending' as const) : ('unsubmitted' as const),
      monthlyTarget:
        typeof monthlyTarget === 'number' && monthlyTarget > 0
          ? monthlyTarget
          : db.settings.monthlyDepositAmount,
      totalSavings: 0,
      status: 'pending' as const,
      role: 'member' as const,
      joinedAt: now.slice(0, 10),
      passwordHash: bcrypt.hashSync(password, 10),
    };
    db.members.push(newMember);
    await saveDbAsync(db);

    res.status(201).json({
      pendingApproval: true,
      member: sanitizeMember(newMember),
    });
  });

  // ---------------- ADMIN API ROUTES ----------------

  app.get('/api/admin/overview', requireAdmin, (req, res) => {
    const adminId = (req as express.Request & { adminId: string }).adminId;
    res.json(buildAdminOverview(adminId));
  });

  app.post('/api/admin/members', requireAdmin, async (req, res) => {
    const {
      name,
      email,
      phone,
      address,
      nid,
      nomineeName,
      nomineeRelation,
      monthlyTarget,
      password,
    } = req.body ?? {};
    if (
      typeof name !== 'string' ||
      !name.trim() ||
      typeof email !== 'string' ||
      !email.trim() ||
      typeof phone !== 'string' ||
      !phone.trim() ||
      typeof password !== 'string' ||
      password.length < 6
    ) {
      res.status(400).json({ error: 'Name, email, phone, and password (min 6 chars) are required' });
      return;
    }
    const db = loadDb();
    const normalizedEmail = email.trim().toLowerCase();
    if (
      db.members.some((m) => m.email.toLowerCase() === normalizedEmail) ||
      db.admins.some((a) => a.email.toLowerCase() === normalizedEmail)
    ) {
      res.status(409).json({ error: 'Email is already registered' });
      return;
    }

    const memberCode = formatMemberCode(db.nextMemberSeq);
    db.nextMemberSeq += 1;
    const newMember = {
      id: makeId('mem'),
      memberId: memberCode,
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      address: typeof address === 'string' ? address.trim() : '',
      nid: typeof nid === 'string' ? nid.trim() : '',
      nomineeName: typeof nomineeName === 'string' ? nomineeName.trim() : '',
      nomineeRelation: typeof nomineeRelation === 'string' ? nomineeRelation.trim() : '',
      permanentAddress: '',
      occupation: '',
      avatarDataUrl: '',
      registrationCompleted: true,
      registrationStatus: 'approved' as const,
      monthlyTarget:
        typeof monthlyTarget === 'number' && monthlyTarget > 0
          ? monthlyTarget
          : db.settings.monthlyDepositAmount,
      totalSavings: 0,
      status: 'active' as const,
      role: 'member' as const,
      joinedAt: new Date().toISOString().slice(0, 10),
      passwordHash: bcrypt.hashSync(password, 10),
    };
    db.members.push(newMember);
    await saveDbAsync(db);
    res.status(201).json({ member: sanitizeMember(newMember) });
  });

  app.patch('/api/admin/members/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const {
      name,
      phone,
      address,
      nid,
      nomineeName,
      nomineeRelation,
      monthlyTarget,
      status,
      registrationStatus,
      newPassword,
    } = req.body ?? {};
    const db = loadDb();
    const member = db.members.find((m) => m.id === id);
    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }
    if (typeof name === 'string' && name.trim()) member.name = name.trim();
    if (typeof phone === 'string' && phone.trim()) member.phone = phone.trim();
    if (typeof address === 'string') member.address = address.trim();
    if (typeof nid === 'string') member.nid = nid.trim();
    if (typeof nomineeName === 'string') member.nomineeName = nomineeName.trim();
    if (typeof nomineeRelation === 'string') member.nomineeRelation = nomineeRelation.trim();
    if (typeof monthlyTarget === 'number' && monthlyTarget > 0) member.monthlyTarget = monthlyTarget;
    if (status === 'active' || status === 'pending' || status === 'suspended') member.status = status;
    if (
      registrationStatus === 'unsubmitted' ||
      registrationStatus === 'pending' ||
      registrationStatus === 'approved' ||
      registrationStatus === 'rejected'
    ) {
      member.registrationStatus = registrationStatus;
      member.registrationCompleted = registrationStatus === 'approved' || registrationStatus === 'pending';
    }
    if (typeof newPassword === 'string' && newPassword.length >= 6) {
      member.passwordHash = bcrypt.hashSync(newPassword, 10);
    }
    await saveDbAsync(db);
    res.json({ member: sanitizeMember(member) });
  });

  app.post('/api/admin/payments/:id/verify', requireAdmin, async (req, res) => {
    const adminId = (req as express.Request & { adminId: string }).adminId;
    const { id } = req.params;
    const { action, rejectionReason } = req.body ?? {};
    if (action !== 'approve' && action !== 'reject') {
      res.status(400).json({ error: 'Action must be approve or reject' });
      return;
    }
    const db = loadDb();
    const payment = db.payments.find((p) => p.id === id);
    if (!payment) {
      res.status(404).json({ error: 'Payment record not found' });
      return;
    }
    if (payment.status !== 'pending') {
      res.status(400).json({ error: 'Payment has already been processed' });
      return;
    }
    const admin = db.admins.find((a) => a.id === adminId);
    const now = new Date().toISOString();

    if (action === 'approve') {
      payment.status = 'approved';
      payment.receiptNumber = formatReceiptCode(db.nextReceiptSeq);
      db.nextReceiptSeq += 1;
      payment.verifiedBy = admin?.name || 'Administrator';
      payment.verifiedAt = now;

      const member = db.members.find((m) => m.id === payment.memberDocId);
      if (member && payment.paymentType !== 'fine_payment') {
        member.totalSavings = Number(member.totalSavings || 0) + Number(payment.amount);
      }
      if (payment.paymentType === 'fine_payment') {
        const unpaidFine = db.fines.find(
          (f) => f.memberDocId === payment.memberDocId && f.status === 'unpaid'
        );
        if (unpaidFine) {
          unpaidFine.status = 'paid';
          unpaidFine.paidAt = now;
        }
      }

      const ledgerEntry: LedgerEntry = {
        id: makeId('ldg'),
        type: 'income',
        category: payment.paymentType === 'fine_payment' ? 'Fine Collection' : 'Member Deposit',
        title: `${payment.memberId} · ${payment.memberName} (${payment.month})`,
        amount: payment.amount,
        date: now.slice(0, 10),
        description: `Verified ${payment.method.toUpperCase()} TrxID ${payment.transactionId} · Receipt ${payment.receiptNumber}`,
        recordedBy: admin?.name || 'Administrator',
        createdAt: now,
      };
      db.ledger.push(ledgerEntry);
    } else {
      payment.status = 'rejected';
      payment.rejectionReason =
        typeof rejectionReason === 'string' && rejectionReason.trim()
          ? rejectionReason.trim()
          : 'Verification failed';
      payment.verifiedBy = admin?.name || 'Administrator';
      payment.verifiedAt = now;
    }

    await saveDbAsync(db);
    res.json({ payment });
  });

  app.post('/api/admin/withdrawals/:id/decide', requireAdmin, async (req, res) => {
    const adminId = (req as express.Request & { adminId: string }).adminId;
    const { id } = req.params;
    const { action, rejectionReason } = req.body ?? {};
    if (action !== 'approve' && action !== 'reject') {
      res.status(400).json({ error: 'Action must be approve or reject' });
      return;
    }

    const db = loadDb();
    const withdrawal = db.withdrawals.find((w) => w.id === id);
    if (!withdrawal) {
      res.status(404).json({ error: 'Withdrawal request not found' });
      return;
    }
    if (withdrawal.status !== 'pending') {
      res.status(400).json({ error: 'Withdrawal request has already been processed' });
      return;
    }

    const admin = db.admins.find((a) => a.id === adminId);
    const now = new Date().toISOString();

    if (action === 'approve') {
      const member = db.members.find((m) => m.id === withdrawal.memberDocId);
      if (member) {
        if (member.totalSavings < withdrawal.amount) {
          res.status(400).json({ error: 'Member savings balance is lower than withdrawal amount' });
          return;
        }
        member.totalSavings = Number(member.totalSavings || 0) - Number(withdrawal.amount || 0);
      }
      withdrawal.status = 'approved';
      withdrawal.approvedBy = admin?.name || 'Administrator';
      withdrawal.processedAt = now;

      db.ledger.push({
        id: makeId('ldg'),
        type: 'expense',
        category: 'Member Withdrawal',
        title: `Withdrawal · ${withdrawal.memberId} (${withdrawal.memberName})`,
        amount: withdrawal.amount,
        date: now.slice(0, 10),
        description: `Approved ${withdrawal.method.toUpperCase()} withdrawal (${withdrawal.accountDetails})`,
        recordedBy: admin?.name || 'Administrator',
        createdAt: now,
      });
    } else {
      withdrawal.status = 'rejected';
      withdrawal.rejectionReason =
        typeof rejectionReason === 'string' && rejectionReason.trim()
          ? rejectionReason.trim()
          : 'Not approved';
      withdrawal.approvedBy = admin?.name || 'Administrator';
      withdrawal.processedAt = now;
    }

    await saveDbAsync(db);
    res.json({ withdrawal });
  });

  app.post('/api/admin/fines', requireAdmin, async (req, res) => {
    const { memberDocId, reason, amount, dueDate } = req.body ?? {};
    const db = loadDb();
    const member = db.members.find((m) => m.id === memberDocId);
    if (!member) {
      res.status(404).json({ error: 'Selected member not found' });
      return;
    }
    if (typeof reason !== 'string' || !reason.trim() || typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ error: 'Valid reason and positive amount are required' });
      return;
    }
    const fine: FineRecord = {
      id: makeId('fin'),
      memberDocId: member.id,
      memberId: member.memberId,
      memberName: member.name,
      reason: reason.trim(),
      amount,
      dueDate: typeof dueDate === 'string' && dueDate ? dueDate : new Date().toISOString().slice(0, 10),
      status: 'unpaid',
      createdAt: new Date().toISOString(),
    };
    db.fines.push(fine);
    await saveDbAsync(db);
    res.status(201).json({ fine });
  });

  app.patch('/api/admin/fines/:id', requireAdmin, async (req, res) => {
    const adminId = (req as express.Request & { adminId: string }).adminId;
    const { id } = req.params;
    const { status } = req.body ?? {};
    if (status !== 'paid' && status !== 'waived' && status !== 'unpaid') {
      res.status(400).json({ error: 'Invalid fine status' });
      return;
    }
    const db = loadDb();
    const fine = db.fines.find((f) => f.id === id);
    if (!fine) {
      res.status(404).json({ error: 'Fine not found' });
      return;
    }
    const prev = fine.status;
    fine.status = status;
    if (status === 'paid' && prev !== 'paid') {
      const now = new Date().toISOString();
      fine.paidAt = now;
      const admin = db.admins.find((a) => a.id === adminId);
      db.ledger.push({
        id: makeId('ldg'),
        type: 'income',
        category: 'Fine Collection',
        title: `Fine Paid · ${fine.memberId} (${fine.memberName})`,
        amount: fine.amount,
        date: now.slice(0, 10),
        description: fine.reason,
        recordedBy: admin?.name || 'Administrator',
        createdAt: now,
      });
    }
    await saveDbAsync(db);
    res.json({ fine });
  });

  app.post('/api/admin/ledger', requireAdmin, async (req, res) => {
    const adminId = (req as express.Request & { adminId: string }).adminId;
    const { type, category, title, amount, date, description } = req.body ?? {};
    if (
      (type !== 'income' && type !== 'expense') ||
      typeof title !== 'string' ||
      !title.trim() ||
      typeof amount !== 'number' ||
      amount <= 0
    ) {
      res.status(400).json({ error: 'Valid type, title, and positive amount are required' });
      return;
    }
    const db = loadDb();
    const admin = db.admins.find((a) => a.id === adminId);
    const entry: LedgerEntry = {
      id: makeId('ldg'),
      type,
      category: typeof category === 'string' && category.trim() ? category.trim() : 'General',
      title: title.trim(),
      amount,
      date: typeof date === 'string' && date ? date : new Date().toISOString().slice(0, 10),
      description: typeof description === 'string' ? description.trim() : '',
      recordedBy: admin?.name || 'Administrator',
      createdAt: new Date().toISOString(),
    };
    db.ledger.push(entry);
    await saveDbAsync(db);
    res.status(201).json({ entry });
  });

  app.delete('/api/admin/ledger/:id', requireAdmin, async (req, res) => {
    const db = loadDb();
    const idx = db.ledger.findIndex((l) => l.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Ledger entry not found' });
      return;
    }
    const [removed] = db.ledger.splice(idx, 1);
    if (removed) deleteSupabaseRow('ledger', removed.id);
    await saveDbAsync(db);
    res.json({ ok: true });
  });

  app.post('/api/admin/investments', requireAdmin, async (req, res) => {
    const {
      titleEn,
      titleBn,
      category,
      investedAmount,
      expectedReturnRate,
      startDate,
      maturityDate,
      status,
      descriptionEn,
      descriptionBn,
    } = req.body ?? {};
    if (
      typeof titleEn !== 'string' ||
      !titleEn.trim() ||
      typeof investedAmount !== 'number' ||
      investedAmount <= 0
    ) {
      res.status(400).json({ error: 'Title and positive invested amount are required' });
      return;
    }
    const db = loadDb();
    const project: InvestmentProject = {
      id: makeId('inv'),
      titleEn: titleEn.trim(),
      titleBn: typeof titleBn === 'string' && titleBn.trim() ? titleBn.trim() : titleEn.trim(),
      category: typeof category === 'string' && category.trim() ? category.trim() : 'Business',
      investedAmount,
      expectedReturnRate: typeof expectedReturnRate === 'number' ? expectedReturnRate : 0,
      actualReturnAmount: 0,
      startDate: typeof startDate === 'string' && startDate ? startDate : new Date().toISOString().slice(0, 10),
      maturityDate: typeof maturityDate === 'string' ? maturityDate : '',
      status: status === 'completed' || status === 'planned' ? status : 'active',
      descriptionEn: typeof descriptionEn === 'string' ? descriptionEn.trim() : '',
      descriptionBn: typeof descriptionBn === 'string' ? descriptionBn.trim() : '',
      createdAt: new Date().toISOString(),
    };
    db.investments.push(project);
    await saveDbAsync(db);
    res.status(201).json({ investment: project });
  });

  app.patch('/api/admin/investments/:id', requireAdmin, async (req, res) => {
    const adminId = (req as express.Request & { adminId: string }).adminId;
    const { id } = req.params;
    const { status, actualReturnAmount } = req.body ?? {};
    const db = loadDb();
    const inv = db.investments.find((i) => i.id === id);
    if (!inv) {
      res.status(404).json({ error: 'Investment not found' });
      return;
    }
    if (status === 'active' || status === 'completed' || status === 'planned') {
      inv.status = status;
    }
    if (typeof actualReturnAmount === 'number' && actualReturnAmount >= 0) {
      const delta = actualReturnAmount - inv.actualReturnAmount;
      inv.actualReturnAmount = actualReturnAmount;
      if (delta > 0) {
        const admin = db.admins.find((a) => a.id === adminId);
        const now = new Date().toISOString();
        db.ledger.push({
          id: makeId('ldg'),
          type: 'income',
          category: 'Investment Return',
          title: `Profit · ${inv.titleEn}`,
          amount: delta,
          date: now.slice(0, 10),
          description: `Recorded return for investment ${inv.titleEn}`,
          recordedBy: admin?.name || 'Administrator',
          createdAt: now,
        });
      }
    }
    await saveDbAsync(db);
    res.json({ investment: inv });
  });

  app.post('/api/admin/meetings', requireAdmin, async (req, res) => {
    const { titleEn, titleBn, date, time, location, agendaEn, agendaBn, minutesEn, minutesBn, status } =
      req.body ?? {};
    if (typeof titleEn !== 'string' || !titleEn.trim() || typeof date !== 'string' || !date) {
      res.status(400).json({ error: 'Meeting title and date are required' });
      return;
    }
    const db = loadDb();
    const meeting: MeetingNotice = {
      id: makeId('mtg'),
      titleEn: titleEn.trim(),
      titleBn: typeof titleBn === 'string' && titleBn.trim() ? titleBn.trim() : titleEn.trim(),
      date,
      time: typeof time === 'string' ? time : '19:00',
      location: typeof location === 'string' ? location.trim() : 'Society Office / Online',
      agendaEn: typeof agendaEn === 'string' ? agendaEn.trim() : '',
      agendaBn: typeof agendaBn === 'string' ? agendaBn.trim() : '',
      minutesEn: typeof minutesEn === 'string' ? minutesEn.trim() : '',
      minutesBn: typeof minutesBn === 'string' ? minutesBn.trim() : '',
      status: status === 'completed' ? 'completed' : 'upcoming',
      createdAt: new Date().toISOString(),
    };
    db.meetings.push(meeting);
    await saveDbAsync(db);
    res.status(201).json({ meeting });
  });

  app.patch('/api/admin/meetings/:id', requireAdmin, async (req, res) => {
    const db = loadDb();
    const meeting = db.meetings.find((m) => m.id === req.params.id);
    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found' });
      return;
    }
    const { status, minutesEn, minutesBn } = req.body ?? {};
    if (status === 'upcoming' || status === 'completed') meeting.status = status;
    if (typeof minutesEn === 'string') meeting.minutesEn = minutesEn.trim();
    if (typeof minutesBn === 'string') meeting.minutesBn = minutesBn.trim();
    await saveDbAsync(db);
    res.json({ meeting });
  });

  app.post('/api/admin/polls', requireAdmin, async (req, res) => {
    const { questionEn, questionBn, options, deadline } = req.body ?? {};
    if (
      typeof questionEn !== 'string' ||
      !questionEn.trim() ||
      !Array.isArray(options) ||
      options.length < 2
    ) {
      res.status(400).json({ error: 'Poll question and at least 2 options are required' });
      return;
    }
    const db = loadDb();
    const poll: VotePoll = {
      id: makeId('pol'),
      questionEn: questionEn.trim(),
      questionBn:
        typeof questionBn === 'string' && questionBn.trim() ? questionBn.trim() : questionEn.trim(),
      options: options.map((o: { labelEn: string; labelBn?: string }, i: number) => ({
        id: `opt_${i + 1}`,
        labelEn: String(o.labelEn || '').trim(),
        labelBn: String(o.labelBn || o.labelEn || '').trim(),
        votes: 0,
      })),
      votedMemberIds: [],
      deadline: typeof deadline === 'string' && deadline ? deadline : new Date().toISOString().slice(0, 10),
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    db.polls.push(poll);
    await saveDbAsync(db);
    res.status(201).json({ poll });
  });

  app.patch('/api/admin/polls/:id', requireAdmin, async (req, res) => {
    const db = loadDb();
    const poll = db.polls.find((p) => p.id === req.params.id);
    if (!poll) {
      res.status(404).json({ error: 'Poll not found' });
      return;
    }
    const { status } = req.body ?? {};
    if (status === 'open' || status === 'closed') poll.status = status;
    await saveDbAsync(db);
    res.json({ poll });
  });

  app.put('/api/admin/settings', requireAdmin, async (req, res) => {
    const db = loadDb();
    const incoming = req.body ?? {};
    db.settings = {
      ...db.settings,
      societyNameEn:
        typeof incoming.societyNameEn === 'string' && incoming.societyNameEn.trim()
          ? incoming.societyNameEn.trim()
          : db.settings.societyNameEn,
      societyNameBn:
        typeof incoming.societyNameBn === 'string' && incoming.societyNameBn.trim()
          ? incoming.societyNameBn.trim()
          : db.settings.societyNameBn,
      monthlyDepositAmount:
        typeof incoming.monthlyDepositAmount === 'number' && incoming.monthlyDepositAmount > 0
          ? incoming.monthlyDepositAmount
          : db.settings.monthlyDepositAmount,
      defaultLateFine:
        typeof incoming.defaultLateFine === 'number' && incoming.defaultLateFine >= 0
          ? incoming.defaultLateFine
          : db.settings.defaultLateFine,
      graceDayOfMonth:
        typeof incoming.graceDayOfMonth === 'number' &&
        incoming.graceDayOfMonth >= 1 &&
        incoming.graceDayOfMonth <= 28
          ? incoming.graceDayOfMonth
          : db.settings.graceDayOfMonth,
      bkashNumber: typeof incoming.bkashNumber === 'string' ? incoming.bkashNumber.trim() : db.settings.bkashNumber,
      bkashAccountType:
        typeof incoming.bkashAccountType === 'string'
          ? incoming.bkashAccountType.trim()
          : db.settings.bkashAccountType,
      nagadNumber: typeof incoming.nagadNumber === 'string' ? incoming.nagadNumber.trim() : db.settings.nagadNumber,
      nagadAccountType:
        typeof incoming.nagadAccountType === 'string'
          ? incoming.nagadAccountType.trim()
          : db.settings.nagadAccountType,
      bankName: typeof incoming.bankName === 'string' ? incoming.bankName.trim() : db.settings.bankName,
      bankAccountName:
        typeof incoming.bankAccountName === 'string'
          ? incoming.bankAccountName.trim()
          : db.settings.bankAccountName,
      bankAccountNumber:
        typeof incoming.bankAccountNumber === 'string'
          ? incoming.bankAccountNumber.trim()
          : db.settings.bankAccountNumber,
      bankBranch: typeof incoming.bankBranch === 'string' ? incoming.bankBranch.trim() : db.settings.bankBranch,
      bankRoutingNumber:
        typeof incoming.bankRoutingNumber === 'string'
          ? incoming.bankRoutingNumber.trim()
          : db.settings.bankRoutingNumber,
    };
    await saveDbAsync(db);
    res.json({ settings: db.settings });
  });

  app.post('/api/admin/admins', requireAdmin, (_req, res) => {
    res.status(403).json({ error: 'Admin panel access is locked to the sole authorized administrator.' });
  });

  app.post('/api/admin/change-password', requireAdmin, (_req, res) => {
    res.status(403).json({ error: 'Main administrator credentials are locked and cannot be altered.' });
  });

  // ---------------- MEMBER API ROUTES ----------------

  app.get('/api/member/overview', requireMember, (req, res) => {
    const memberDocId = (req as express.Request & { memberDocId: string }).memberDocId;
    res.json(buildMemberOverview(memberDocId));
  });

  app.post('/api/member/complete-registration', requireMember, async (req, res) => {
    const memberDocId = (req as express.Request & { memberDocId: string }).memberDocId;
    const {
      name,
      fatherName,
      motherName,
      dateOfBirth,
      email,
      phone,
      address,
      permanentAddress,
      occupation,
      nid,
      membershipType,
      nomineeName,
      nomineeRelation,
      monthlyTarget,
      avatarDataUrl,
      signatureText,
      acceptedRules,
    } = req.body ?? {};
    if (
      typeof name !== 'string' ||
      !name.trim() ||
      typeof phone !== 'string' ||
      !phone.trim() ||
      typeof address !== 'string' ||
      !address.trim() ||
      typeof nid !== 'string' ||
      !nid.trim() ||
      typeof nomineeName !== 'string' ||
      !nomineeName.trim()
    ) {
      res.status(400).json({
        error: 'Full name, phone, present address, NID, and nominee name are required',
      });
      return;
    }
    const db = loadDb();
    const member = db.members.find((m) => m.id === memberDocId);
    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }
    member.name = name.trim();
    member.fatherName = typeof fatherName === 'string' ? fatherName.trim() : member.fatherName || '';
    member.motherName = typeof motherName === 'string' ? motherName.trim() : member.motherName || '';
    member.dateOfBirth = typeof dateOfBirth === 'string' ? dateOfBirth.trim() : member.dateOfBirth || '';
    if (typeof email === 'string' && email.trim()) member.email = email.trim().toLowerCase();
    member.phone = phone.trim();
    member.address = address.trim();
    member.permanentAddress = typeof permanentAddress === 'string' ? permanentAddress.trim() : '';
    member.occupation = typeof occupation === 'string' ? occupation.trim() : '';
    member.nid = nid.trim();
    if (membershipType === 'general' || membershipType === 'honorable' || membershipType === 'other') {
      member.membershipType = membershipType;
    }
    member.nomineeName = nomineeName.trim();
    member.nomineeRelation = typeof nomineeRelation === 'string' ? nomineeRelation.trim() : '';
    if (typeof monthlyTarget === 'number' && monthlyTarget > 0) {
      member.monthlyTarget = monthlyTarget;
    }
    if (typeof avatarDataUrl === 'string' && avatarDataUrl.length < 10_000_000) {
      member.avatarDataUrl = avatarDataUrl;
    }
    if (typeof signatureText === 'string') {
      member.signatureText = signatureText.trim();
    }
    if (typeof acceptedRules === 'boolean') {
      member.acceptedRules = acceptedRules;
    }
    member.registrationCompleted = true;
    member.registrationStatus = 'pending';
    await saveDbAsync(db);
    res.json({ member: sanitizeMember(member) });
  });

  app.post('/api/member/withdrawals', requireMember, async (req, res) => {
    const memberDocId = (req as express.Request & { memberDocId: string }).memberDocId;
    const { amount, method, accountDetails, reason } = req.body ?? {};
    if (
      typeof amount !== 'number' ||
      amount <= 0 ||
      (method !== 'bkash' && method !== 'nagad' && method !== 'bank') ||
      typeof accountDetails !== 'string' ||
      !accountDetails.trim()
    ) {
      res.status(400).json({ error: 'Valid amount, method, and account details are required' });
      return;
    }

    const db = loadDb();
    const member = db.members.find((m) => m.id === memberDocId);
    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }
    if (amount > member.totalSavings) {
      res.status(400).json({ error: 'Requested amount exceeds current savings balance' });
      return;
    }

    const withdrawal: WithdrawalRequest = {
      id: makeId('wdr'),
      memberDocId: member.id,
      memberId: member.memberId,
      memberName: member.name || member.phone || member.email,
      amount,
      method,
      accountDetails: accountDetails.trim(),
      reason: typeof reason === 'string' ? reason.trim() : '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    db.withdrawals.push(withdrawal);
    await saveDbAsync(db);
    res.status(201).json({ withdrawal });
  });

  app.post('/api/member/payments', requireMember, async (req, res) => {
    const memberDocId = (req as express.Request & { memberDocId: string }).memberDocId;
    const {
      paymentType,
      month,
      amount,
      method,
      senderAccount,
      transactionId,
      note,
      screenshotDataUrl,
    } = req.body ?? {};
    if (
      (paymentType !== 'monthly_deposit' && paymentType !== 'fine_payment' && paymentType !== 'extra_savings') ||
      typeof month !== 'string' ||
      !month.trim() ||
      typeof amount !== 'number' ||
      amount <= 0 ||
      (method !== 'bkash' && method !== 'nagad' && method !== 'bank') ||
      typeof senderAccount !== 'string' ||
      !senderAccount.trim() ||
      typeof transactionId !== 'string' ||
      !transactionId.trim()
    ) {
      res.status(400).json({ error: 'All payment fields including valid amount and Transaction ID are required' });
      return;
    }

    const db = loadDb();
    const member = db.members.find((m) => m.id === memberDocId);
    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    const submission: PaymentSubmission = {
      id: makeId('pay'),
      memberDocId: member.id,
      memberId: member.memberId,
      memberName: member.name || member.phone || member.email,
      paymentType,
      month: month.trim(),
      amount,
      method,
      senderAccount: senderAccount.trim(),
      transactionId: transactionId.trim(),
      note: typeof note === 'string' ? note.trim() : '',
      screenshotDataUrl:
        typeof screenshotDataUrl === 'string' && screenshotDataUrl.length < 1_500_000
          ? screenshotDataUrl
          : undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    db.payments.push(submission);
    await saveDbAsync(db);
    res.status(201).json({ payment: submission });
  });

  app.post('/api/member/polls/:id/vote', requireMember, async (req, res) => {
    const memberDocId = (req as express.Request & { memberDocId: string }).memberDocId;
    const { optionId } = req.body ?? {};
    const db = loadDb();
    const poll = db.polls.find((p) => p.id === req.params.id);
    if (!poll) {
      res.status(404).json({ error: 'Poll not found' });
      return;
    }
    if (poll.status !== 'open') {
      res.status(400).json({ error: 'Voting on this poll is closed' });
      return;
    }
    if (poll.votedMemberIds.includes(memberDocId)) {
      res.status(409).json({ error: 'You have already voted on this poll' });
      return;
    }
    const opt = poll.options.find((o) => o.id === optionId);
    if (!opt) {
      res.status(400).json({ error: 'Invalid poll option' });
      return;
    }
    opt.votes += 1;
    poll.votedMemberIds.push(memberDocId);
    await saveDbAsync(db);
    res.json({ poll });
  });

  app.patch('/api/member/profile', requireMember, async (req, res) => {
    const memberDocId = (req as express.Request & { memberDocId: string }).memberDocId;
    const {
      name,
      fatherName,
      motherName,
      dateOfBirth,
      nid,
      phone,
      address,
      permanentAddress,
      occupation,
      membershipType,
      monthlyTarget,
      nomineeName,
      nomineeRelation,
      avatarDataUrl,
      signatureText,
      acceptedRules,
      currentPassword,
      newPassword,
    } = req.body ?? {};
    const db = loadDb();
    const member = db.members.find((m) => m.id === memberDocId);
    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }
    if (typeof name === 'string' && name.trim()) member.name = name.trim();
    if (typeof fatherName === 'string') member.fatherName = fatherName.trim();
    if (typeof motherName === 'string') member.motherName = motherName.trim();
    if (typeof dateOfBirth === 'string') member.dateOfBirth = dateOfBirth.trim();
    if (typeof nid === 'string') member.nid = nid.trim();
    if (typeof phone === 'string') member.phone = phone.trim();
    if (typeof address === 'string') member.address = address.trim();
    if (typeof permanentAddress === 'string') member.permanentAddress = permanentAddress.trim();
    if (typeof occupation === 'string') member.occupation = occupation.trim();
    if (membershipType === 'general' || membershipType === 'honorable' || membershipType === 'other') {
      member.membershipType = membershipType;
    }
    if (typeof monthlyTarget === 'number' && monthlyTarget > 0) member.monthlyTarget = monthlyTarget;
    if (typeof nomineeName === 'string') member.nomineeName = nomineeName.trim();
    if (typeof nomineeRelation === 'string') member.nomineeRelation = nomineeRelation.trim();
    if (typeof signatureText === 'string') member.signatureText = signatureText.trim();
    if (typeof acceptedRules === 'boolean') member.acceptedRules = acceptedRules;
    if (typeof avatarDataUrl === 'string' && avatarDataUrl.length < 10_000_000) {
      member.avatarDataUrl = avatarDataUrl;
    }
    if (typeof newPassword === 'string' && newPassword.length >= 6) {
      if (typeof currentPassword !== 'string' || !bcrypt.compareSync(currentPassword, member.passwordHash)) {
        res.status(401).json({ error: 'Current password is incorrect' });
        return;
      }
      member.passwordHash = bcrypt.hashSync(newPassword, 10);
    }
    await saveDbAsync(db);
    res.json({ member: sanitizeMember(member) });
  });

  return app;
}
