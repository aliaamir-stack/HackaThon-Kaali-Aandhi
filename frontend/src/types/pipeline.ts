// ============================================
// Specialist Agent + RAG — Type Definitions
// Person D's pipeline segment
// ============================================

/** Input the specialist node receives from the pipeline state */
export interface SpecialistInput {
  symptoms: string[];
  severity: "Low" | "Medium" | "High" | "Critical";
  missing_info: string[];
}

/** A single RAG-retrieved document chunk */
export interface RetrievedChunk {
  index: number;
  content: string;
}

/** Output from the RAG retriever tool */
export interface RAGResult {
  query: string;
  chunks: RetrievedChunk[];
  raw_context: string;
}

/** Full output returned by the specialist agent node */
export interface SpecialistOutput {
  /** Signals that the specialist node has started */
  started: boolean;

  /** Signals that the specialist node has finished */
  completed: boolean;

  /** RAG-retrieved medical context used for the assessment */
  context: string;

  /** The specialist's full clinical assessment (Markdown) */
  specialist_assessment: string;

  /** Error message if the specialist node failed */
  error?: string;
}
