import crypto from 'crypto';

function generateUniqueHash() {
    const input = crypto.randomBytes(32); // Use sufficient length for your needs
    const hash = crypto.createHash('sha256').update(input).digest('hex');
    return hash;
}

export default generateUniqueHash;