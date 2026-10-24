import { AgreementAnalysis, Message } from "@/types";

export const SAMPLE_MESSAGES: Message[] = [
  {
    message_id: "msg_raj_001",
    sender: "Raj Mehta",
    content: "Hi Priya, regarding the website project we discussed",
    timestamp: "2024-03-12T10:15:00Z",
    sequence_number: 1,
    raw_line: "12/03/24, 10:15 - Raj Mehta: Hi Priya, regarding the website project we discussed",
  },
  {
    message_id: "msg_priya_002",
    sender: "Priya Sharma",
    content: "Yes, I've been thinking about it. I can handle the full redesign",
    timestamp: "2024-03-12T10:16:00Z",
    sequence_number: 2,
    raw_line: "12/03/24, 10:16 - Priya Sharma: Yes, I've been thinking about it. I can handle the full redesign",
  },
  {
    message_id: "msg_raj_003",
    sender: "Raj Mehta",
    content: "Great. My budget is around ₹75,000 for everything",
    timestamp: "2024-03-12T10:18:00Z",
    sequence_number: 3,
    raw_line: "12/03/24, 10:18 - Raj Mehta: Great. My budget is around ₹75,000 for everything",
  },
  {
    message_id: "msg_priya_004",
    sender: "Priya Sharma",
    content: "That's quite low for a full redesign. I'd normally charge ₹1,50,000",
    timestamp: "2024-03-12T10:20:00Z",
    sequence_number: 4,
    raw_line: "12/03/24, 10:20 - Priya Sharma: That's quite low for a full redesign. I'd normally charge ₹1,50,000",
  },
  {
    message_id: "msg_raj_005",
    sender: "Raj Mehta",
    content: "Can we meet somewhere in the middle? Maybe ₹1,00,000?",
    timestamp: "2024-03-12T10:22:00Z",
    sequence_number: 5,
    raw_line: "12/03/24, 10:22 - Raj Mehta: Can we meet somewhere in the middle? Maybe ₹1,00,000?",
  },
  {
    message_id: "msg_priya_006",
    sender: "Priya Sharma",
    content: "I could consider that, but it depends on the timeline",
    timestamp: "2024-03-12T10:25:00Z",
    sequence_number: 6,
    raw_line: "12/03/24, 10:25 - Priya Sharma: I could consider that, but it depends on the timeline",
  },
  {
    message_id: "msg_raj_007",
    sender: "Raj Mehta",
    content: "I need it done by end of April",
    timestamp: "2024-03-12T10:27:00Z",
    sequence_number: 7,
    raw_line: "12/03/24, 10:27 - Raj Mehta: I need it done by end of April",
  },
  {
    message_id: "msg_priya_008",
    sender: "Priya Sharma",
    content: "That's tight. For ₹1,00,000 I might be able to do it, but I'd need 50% upfront",
    timestamp: "2024-03-12T10:30:00Z",
    sequence_number: 8,
    raw_line: "12/03/24, 10:30 - Priya Sharma: That's tight. For ₹1,00,000 I might be able to do it, but I'd need 50% upfront",
  },
  {
    message_id: "msg_raj_009",
    sender: "Raj Mehta",
    content: "Sure, that works I think. Let's go ahead",
    timestamp: "2024-03-12T10:32:00Z",
    sequence_number: 9,
    raw_line: "12/03/24, 10:32 - Raj Mehta: Sure, that works I think. Let's go ahead",
  },
  {
    message_id: "msg_priya_010",
    sender: "Priya Sharma",
    content: "Ok sounds good. I'll send over some initial mockups next week",
    timestamp: "2024-03-12T10:35:00Z",
    sequence_number: 10,
    raw_line: "12/03/24, 10:35 - Priya Sharma: Ok sounds good. I'll send over some initial mockups next week",
  },
];

export const SAMPLE_ANALYSIS: AgreementAnalysis = {
  analysis_id: "analysis_expected_01",
  chat_id: "chat_sample_negotiation_01",
  parties: [
    {
      party_id: "party_raj_01",
      name: "Raj Mehta",
      detected_role: "Client",
      contact_handle: "Raj Mehta",
    },
    {
      party_id: "party_priya_02",
      name: "Priya Sharma",
      detected_role: "Service Provider",
      contact_handle: "Priya Sharma",
    },
  ],
  extracted_terms: [
    {
      term_id: "term_scope_01",
      category: "scope",
      description: "Full website redesign with preliminary mockups and responsive frontend layout",
      proposed_value: "Full redesign",
      accepted_value: "Full website redesign with mockups",
      status: "agreed",
      source_message_ids: ["msg_raj_001", "msg_priya_002", "msg_priya_010"],
      confidence: "high",
    },
    {
      term_id: "term_price_01",
      category: "pricing",
      description: "Total project fee negotiated from ₹75,000 and ₹1,50,000 to ₹1,00,000",
      proposed_value: "₹75,000 (Raj) / ₹1,50,000 (Priya)",
      accepted_value: "₹1,00,000 (qualified acceptance)",
      status: "ambiguous",
      source_message_ids: [
        "msg_raj_003",
        "msg_priya_004",
        "msg_raj_005",
        "msg_priya_008",
        "msg_raj_009",
      ],
      confidence: "medium",
    },
    {
      term_id: "term_payment_01",
      category: "payment_terms",
      description: "Milestone schedule requiring 50% advance prior to commencement",
      proposed_value: "50% upfront",
      accepted_value: "50% upfront (₹50,000) upon signing, 50% upon delivery",
      status: "agreed",
      source_message_ids: ["msg_priya_008", "msg_raj_009"],
      confidence: "high",
    },
    {
      term_id: "term_timeline_01",
      category: "timeline",
      description: "Target completion milestone for deliverables",
      proposed_value: "End of April 2024",
      accepted_value: "April 30, 2024",
      status: "agreed",
      source_message_ids: ["msg_raj_007", "msg_priya_008"],
      confidence: "medium",
    },
  ],
  conflicts: [
    {
      conflict_id: "conflict_price_01",
      term_category: "pricing",
      description:
        "Price disagreement settled at ₹1,00,000, but Raj's acceptance was qualified ('that works I think')",
      party_positions: {
        "Raj Mehta":
          "Offered ₹75,000, then countered with ₹1,00,000 saying 'Sure, that works I think. Let's go ahead'",
        "Priya Sharma":
          "Demanded ₹1,50,000, accepted ₹1,00,000 strictly subject to 50% upfront deposit",
      },
      source_message_ids: [
        "msg_raj_003",
        "msg_priya_004",
        "msg_raj_005",
        "msg_priya_008",
        "msg_raj_009",
      ],
      severity: "high",
      resolution_suggestion:
        "Formally confirm unconditional consideration at ₹1,00,000 (INR) payable as ₹50,000 upon contract execution and ₹50,000 upon final handover.",
      statutory_context:
        "Indian Contract Act, 1872 Section 7: 'In order to convert a proposal into a promise the acceptance must be absolute and unqualified.' The qualifier 'I think' introduces legal ambiguity regarding absolute assent.",
    },
  ],
  missing_terms: [
    {
      term_id: "missing_ip_01",
      category: "intellectual_property",
      description: "No assignment of IP rights on source code, design assets, and Figma files",
      importance: "critical",
      recommendation:
        "Assign intellectual property rights to the Client upon 100% receipt of agreed consideration.",
    },
    {
      term_id: "missing_termination_01",
      category: "termination",
      description: "No cancellation policy or compensation structure for work-in-progress",
      importance: "important",
      recommendation:
        "Add standard 7-day written termination clause with pro-rata compensation for verified deliverables.",
    },
  ],
  confidence_score: 0.85,
  requires_human_review: true,
  analyzed_at: "2024-03-12T11:00:00Z",
};
