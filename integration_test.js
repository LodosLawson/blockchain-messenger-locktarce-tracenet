import axios from 'axios';

const API_URL = 'http://localhost:3000/api';
let userAToken, userBToken;
let userAPublicKey, userBPublicKey;

async function runTests() {
    console.log('🚀 Starting Integration Tests...');

    try {
        // 1. Register User A
        console.log('\n1. Registering User A...');
        const userA = {
            username: `userA_${Date.now()}`,
            password: 'password123'
        };
        const regA = await axios.post(`${API_URL}/auth/register`, userA);
        userAToken = regA.data.token;
        userAPublicKey = regA.data.user.publicKey;
        console.log('✅ User A Registered:', userA.username);
        console.log('   Balance:', regA.data.initialBonus);

        // 2. Register User B
        console.log('\n2. Registering User B...');
        const userB = {
            username: `userB_${Date.now()}`,
            password: 'password123'
        };
        const regB = await axios.post(`${API_URL}/auth/register`, userB);
        userBToken = regB.data.token;
        userBPublicKey = regB.data.user.publicKey;
        console.log('✅ User B Registered:', userB.username);

        // 3. Check Balance User A
        console.log('\n3. Checking User A Balance...');
        const balA = await axios.get(`${API_URL}/wallet/balance`, {
            headers: { Authorization: `Bearer ${userAToken}` }
        });
        console.log('✅ User A Balance:', balA.data.balance);
        if (balA.data.balance !== 3) throw new Error('Incorrect initial balance for User A');

        // 4. Send Transaction A -> B
        console.log('\n4. Sending 1 coin from A to B...');
        const tx = await axios.post(`${API_URL}/wallet/send`, {
            recipientPublicKey: userBPublicKey,
            amount: 1
        }, {
            headers: { Authorization: `Bearer ${userAToken}` }
        });
        console.log('✅ Transaction Sent:', tx.data.message);

        // 4.5 Mine the block
        console.log('\n4.5 Mining block...');
        await axios.post(`${API_URL}/blockchain/mine`);
        console.log('✅ Block Mined');

        // 5. Verify Balances
        console.log('\n5. Verifying Balances...');
        const newBalA = await axios.get(`${API_URL}/wallet/balance`, {
            headers: { Authorization: `Bearer ${userAToken}` }
        });
        const newBalB = await axios.get(`${API_URL}/wallet/balance`, {
            headers: { Authorization: `Bearer ${userBToken}` }
        });

        console.log('   User A New Balance:', newBalA.data.balance);
        console.log('   User B New Balance:', newBalB.data.balance);

        if (newBalA.data.balance !== 2) throw new Error('Incorrect final balance for User A');
        if (newBalB.data.balance !== 4) throw new Error('Incorrect final balance for User B');

        console.log('\n✅ ALL INTEGRATION TESTS PASSED!');
    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

runTests();
