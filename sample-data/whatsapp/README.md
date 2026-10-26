# DealShield AI — Multi-Language Commercial Negotiation Datasets

This directory contains 10 simulated WhatsApp commercial negotiation transcripts in 10 different Indian and international languages. Each dataset is structured to test **Google Gemini 3.8 Flash** (`gemini-3.8-flash`) extraction, Section 7 conflict detection, and missing statutory safeguards.

---

## 📋 Dataset Catalog & Legal Gap Matrix

| # | File Name | Language | Industry / Scope | Parties & Consideration | Section 7 Ambiguity / Conflict | Missing Statutory Safeguard to Flag |
|---|---|---|---|---|---|---|
| **01** | `sample-negotiation-01.txt` | English | Website Redesign | Raj Mehta & Priya Sharma (₹1,00,000) | `"Sure, that works I think. Let's go ahead"` | Missing IP Assignment (Copyright Act §17/19) & Termination Notice (§73 ICA) |
| **02** | `sample-negotiation-02.txt` | English | Social Media Campaign | Amit Patel & Neha Gupta (₹2,40,000) | Price conflict: Ad spend disputed (`"Wait, I thought that was included"`) | Missing Ad Spend Scope & Cancellation terms |
| **03** | `sample-negotiation-03-hindi.txt` | **Hindi / Hinglish** | Mobile Grocery App Dev | Rahul Verma & Vikram Singh (₹1,50,000) | `"Theek hai chalega I think, bas timeline tight mat rakhna"` | **Missing IP Assignment:** Developer does not transfer source code copyright upon final payment. |
| **04** | `sample-negotiation-04-spanish.txt` | **Spanish (Español)** | E-Commerce Brand Redesign | Carlos Gomez & Sofia Fernandez (₹1,20,000) | `"Me parece bien creo, pero depende de la fecha de entrega"` | **Missing Termination Clause:** No cancellation notice or compensation for partial work delivered. |
| **05** | `sample-negotiation-05-tamil.txt` | **Tamil / Tanglish** | SaaS CRM Dashboard UI | Karthik Raman & Ananya Swaminathan (₹90,000) | `"Sure Ananya, that works I think, but 4 weeks kulla complete deliver pannanum"` | **No Revision Limit:** Scope creep risk without defined change-request parameters; missing IP vesting. |
| **06** | `sample-telugu.txt` -> `06-telugu.txt` | **Telugu** | Corporate Video Campaign | Suresh Reddy & Manoj Krishna (₹80,000) | `"Okay Manoj garu, sounds good I think, timeline meedha depend avthundi"` | **Raw Asset Ownership:** No clause specifying ownership of raw video footage and project project files. |
| **07** | `sample-negotiation-07-french.txt` | **French (Français)** | Cloud Security Audit | Antoine Laurent & Camille Dubois (₹2,00,000) | `"D'accord ça marche je pense, si possible de finaliser avant la fin du mois"` | **Missing Confidentiality / NDA:** Sensitive infrastructure vulnerability data shared without an explicit NDA clause. |
| **08** | `sample-negotiation-08-german.txt` | **German (Deutsch)** | Industrial IoT Dashboard | Lukas Weber & Maximilian Becker (₹2,50,000) | `"Das klingt gut denke ich, aber wir müssen bis Ende Juni fertig sein"` | **Missing Acceptance Testing Window:** No timeframe defined for client sign-off, creating payment delay risk. |
| **09** | `sample-negotiation-09-marathi.txt` | **Marathi** | SEO & Digital Marketing | Nilesh Kulkarni & Pooja Joshi (₹60,000) | Budget disagreement: `"Wait, mala vatla sponsored ad spend pan ya ₹60,000 madhech include ahe"` | **Third-Party Discretion:** Unclear ad-budget disbursement responsibility & missing 7-day termination notice. |
| **10** | `sample-negotiation-10-bengali.txt` | **Bengali** | EdTech Content Writing | Subhashish Roy & Debolina Sen (₹45,000) | `"Achha Debolina, that works I think, kintu amader 3 weeks er moddhe shob content delivery chai"` | **Moral Rights Waiver:** Missing statutory assignment of literary copyright under Section 19 of Copyright Act. |
| **11** | `sample-negotiation-11-kannada.txt` | **Kannada / Kanglish** | Backend Microservices API | Chethan Gowda & Harish Rao (₹1,75,000) | `"Done Harish, maybe we can proceed, but timeline strict agi 6 weeks olage mudibeku"` | **Source Code Custody:** Absence of code handover repository access terms & post-launch warranty. |
| **12** | `sample-negotiation-12-gujarati.txt` | **Gujarati** | Textile B2B Portal Web Dev | Bhavin Patel & Chirag Shah (₹1,10,000) | `"Saras Chirag, that works I think, pan aavta mahina ni 15 tarikh sudhi project live thavu joiye"` | **Delayed Payment Remedy:** Missing interest penalty / due date for final 50% milestone upon go-live. |

---

## 🛠️ Testing Instructions

1. Open the DealShield web app at `http://localhost:3000/upload`.
2. Upload any `.txt` file from this folder.
3. The platform parses the messages with deterministic IDs (`msg_rahul_001`, `msg_vikram_002`, etc.) and automatically detects the Indian date format standard `DD/MM/YYYY`.
4. Trigger AI Analysis to verify:
   * **Gemini 3.8 Flash** accurately extracts terms regardless of language.
   * Section 7 conflict detector flags equivocal hedges and disputes.
   * Legal retriever flags missing statutory protections.
