import os
from pathlib import Path
from dotenv import load_dotenv

from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

# Load environment variables
load_dotenv()

FAISS_INDEX_DIR = Path(__file__).parent.parent / "knowledge_base" / "faiss_index"

def get_embeddings():
    print("Using local HuggingFace Embeddings (all-MiniLM-L6-v2)")
    return HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

def retrieve_documents(query: str, k: int = 3) -> str:
    """
    Retrieves the most semantically similar documents from the FAISS vector database
    for a given query and returns them combined as a single string.
    """
    if not FAISS_INDEX_DIR.exists():
        return "No domain context available (FAISS index not found). Please run ingest.py first."
        
    embeddings = get_embeddings()
    # allow_dangerous_deserialization is needed for loading local FAISS directories starting with LangChain 0.0.18+
    vector_store = FAISS.load_local(
        str(FAISS_INDEX_DIR), 
        embeddings, 
        allow_dangerous_deserialization=True
    )
    
    retriever = vector_store.as_retriever(search_kwargs={"k": k})
    docs = retriever.invoke(query)
    
    # Combine the contents of the returned Document objects
    if not docs:
        return "No relevant context found."
        
    context_str = "\n\n---\n\n".join(
        [f"Source Chunk {i+1}:\n{doc.page_content}" for i, doc in enumerate(docs)]
    )
    return context_str

if __name__ == "__main__":
    # Test execution
    print(retrieve_documents("What are the recommended treatments for acute headache?"))
