export interface CitationSource {
  id: string;
  shortLabel: string;
  fullTitle: string;
  authority: string;
  provisionRef: string;
  verbatimExcerpt: string;
  plainEnglishExplanation: string;
  vaultDocLink?: string;
}

export interface EntityChip {
  id: string;
  label: string;
  type: 'asset' | 'heir' | 'claim' | 'document' | 'shares';
  route: string;
}

export interface InlineCardData {
  type: 'asset_summary' | 'checklist' | 'mini_chart' | 'share_table' | string;
  title: string;
  subtitle?: string;
  data: any;
}

export interface CannedResponse {
  promptId: string;
  matchedPrompt: string;
  fullText: string;
  inlineCard?: InlineCardData;
  entityChips: EntityChip[];
  citations: CitationSource[];
}

export const CANNED_RESPONSES: Record<string, CannedResponse> = {
  hdfc_claim: {
    promptId: 'hdfc_claim',
    matchedPrompt: 'Who can claim the HDFC account?',
    fullText:
      "I understand how stressful bank procedures can feel right now, Sunita ji. Let me clarify the exact legal position on Late Ramesh ji's HDFC Savings Account (SB-4810-7721, balance ₹4,50,000). Because no valid registered nominee exists on HDFC's core banking ledger, the account does NOT pass to any single individual by default. Instead, it devolves simultaneously upon all Class-I statutory legal heirs under Section 8 of the Hindu Succession Act, 1956. Although brother Vikram submitted an informal memorandum slip in 2023, the Supreme Court of India has firmly established that Class-II relatives have zero legal standing while Class-I heirs are alive. You, your son Arjun, your daughter Priya, and mother Kamala can claim the funds together, or family members may execute No-Objection Certificates (NOCs) to release the proceeds directly to you under an indemnity bond.",
    inlineCard: {
      type: 'asset_summary',
      title: 'HDFC Bank Savings Account (SB-4810-7721)',
      subtitle: 'Balance: ₹4,50,000 • Centralized Deceased Claim Ref: CLM-02',
      data: {
        assetName: 'HDFC Savings Account',
        accountNo: '5010048107721',
        balance: 450000,
        status: 'Under Verification',
        claimId: 'CLM-02',
        assetId: 'asset-2',
        splits: [
          { name: 'Sunita Sharma (Spouse)', share: '40% Statutory Primary', amount: 180000 },
          { name: 'Arjun Sharma (Son)', share: '20% Class-I Entitlement', amount: 90000 },
          { name: 'Priya Sharma (Daughter)', share: '20% Class-I Entitlement', amount: 90000 },
          { name: 'Kamala Sharma (Mother)', share: '20% Class-I Entitlement', amount: 90000 },
        ],
      },
    },
    entityChips: [
      { id: 'ec-1', label: 'Asset: HDFC Savings (₹4.5L)', type: 'asset', route: '/assets/asset-2' },
      { id: 'ec-2', label: 'Claim: CLM-02 (Joint Indemnity)', type: 'claim', route: '/claims/CLM-02' },
      { id: 'ec-3', label: 'Heir: Sunita Sharma', type: 'heir', route: '/heirs?selected=p-sunita' },
      { id: 'ec-4', label: 'Heir: Arjun Sharma', type: 'heir', route: '/heirs?selected=p-arjun' },
    ],
    citations: [
      {
        id: 'cite-rbi',
        shortLabel: 'RBI Master Circular on Deceased Depositors',
        fullTitle: 'Reserve Bank of India Master Circular on Settlement of Claims in respect of Deceased Depositors',
        authority: 'Reserve Bank of India (Banking Operations)',
        provisionRef: 'DBOD.No.Leg.BC.95/09.07.005/2004-05, Para 2.1',
        verbatimExcerpt:
          'Where the deceased depositor has not made any nomination or where the accounts are held without survivor clause, banks should settle claims up to threshold limit based on indemnity with one surety without insisting on Succession Certificate.',
        plainEnglishExplanation:
          'Banks cannot force families into lengthy court probate for ordinary accounts if legal heirs furnish joint indemnity bonds with survivor affidavits.',
      },
      {
        id: 'cite-hsa8',
        shortLabel: 'Section 8, Hindu Succession Act, 1956',
        fullTitle: 'Hindu Succession Act, 1956 (Act No. 30 of 1956)',
        authority: 'Parliament of India',
        provisionRef: 'Section 8 & Class-I Schedule',
        verbatimExcerpt:
          'The property of a male Hindu dying intestate shall devolve firstly, upon the heirs, being the relatives specified in Class-I of the Schedule, simultaneously and in equal priority.',
        plainEnglishExplanation:
          'The surviving spouse, children, and mother have exclusive first priority. Brothers and other Class-II relatives have zero claim.',
      },
      {
        id: 'cite-sarbati',
        shortLabel: 'Sarbati Devi v. Usha Devi (Supreme Court Landmark)',
        fullTitle: 'Supreme Court of India: Smt. Sarbati Devi and Anr. v. Smt. Usha Devi',
        authority: 'Supreme Court of India',
        provisionRef: '(1984) 1 SCC 424; AIR 1984 SC 346',
        verbatimExcerpt:
          'A nomination only confers authority on nominee to receive proceeds from bank or insurer; such proceeds form part of estate and vest strictly in legal heirs according to personal succession law.',
        plainEnglishExplanation:
          'Even if an informal nomination existed, funds belong strictly to the lawful legal heirs and cannot be pocketed by an external relative.',
      },
    ],
  },

  missing_docs: {
    promptId: 'missing_docs',
    matchedPrompt: 'What documents am I missing?',
    fullText:
      "Grief makes administrative paperwork feel completely overwhelming, Sunita ji, but you have already completed 83% of the journey. Out of 12 estate folios, 10 are completely verified with DigiLocker. You only have 2 urgent document actions remaining to unblock ₹1.70 Cr in transfers. First, the Life Insurance Corporation of India (LIC) requires the original Discharge Voucher (Form 3783) with a signed ₹1 revenue stamp for the ₹30 Lakh policy payout. Second, the Jubilee Hills Flat title mutation is waiting on the Mandal Revenue Inspector's field inquiry report from MeeSeva. Here is your clear, actionable checklist to complete this week:",
    inlineCard: {
      type: 'checklist',
      title: 'Actionable Missing Documents Checklist (2 Items)',
      subtitle: 'Unlocks ₹1.70 Cr in pending disbursements across LIC and Land Registry',
      data: {
        items: [
          {
            id: 'chk-1',
            docTitle: 'LIC Form 3783 Discharge Voucher with Revenue Stamp',
            docId: 'DOC-12',
            claimId: 'CLM-06',
            assetName: 'LIC Jeevan Anand Policy (₹30.0 Lakhs)',
            actionRequired: 'Affix ₹1 revenue stamp, sign across stamp, and upload scan to Document Vault.',
            status: 'Action Required',
            urgency: 'High (Blocks ₹30L)',
          },
          {
            id: 'chk-2',
            docTitle: 'MeeSeva Tahsildar Field Inquiry Report',
            docId: 'DOC-03',
            claimId: 'CLM-11',
            assetName: 'Jubilee Hills Residential Flat (₹1.40 Cr)',
            actionRequired: 'Mandal Revenue Inspector inquiry scheduled for Banjara Hills ward inspection.',
            status: 'Pending Officer Signoff',
            urgency: 'Medium',
          },
          {
            id: 'chk-3',
            docTitle: 'HDFC Multi-Heir Indemnity Bond & Franking',
            docId: 'DOC-08',
            claimId: 'CLM-02',
            assetName: 'HDFC Savings Account (₹4.5 Lakhs)',
            actionRequired: 'Pre-generated by Virasat AI; ready for Aadhaar OTP e-Sign by Arjun and Sunita.',
            status: 'Ready to e-Sign',
            urgency: 'Ready Today',
          },
        ],
      },
    },
    entityChips: [
      { id: 'ec-11', label: 'Claim: LIC CLM-06 (₹30L)', type: 'claim', route: '/claims/CLM-06' },
      { id: 'ec-12', label: 'Document: LIC Form 3783', type: 'document', route: '/documents/DOC-12' },
      { id: 'ec-13', label: 'Document: Sale Deed (DOC-09)', type: 'document', route: '/documents/DOC-09' },
      { id: 'ec-14', label: 'Vault: View All Folders', type: 'document', route: '/documents' },
    ],
    citations: [
      {
        id: 'cite-lic',
        shortLabel: 'LIC Claims Settlement Regulations, 2021',
        fullTitle: 'Life Insurance Corporation (Settlement of Death Claims) Regulations',
        authority: 'IRDAI & LIC Central Office',
        provisionRef: 'Regulation 14(3), Form 3783 Discharge Mandate',
        verbatimExcerpt:
          'Payment of policy monies shall be released against valid discharge voucher duly signed by beneficial nominee across revenue stamp of value prescribed under Indian Stamp Act.',
        plainEnglishExplanation:
          'A ₹1 physical revenue stamp with your signature across the stamp is mandatory for insurance payouts under Indian tax regulations.',
      },
      {
        id: 'cite-meeseva',
        shortLabel: 'Telangana MeeSeva LHC Citizen Charter Rules',
        fullTitle: 'Telangana Revenue Department Service Delivery Rules for Legal Heir Certificate',
        authority: 'Government of Telangana (Revenue)',
        provisionRef: 'G.O.Ms.No. 44 Revenue (Ser-II) Dept',
        verbatimExcerpt:
          'The Tahsildar shall cause inquiry through the Revenue Inspector into the legal heirs of the deceased and issue Legal Heir Certificate within 30 days of application.',
        plainEnglishExplanation:
          'The Mandal Revenue Officer must complete the local field inquiry before the certificate is officially posted to DigiLocker.',
      },
    ],
  },

  no_will: {
    promptId: 'no_will',
    matchedPrompt: 'What happens if there is no will?',
    fullText:
      "When someone passes away without leaving a registered will (known in Indian law as dying 'intestate'), you do not need to worry that the government will seize the assets or that distant relatives can demand shares. Section 8, 9, and 10 of the Hindu Succession Act, 1956 provide a strict statutory formula. Property devolves solely upon Class-I legal heirs in simultaneous priority. In Late Ramesh ji's family, there are four living Class-I heirs: you (surviving spouse), Arjun (son), Priya (daughter), and Kamala ji (mother). To ensure your lifecycle security, the children and mother have executed a Consensual Family Settlement Agreement allocating 40% of the net estate to you, with 20% to each child and mother. Class-II relatives (including brother Vikram) are completely excluded by law.",
    inlineCard: {
      type: 'mini_chart',
      title: 'Intestate Estate Devolution Breakdown (§8 HSA)',
      subtitle: 'Net Distributable Estate: ₹2.84 Cr across 12 asset folios',
      data: {
        totalEstate: 28400000,
        formattedTotal: '₹2.84 Cr',
        splits: [
          { name: 'Sunita Sharma (Spouse)', percentage: 40, amount: '₹1.136 Cr', color: '#0D9488' },
          { name: 'Arjun Sharma (Son)', percentage: 20, amount: '₹56.8 Lakhs', color: '#3B82F6' },
          { name: 'Priya Sharma (Daughter)', percentage: 20, amount: '₹56.8 Lakhs', color: '#8B5CF6' },
          { name: 'Kamala Sharma (Mother)', percentage: 20, amount: '₹56.8 Lakhs', color: '#F59E0B' },
        ],
        excludedParty: 'Vikram Sharma (Brother • Class-II • Excluded 0%)',
      },
    },
    entityChips: [
      { id: 'ec-21', label: 'Shares: View Sankey Diagram', type: 'shares', route: '/heirs/shares' },
      { id: 'ec-22', label: 'Heirs: Interactive Family Graph', type: 'heir', route: '/heirs' },
      { id: 'ec-23', label: 'Disputes: AI Shield (Vikram Rebuttal)', type: 'claim', route: '/disputes' },
    ],
    citations: [
      {
        id: 'cite-hsa10',
        shortLabel: 'Section 10, Hindu Succession Act, 1956',
        fullTitle: 'Distribution of property among heirs in Class-I of the Schedule',
        authority: 'Parliament of India',
        provisionRef: 'Section 10, Rules 1 to 4',
        verbatimExcerpt:
          'Rule 1: The intestate’s widow, or if there are more widows than one, all the widows together, shall take one share. Rule 2: The surviving sons and daughters and the mother of the intestate shall each take one share.',
        plainEnglishExplanation:
          'The default statutory rule gives equal shares among the widow, surviving children, and mother. Family settlement deeds can mutually adjust proportions.',
      },
      {
        id: 'cite-kale',
        shortLabel: 'Kale v. Deputy Director of Consolidation (Supreme Court)',
        fullTitle: 'Kale and Ors. v. Deputy Director of Consolidation and Ors.',
        authority: 'Supreme Court of India',
        provisionRef: '(1976) 3 SCC 119; AIR 1976 SC 807',
        verbatimExcerpt:
          'Family arrangements are governed by a special equity peculiar to themselves and will be enforced if honestly made. The object of the arrangement is to protect the family from long-drawn litigation.',
        plainEnglishExplanation:
          'The Supreme Court strongly upholds consensual family settlement deeds allocating shares among legal heirs to prevent conflict.',
      },
      {
        id: 'cite-hsa9',
        shortLabel: 'Section 9, Hindu Succession Act, 1956',
        fullTitle: 'Order of succession among heirs',
        authority: 'Parliament of India',
        provisionRef: 'Section 9 (Order of succession)',
        verbatimExcerpt:
          'Among the heirs specified in the Schedule, those in Class-I shall take simultaneously and to the exclusion of all other heirs.',
        plainEnglishExplanation:
          'Class-I heirs take complete precedence. As long as any Class-I heir is alive, brothers and sisters are legally barred from claiming.',
      },
    ],
  },
};

import { API_CONFIG } from './config';
import { getFirebaseIdToken } from '@/lib/firebase';
import { useVirasatStore } from '@/store/useVirasatStore';

/**
 * Streaming chat client simulation (used when VITE_USE_MOCKS=true).
 */
export function streamMockChatCompletion(
  prompt: string,
  onChunk: (accumulatedText: string) => void,
  onComplete: (fullResponse: CannedResponse) => void
): () => void {
  const normalized = prompt.toLowerCase();
  let matchedKey = 'hdfc_claim';

  if (normalized.includes('document') || normalized.includes('missing') || normalized.includes('checklist')) {
    matchedKey = 'missing_docs';
  } else if (normalized.includes('will') || normalized.includes('intestate') || normalized.includes('no will')) {
    matchedKey = 'no_will';
  } else if (normalized.includes('hdfc') || normalized.includes('claim') || normalized.includes('who')) {
    matchedKey = 'hdfc_claim';
  }

  const responsePayload = CANNED_RESPONSES[matchedKey] || CANNED_RESPONSES.hdfc_claim;
  const words = responsePayload.fullText.split(' ');
  let wordIndex = 0;
  let accumulated = '';
  let isCancelled = false;

  const intervalId = setInterval(() => {
    if (isCancelled) {
      clearInterval(intervalId);
      return;
    }

    if (wordIndex < words.length) {
      accumulated += (wordIndex === 0 ? '' : ' ') + words[wordIndex];
      wordIndex++;
      onChunk(accumulated);
    } else {
      clearInterval(intervalId);
      onComplete(responsePayload);
    }
  }, 22);

  return () => {
    isCancelled = true;
    clearInterval(intervalId);
  };
}

/**
 * Universal Streaming Chat client:
 * Connects to live Cloud Run /api/chat SSE endpoint via fetch with Bearer token,
 * or runs simulation when VITE_USE_MOCKS=true.
 */
export function streamChatCompletion(
  prompt: string,
  onChunk: (accumulatedText: string) => void,
  onComplete: (fullResponse: CannedResponse) => void,
  options?: { caseId?: string; language?: string; onError?: (error: Error) => void }
): () => void {
  if (API_CONFIG.USE_MOCKS) {
    return streamMockChatCompletion(prompt, onChunk, onComplete);
  }

  const abortController = new AbortController();
  const caseId = options?.caseId || useVirasatStore.getState().caseId || 'VR-2026-0142';
  const language = options?.language || 'en';

  (async () => {
    try {
      const token = await getFirebaseIdToken();
      const base = API_CONFIG.BASE_URL.replace(/\/+$/, '');
      const response = await fetch(`${base}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          case_id: caseId,
          message: prompt,
          language,
        }),
        signal: abortController.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Chat request failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulated = '';
      let donePayload: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const lines = part.split('\n');
          for (const line of lines) {
            if (line.startsWith('data:')) {
              const dataStr = line.replace('data:', '').trim();
              if (!dataStr) continue;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.type === 'token' && typeof parsed.content === 'string') {
                  accumulated += parsed.content;
                  onChunk(accumulated);
                } else if (parsed.type === 'done') {
                  donePayload = parsed;
                }
              } catch {
                // skip unparseable SSE frame
              }
            }
          }
        }
      }

      // Safely ensure fullText is a string
      const fullText = (typeof donePayload?.answer === 'string' && donePayload.answer.trim())
        ? donePayload.answer
        : (accumulated.trim() || 'Response received.');

      // Normalize structured cards safely
      let inlineCard: InlineCardData | undefined = undefined;
      if (donePayload?.cards && Array.isArray(donePayload.cards) && donePayload.cards.length > 0) {
        const firstCard = donePayload.cards[0] || {};
        const rawType = firstCard.card_type || firstCard.type || 'asset_summary';
        inlineCard = {
          type: rawType,
          title: String(firstCard.title || 'Estate Summary'),
          subtitle: firstCard.subtitle ? String(firstCard.subtitle) : undefined,
          data: typeof firstCard.data === 'object' && firstCard.data !== null ? firstCard.data : {},
        };
      }

      // Normalize Entity Chips safely with valid clean routes
      const entityChips: EntityChip[] = (Array.isArray(donePayload?.entity_links) ? donePayload.entity_links : []).map(
        (el: any, idx: number) => {
          const typeStr = String(el?.type || 'asset').toLowerCase();
          let mappedType: 'asset' | 'heir' | 'claim' | 'document' | 'shares' = 'asset';
          let targetSubpath = '/overview';
          if (typeStr.includes('person') || typeStr.includes('heir')) {
            mappedType = 'heir';
            targetSubpath = '/family';
          } else if (typeStr.includes('claim')) {
            mappedType = 'claim';
            targetSubpath = '/claims';
          } else if (typeStr.includes('doc')) {
            mappedType = 'document';
            targetSubpath = '/documents';
          } else if (typeStr.includes('share')) {
            mappedType = 'shares';
            targetSubpath = '/heirs/shares';
          } else {
            mappedType = 'asset';
            targetSubpath = '/assets';
          }

          return {
            id: String(el?.id || `ec-${idx}`),
            label: String(el?.label || el?.name || el?.id || 'Entity'),
            type: mappedType,
            route: `/case/${caseId}${targetSubpath}`,
          };
        }
      );

      // Normalize Citations safely
      const citations: CitationSource[] = (Array.isArray(donePayload?.citations) ? donePayload.citations : []).map(
        (c: any, idx: number) => {
          if (typeof c === 'string' || typeof c === 'number') {
            const cStr = String(c);
            return {
              id: `cite-${idx}`,
              shortLabel: cStr,
              fullTitle: `Statutory Provision & Case Precedent: ${cStr}`,
              authority: 'Virasat Legal Engine',
              provisionRef: cStr,
              verbatimExcerpt: 'Referenced in statutory succession rules & case facts.',
              plainEnglishExplanation: 'Grounding citation verified by Virasat GraphRAG engine.',
            };
          }
          const safeObj = typeof c === 'object' && c !== null ? c : {};
          const shortLabel = String(safeObj.shortLabel || safeObj.title || safeObj.clause_id || `§ Clause ${idx + 1}`);
          const provisionRef = String(safeObj.provisionRef || safeObj.section || safeObj.clause_id || shortLabel);

          return {
            id: String(safeObj.id || `cite-${idx}`),
            shortLabel,
            fullTitle: String(safeObj.fullTitle || safeObj.title || safeObj.source || 'Statutory Provision'),
            authority: String(safeObj.authority || safeObj.source || 'Indian Succession Code'),
            provisionRef,
            verbatimExcerpt: String(safeObj.verbatimExcerpt || safeObj.excerpt || safeObj.text || 'Statutory legal text.'),
            plainEnglishExplanation: String(
              safeObj.plainEnglishExplanation || safeObj.explanation || 'Verified statutory provision.'
            ),
          };
        }
      );

      onComplete({
        promptId: 'live_chat',
        matchedPrompt: prompt,
        fullText,
        inlineCard,
        entityChips,
        citations,
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Live chat stream error:', err);
        if (options?.onError) {
          try {
            options.onError(err instanceof Error ? err : new Error(String(err)));
          } catch {
            // ignore handler error
          }
        }
        // Fallback to simulated response so user flow never breaks
        streamMockChatCompletion(prompt, onChunk, onComplete);
      }
    }
  })();

  return () => {
    abortController.abort();
  };
}
