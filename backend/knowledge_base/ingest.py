import os
from pathlib import Path
from dotenv import load_dotenv

from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

# Load environment variables (e.g., OPENROUTER_API_KEY)
load_dotenv()

DATA_DIR = Path(__file__).parent.parent.parent / "data"
FAISS_INDEX_DIR = Path(__file__).parent / "faiss_index"

def get_embeddings():
    print("Using local HuggingFace Embeddings (free, offline)")
    # Using a fast, standard local embedding model
    return HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

def ingest_pdfs():
    """
    Reads PDFs from the data/ directory, chunks them, and stores embeddings in a local FAISS index.
    """
    print(f"Loading PDFs from: {DATA_DIR}")
    
    # Create data dir if it doesn't exist
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    loader = PyPDFDirectoryLoader(str(DATA_DIR))
    documents = loader.load()
    
    if not documents:
        print(f"No PDFs found in {DATA_DIR}. Please add some PDFs to ingest.")
        return

    print(f"Loaded {len(documents)} document pages.")

    # Split documents into chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100,
        add_start_index=True,
    )
    chunks = text_splitter.split_documents(documents)
    print(f"Split into {len(chunks)} chunks.")

    embeddings = get_embeddings()

    # Create and save the FAISS index
    print("Generating embeddings and building FAISS index...")
    vector_store = FAISS.from_documents(chunks, embeddings)
    
    FAISS_INDEX_DIR.mkdir(parents=True, exist_ok=True)
    vector_store.save_local(str(FAISS_INDEX_DIR))
    print(f"Successfully saved FAISS index to {FAISS_INDEX_DIR}")

if __name__ == "__main__":
    ingest_pdfs()
