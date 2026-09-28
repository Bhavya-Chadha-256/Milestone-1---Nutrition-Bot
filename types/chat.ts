// types/chat.ts

export type Claim = {
  claim_text: string;
  source: null;
};

export type ChatResponse = {
  answer: string;
  claims: Claim[];
};

export type ApiResponse = {
  session_id: string;
} & ChatResponse;

// Used by frontend UI
export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  claims?: Claim[];
};
