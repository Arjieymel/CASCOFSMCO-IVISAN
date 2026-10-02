import AxiosInstance from "./AxiosInstance";
import type {
  ApplyLoanPayload,
  ApproveLoanPayload,
  GetLoanResponse,
  GetLoansResponse,
  GetRepaymentsResponse,
  LoanEligibility,
  MemberLoan,
  LoanRepayment,
  RecordRepaymentPayload,
  ReleaseLoanPayload,
} from "../Interfaces";
import type { AxiosResponse } from "axios";

// ---------------------------------------------------------------------------
// LoanService — wraps all /api/loans endpoints from LoanController.php
// Uses the existing shared AxiosInstance (auth token + cache-busting included)
// ---------------------------------------------------------------------------

const LoanService = {
  // =========================================================================
  // 1. CHECK MEMBER LOAN ELIGIBILITY
  //    GET /loans/eligibility/{memberId}
  // =========================================================================
  getEligibility: (
    memberId: number | string
  ): Promise<AxiosResponse<LoanEligibility>> =>
    AxiosInstance.get(`/loans/eligibility/${memberId}`),

  // =========================================================================
  // 2. LIST ALL LOANS (paginated + filters)
  //    GET /loans
  //    Returns { loans: PaginatedLoans, totals: LoanTotals }
  // =========================================================================
  getLoans: (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
    member_id?: number | string;
    start_date?: string;
    end_date?: string;
    sort_by?: string;
    order?: "asc" | "desc";
  }): Promise<AxiosResponse<GetLoansResponse>> => {
    const {
      page = 1,
      per_page = 10,
      search = "",
      status = "",
      member_id = "",
      start_date = "",
      end_date = "",
      sort_by = "application_date",
      order = "desc",
    } = params ?? {};

    let url = `/loans?page=${page}&per_page=${per_page}&sort_by=${sort_by}&order=${order}`;
    if (search)     url += `&search=${encodeURIComponent(search)}`;
    if (status)     url += `&status=${encodeURIComponent(status)}`;
    if (member_id)  url += `&member_id=${encodeURIComponent(member_id)}`;
    if (start_date) url += `&start_date=${encodeURIComponent(start_date)}`;
    if (end_date)   url += `&end_date=${encodeURIComponent(end_date)}`;

    return AxiosInstance.get(url);
  },

  // =========================================================================
  // 3. GET SINGLE LOAN (with repayments + live eligibility)
  //    GET /loans/{id}
  // =========================================================================
  getLoan: (
    id: number | string
  ): Promise<AxiosResponse<GetLoanResponse>> =>
    AxiosInstance.get(`/loans/${id}`),

  // =========================================================================
  // 4. SUBMIT LOAN APPLICATION
  //    POST /loans
  // =========================================================================
  applyLoan: (
    data: ApplyLoanPayload
  ): Promise<AxiosResponse<{ message: string; loan: MemberLoan }>> =>
    AxiosInstance.post("/loans", data),

  // =========================================================================
  // 5. APPROVE LOAN
  //    POST /loans/{id}/approve
  // =========================================================================
  approveLoan: (
    id: number | string,
    data: ApproveLoanPayload
  ): Promise<AxiosResponse<{ message: string; loan: MemberLoan }>> =>
    AxiosInstance.post(`/loans/${id}/approve`, data),

  // =========================================================================
  // 6. REJECT LOAN
  //    POST /loans/{id}/reject
  // =========================================================================
  rejectLoan: (
    id: number | string,
    data: { remarks?: string }
  ): Promise<AxiosResponse<{ message: string; loan: MemberLoan }>> =>
    AxiosInstance.post(`/loans/${id}/reject`, data),

  // =========================================================================
  // 7. RELEASE LOAN (disburse funds)
  //    POST /loans/{id}/release
  //    Also creates entry in Cash Disbursement Journal
  // =========================================================================
  releaseLoan: (
    id: number | string,
    data: ReleaseLoanPayload
  ): Promise<AxiosResponse<{ message: string; loan: MemberLoan; disbursement: unknown }>> =>
    AxiosInstance.post(`/loans/${id}/release`, data),

  // =========================================================================
  // 8. CANCEL LOAN
  //    POST /loans/{id}/cancel
  // =========================================================================
  cancelLoan: (
    id: number | string,
    data: { remarks?: string }
  ): Promise<AxiosResponse<{ message: string; loan: MemberLoan }>> =>
    AxiosInstance.post(`/loans/${id}/cancel`, data),

  // =========================================================================
  // 9. LIST REPAYMENTS FOR A LOAN (paginated)
  //    GET /loans/{id}/repayments
  // =========================================================================
  getRepayments: (
    id: number | string,
    page: number = 1,
    perPage: number = 25
  ): Promise<AxiosResponse<GetRepaymentsResponse>> =>
    AxiosInstance.get(`/loans/${id}/repayments?page=${page}&per_page=${perPage}`),

  // =========================================================================
  // 10. RECORD A REPAYMENT
  //     POST /loans/{id}/repayments
  //     Also creates entry in Cash Receipts Journal
  // =========================================================================
  recordRepayment: (
    id: number | string,
    data: RecordRepaymentPayload
  ): Promise<AxiosResponse<{ message: string; repayment: LoanRepayment; loan: MemberLoan }>> =>
    AxiosInstance.post(`/loans/${id}/repayments`, data),

  // =========================================================================
  // HELPER: GET ALL LOANS FOR A SPECIFIC MEMBER
  //    Wraps getLoans with member_id filter — used for member loan history tab
  // =========================================================================
  getMemberLoanHistory: (
    memberId: number | string,
    page: number = 1,
    perPage: number = 10
  ): Promise<AxiosResponse<GetLoansResponse>> =>
    LoanService.getLoans({ member_id: memberId, page, per_page: perPage, order: "desc" }),
};

export default LoanService;
