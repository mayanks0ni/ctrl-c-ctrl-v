import { Pinecone } from '@pinecone-database/pinecone';

if (!process.env.PINECONE_API_KEY) {
    console.warn('PINECONE_API_KEY is not defined in the environment variables.');
}

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || '',
});

export const getPineconeIndex = () => {
    return pinecone.index(process.env.PINECONE_INDEX_NAME || '');
}

export default pinecone;
