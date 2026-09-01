import type {
  LoanRecord,
  Exception,
  AIRecommendation,
  VerifiedRecord,
  AuditEvent,
  Summary,
  OperatorDashboard,
  ReviewerDashboard,
  ConsumerDashboard,
  ImportEvent,
  ExceptionStatus,
  ReviewerDecision,
  SourceSystem,
  User,
  Role,
  RegisterData,
} from '../types';

const BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('loan_copilot_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson.message) {
        errorMsg = Array.isArray(errJson.message) ? errJson.message.join(', ') : errJson.message;
      }
    } catch {}
    throw new Error(errorMsg);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  login: async (email: string, password?: string, role?: Role): Promise<User> => {
    const data = await request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, name: email, password, role }),
    });
    if (data.token) {
      localStorage.setItem('loan_copilot_token', data.token);
      data.user.token = data.token;
    }
    return data.user;
  },

  register: async (registerData: RegisterData): Promise<User> => {
    const data = await request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(registerData),
    });
    if (data.token) {
      localStorage.setItem('loan_copilot_token', data.token);
      data.user.token = data.token;
    }
    return data.user;
  },

  // Loans & Exceptions
  getLoans: () => request<LoanRecord[]>('/loans'),
  getLoan: (id: string) => request<LoanRecord>(`/loans/${id}`),
  getExceptions: (params?: { status?: string; severity?: string; search?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<Exception[]>(`/exceptions${query ? `?${query}` : ''}`);
  },
  getExceptionDetail: (id: string) => request<any>(`/exceptions/${id}`),
  getRecommendations: () => request<any[]>('/exceptions').then((exs) => exs.flatMap((e: any) => e.recommendations || [])),

  // Recommendations & Verification
  getVerifiedLoans: () => request<VerifiedRecord[]>('/verified-loans'),
  getVerifiedLoan: (id: string) => request<VerifiedRecord>(`/verified-loans/${id}`),
  exportVerifiedLoans: () => request<VerifiedRecord[]>('/verified-loans/export'),
  exportRecord: (loanId: string, _actor?: string) => request(`/verified-loans/export`),
  getAudit: (loanId: string) => request<AuditEvent[]>(`/audit/${loanId}`),

  // Dashboards & Summaries
  getSummary: () => request<Summary>('/summary'),
  getOperatorDashboard: () => request<OperatorDashboard>('/dashboard/operator'),
  getReviewerDashboard: () => request<ReviewerDashboard>('/dashboard/reviewer'),
  getConsumerDashboard: () => request<ConsumerDashboard>('/dashboard/consumer'),
  getImportEvents: () => request<OperatorDashboard>('/dashboard/operator').then((d) => d.recent_imports || []),

  // Actions
  postExceptionDecision: async (id: string, status: ExceptionStatus, actor: string, comment?: string) => {
    if (status === 'approved') {
      return request(`/exceptions/${id}/accept`, {
        method: 'POST',
        body: JSON.stringify({ comment }),
      });
    } else if (status === 'rejected') {
      return request(`/exceptions/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ comment }),
      });
    }
    return request(`/exceptions/${id}/comment`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
  },

  postAIAction: async (id: string, action: 'accept' | 'reject' | 'edit', edited?: string) => {
    if (action === 'accept') {
      return request(`/exceptions/${id}/accept`, { method: 'POST' });
    } else if (action === 'reject') {
      return request(`/exceptions/${id}/reject`, { method: 'POST' });
    } else {
      return request(`/exceptions/${id}/edit`, {
        method: 'POST',
        body: JSON.stringify({ field: 'interest_rate', value: edited }),
      });
    }
  },

  requestAIRec: async (loanId: string, exceptionId: string): Promise<AIRecommendation> => {
    return request<AIRecommendation>(`/exceptions/${exceptionId}/ai/explain`, {
      method: 'POST',
    });
  },

  requestAISuggestion: async (exceptionId: string): Promise<AIRecommendation> => {
    return request<AIRecommendation>(`/exceptions/${exceptionId}/ai/suggest-correction`, {
      method: 'POST',
    });
  },

  requestAIConflictResolution: async (exceptionId: string): Promise<AIRecommendation> => {
    return request<AIRecommendation>(`/exceptions/${exceptionId}/ai/resolve-conflict`, {
      method: 'POST',
    });
  },

  requestAIReviewerNotes: async (exceptionId: string): Promise<AIRecommendation> => {
    return request<AIRecommendation>(`/exceptions/${exceptionId}/ai/reviewer-notes`, {
      method: 'POST',
    });
  },

  requestAIRuleGeneration: async (prompt: string) => {
    return request('/ai/generate-rule', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  },

  approveAIRuleDraft: async (ruleId: string) => {
    return request(`/ai/rules/${ruleId}/approve`, { method: 'POST' });
  },

  rejectAIRuleDraft: async (ruleId: string) => {
    return request(`/ai/rules/${ruleId}/reject`, { method: 'POST' });
  },

  verifyRecord: async (
    loanId: string,
    actor: string,
    decision: Exclude<ReviewerDecision, null>,
    _aiRef?: string | null,
  ) => {
    await request(`/loans/${loanId}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    });
    return request<VerifiedRecord>(`/verified-loans/${loanId}`);
  },

  addComment: async (loanId: string, author: string, text: string) => {
    const exList = await request<Exception[]>('/exceptions');
    const targetEx = exList.find((e) => e.loan_id === loanId);
    if (targetEx) {
      return request(`/exceptions/${targetEx.id}/comment`, {
        method: 'POST',
        body: JSON.stringify({ comment: text }),
      });
    }
    return { ok: true };
  },

  importCsvTape: async (
    fileName: string,
    sourceSystem: SourceSystem,
    csvContent: string,
    actor: string,
  ): Promise<ImportEvent> => {
    const formData = new FormData();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    formData.append('file', blob, fileName);
    formData.append('type', sourceSystem.toLowerCase().includes('servicer') ? 'servicer_update' : 'loan_tape');

    const headers = getAuthHeader();
    const res = await fetch(`${BASE}/uploads`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Upload failed: ${res.statusText}`);
    }

    const uploadResult = await res.json();

    // Trigger validation
    await request('/validations/run', {
      method: 'POST',
      body: JSON.stringify({ source_file_id: uploadResult.id }),
    });

    return {
      id: uploadResult.id,
      file_name: fileName,
      source_system: sourceSystem,
      uploaded_at: uploadResult.uploaded_at || new Date().toISOString(),
      rows_imported: uploadResult.imported_count || uploadResult.row_count || 0,
      rows_failed: uploadResult.failed_count || 0,
      rows_flagged: 0,
      status: uploadResult.status === 'failed' ? 'failed' : 'parsed',
    };
  },

  runValidation: async (sourceFileId?: string) => {
    return request('/validations/run', {
      method: 'POST',
      body: JSON.stringify({ source_file_id: sourceFileId }),
    });
  },
};

export type ApiService = typeof api;
